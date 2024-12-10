import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ethers } from 'ethers';
import { Raffle } from '../entities/raffle.entity';
import { RAFFLE_CONFIG } from '../raffle.constant';
import { RaffleFactoryContract } from '../contracts/factory.contract';
import { RaffleType } from 'src/modules/raffle/interfaces/raffle-type.enum';
import { RaffleStatus } from 'src/modules/raffle/interfaces/raffle-status.enum';
import { env } from 'process';

@Injectable()
export class RaffleService {
  private readonly logger = new Logger(RaffleService.name);

  constructor(
    @InjectRepository(Raffle)
    private raffleRepo: Repository<Raffle>,
    @InjectQueue('raffle') private raffleQueue: Queue,
    private factory: RaffleFactoryContract,
  ) {}

  async createRaffle(type: RaffleType): Promise<Raffle> {
    try {
      const activeRaffle = await this.raffleRepo.findOne({
        where: { type, status: RaffleStatus.ACTIVE },
      });

      const config = RAFFLE_CONFIG[type];
      const startTime = activeRaffle
        ? new Date(activeRaffle.endTime.getTime())
        : new Date();
      const endTime = new Date(startTime.getTime() + config.duration * 1000);

      const contractAddress = await this.factory.deployRaffle(
        env.TOKEN_ADDRESS,
        config.ticketPrice,
        config.duration,
        config.prizePool,
      );
      if (activeRaffle) await this.factory.pauseRaffle(contractAddress);

      const raffle = this.raffleRepo.create();
      raffle.type = type;
      raffle.contractAddress = contractAddress;
      raffle.startTime = startTime;
      raffle.endTime = endTime;
      raffle.ticketPrice = config.ticketPrice;
      raffle.guaranteedPrizePool = config.prizePool;
      raffle.status = activeRaffle ? RaffleStatus.PENDING : RaffleStatus.ACTIVE;
      await this.raffleRepo.save(raffle);

      if (!activeRaffle) return raffle;

      await this.raffleRepo.update(activeRaffle.id, {
        nextRaffleId: raffle.id,
      });

      const activationDelay =
        activeRaffle.endTime.getTime() - Date.now() - 30 * 60 * 1000;
      await this.scheduleActivation(raffle.id, activationDelay);

      return raffle;
    } catch (error) {
      this.logger.error(`Failed to create ${type} raffle:`, error);
      throw error;
    }
  }

  private async scheduleActivation(raffleId: number, delay: number) {
    await this.raffleQueue.add(
      'activate-raffle',
      { raffleId },
      {
        delay,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60000,
        },
      },
    );
  }

  async activateRaffle(raffleId: number) {
    try {
      const raffle = await this.raffleRepo.findOneOrFail({
        where: { id: raffleId },
      });

      await this.factory.activateRaffle(raffle.contractAddress);
      await this.raffleRepo.update(raffleId, { status: RaffleStatus.ACTIVE });

      this.logger.log(`Activated raffle ${raffleId}`);
    } catch (error) {
      this.logger.error(`Failed to activate raffle ${raffleId}:`, error);
      throw error;
    }
  }

  async endRaffle(raffleId: number) {
    try {
      const raffle = await this.raffleRepo.findOneOrFail({
        where: { id: raffleId },
      });

      await this.factory.endRaffle(raffle.contractAddress);
      await this.raffleRepo.update(raffleId, {
        status: RaffleStatus.ENDED,
      });

      if (!raffle.nextRaffleId) {
        await this.createRaffle(raffle.type);
      }

      this.logger.log(`Ended raffle ${raffleId}`);
    } catch (error) {
      this.logger.error(`Failed to end raffle ${raffleId}:`, error);
      throw error;
    }
  }

  async drawWinners(raffleId: number) {
    try {
      const raffle = await this.raffleRepo.findOneOrFail({
        where: { id: raffleId },
      });

      const secret = ethers.randomBytes(32);
      const commitHash = ethers.keccak256(secret);

      await this.factory.submitCommitment(raffle.contractAddress, commitHash);

      // Wait for minimum commitment age
      await new Promise((r) => setTimeout(r, 65 * 60 * 1000));

      await this.factory.revealAndDraw(raffle.contractAddress, secret);
      await this.raffleRepo.update(raffleId, { isDrawComplete: true });

      this.logger.log(`Drew winners for raffle ${raffleId}`);
    } catch (error) {
      this.logger.error(
        `Failed to draw winners for raffle ${raffleId}:`,
        error,
      );
      throw error;
    }
  }

  async getWinners(raffleId: number) {
    try {
      const raffle = await this.raffleRepo.findOneOrFail({
        where: { id: raffleId },
      });
      return this.factory.getWinners(raffle.contractAddress);
    } catch (error) {
      this.logger.error(`Failed to get winners for raffle ${raffleId}:`, error);
      throw error;
    }
  }

  // Add to raffle.service.ts

  async getActiveRaffles() {
    try {
      const raffles = await this.raffleRepo.find({
        where: [
          { status: RaffleStatus.ACTIVE },
          { status: RaffleStatus.PENDING },
        ],
        order: {
          startTime: 'ASC',
        },
      });

      return raffles.map((raffle) => this.formatRaffleResponse(raffle));
    } catch (error) {
      this.logger.error('Failed to get active raffles:', error);
      throw error;
    }
  }

  async getRaffleInfo(id: number) {
    try {
      const raffle = await this.raffleRepo.findOneOrFail({
        where: { id },
      });

      const [onChainInfo, winners] = await Promise.all([
        this.factory.getRaffleInfo(raffle.contractAddress),
        raffle.isDrawComplete
          ? this.factory.getWinners(raffle.contractAddress)
          : null,
      ]);

      return {
        ...this.formatRaffleResponse(raffle),
        status: onChainInfo?.status,
        currentPrize: onChainInfo.currentPrize,
        timeRemaining: Number(onChainInfo.timeRemaining),
        totalParticipants: Number(onChainInfo.totalParticipants),
        winners: winners
          ? {
              addresses: winners.winners,
              prizes: winners.prizes,
            }
          : null,
      };
    } catch (error) {
      this.logger.error(`Failed to get raffle info for ${id}:`, error);
      throw error;
    }
  }

  private formatRaffleResponse(raffle: Raffle) {
    return {
      id: raffle.id,
      type: raffle.type,
      contractAddress: raffle.contractAddress,
      status: raffle.status,
      timing: {
        startTime: raffle.startTime,
        endTime: raffle.endTime,
        activatedAt: raffle.activatedAt,
        drawAt: raffle.drawAt,
      },
      pricing: {
        ticketPrice: Number(raffle.ticketPrice),
        guaranteedPrizePool: Number(raffle.guaranteedPrizePool),
        currentPrizePool: Number(raffle.currentPrizePool),
      },
      stats: {
        totalParticipants: raffle.totalParticipants,
        totalTickets: raffle.totalTickets,
      },
      draw: {
        isComplete: raffle.isDrawComplete,
        winners: raffle.winners,
        runnersUp: raffle.runnersUp,
      },
    };
  }
}
