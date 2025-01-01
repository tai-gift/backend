import {
  Injectable,
  Logger,
  OnModuleInit,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Raffle } from '../entities/raffle.entity';
import { RAFFLE_CONFIG } from '../raffle.constant';
import { RaffleFactoryContract } from '../contracts/factory.contract';
import { RaffleType } from 'src/modules/raffle/interfaces/raffle-type.enum';
import { RaffleStatus } from 'src/modules/raffle/interfaces/raffle-status.enum';
import { RaffleWeb3Service } from 'src/modules/raffle/services/raffle-web3.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RaffleCreatedEvent } from 'src/modules/raffle/events/raffle-created.event';

@Injectable()
export class RaffleService implements OnModuleInit {
  private readonly logger = new Logger(RaffleService.name);

  constructor(
    @InjectRepository(Raffle)
    private raffleRepo: Repository<Raffle>,
    @InjectQueue('raffle') private raffleQueue: Queue,
    private web3Service: RaffleWeb3Service,
    private factory: RaffleFactoryContract,
    private emitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing raffle system...');

    for (const type of Object.keys(RAFFLE_CONFIG) as RaffleType[]) {
      const raffle = await this.raffleRepo.findOneBy([
        { type, status: RaffleStatus.ACTIVE },
        { type, status: RaffleStatus.PENDING },
      ]);

      if (raffle?.status === RaffleStatus.ACTIVE) continue;
      else if (
        raffle?.status === RaffleStatus.PENDING &&
        (await this.web3Service.unpauseRaffle(raffle.address))
      ) {
        raffle.status = RaffleStatus.ACTIVE;
        await this.raffleRepo.save(raffle);
      }

      this.logger.log(`Creating initial ${type} raffle`);
      await this.createNewRaffle(type);
    }
  }

  private async createNewRaffle(type: RaffleType) {
    const game = RAFFLE_CONFIG[type];
    const address = await this.web3Service.deployRaffle(
      game.price,
      game.duration,
      game.guaranteedPrize,
    );

    return this.raffleRepo.save({
      type,
      address: address?.toLowerCase(),
      startTime: new Date(),
      endTime: new Date(
        Number(await this.web3Service.raffleEndTime(address)) * 1000,
      ),
      ticketPrice: game.price,
      guaranteedPrizePool: game.guaranteedPrize,
      status: RaffleStatus.ACTIVE,
    });
  }

  async startWinnerSelection(raffleId: string) {
    try {
      await this.raffleRepo.manager.transaction(async (manager) => {
        const raffle = await manager.findOneOrFail<Raffle>(Raffle, {
          where: { id: raffleId, status: RaffleStatus.ACTIVE },
          lock: { mode: 'pessimistic_write' },
        });

        await this.createNewRaffle(raffle.type);

        const { randomValue, seed } =
          await this.web3Service.initiateWinnerSelection(raffle.address);

        raffle.status = RaffleStatus.DRAWING;
        raffle.randomValue = randomValue;
        raffle.seed = seed;
        await manager.save(raffle);
      });
    } catch (error) {
      this.logger.error(`Failed to end raffle ${raffleId}:`, error);
      throw error;
    }
  }

  async getWinners(raffleId: string) {
    try {
      const raffle = await this.raffleRepo.findOneOrFail({
        where: { id: raffleId },
      });
      return this.factory.getWinners(raffle.address);
    } catch (error) {
      this.logger.error(`Failed to get winners for raffle ${raffleId}:`, error);
      throw error;
    }
  }

  async getActiveRaffles() {
    try {
      const raffles = await this.raffleRepo.find({
        where: [
          { status: RaffleStatus.ACTIVE, endTime: MoreThan(new Date()) },
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

  async getRaffleInfo(id: string) {
    try {
      const raffle = await this.raffleRepo.findOneOrFail({
        where: { id },
      });

      return {
        ...this.formatRaffleResponse(raffle),
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
      address: raffle.address,
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

  async buyDefaultTickets(data: {
    address: string;
    price: string;
    token_address: string;
  }) {
    try {
      this.web3Service.buyDefaultTickets(data).catch((error) => {
        this.logger.error(
          `Failed to buy default ticket for ${data.address}:`,
          error,
        );
      });

      this.emitter.emit(
        RaffleCreatedEvent.name,
        new RaffleCreatedEvent({
          address: data.address,
          ticketPrice: data.price,
          tokenAddress: data.token_address,
        }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to buy default ticket for ${data.address}:`,
        error,
      );
      throw error;
    }
  }

  async drawWinners(param: { address: string; totalTickets: bigint }) {
    const raffle = await this.raffleRepo.findOneByOrFail({
      address: param.address,
    });

    await this.web3Service.raffleCompleteWinnerSelection(
      raffle.address,
      raffle.randomValue,
      raffle.seed,
      BigInt(raffle.totalTickets),
    );
  }
}
