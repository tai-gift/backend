import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Raffle } from '../entities/raffle.entity';
import { RaffleService } from './raffle.service';
import { RaffleType } from 'src/modules/raffle/interfaces/raffle-type.enum';
import { RaffleStatus } from 'src/modules/raffle/interfaces/raffle-status.enum';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectRepository(Raffle)
    private raffleRepo: Repository<Raffle>,
    private raffleService: RaffleService,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing raffle system...');
    const types = [
      RaffleType.DAILY,
      RaffleType.WEEKLY,
      RaffleType.MONTHLY,
    ] as const;

    for (const type of types) {
      const exists = await this.raffleRepo.existsBy([
        { type, status: RaffleStatus.ACTIVE },
        { type, status: RaffleStatus.PENDING },
      ]);

      if (exists) return;

      this.logger.log(`Creating initial ${type} raffle`);
      await this.raffleService.createRaffle(type);
    }
  }

  @Cron('0 */12 * * *')
  async checkDailyRaffle() {
    await this.checkAndCreateRaffle(RaffleType.DAILY);
  }

  @Cron('0 0 * * *')
  async checkWeeklyRaffle() {
    await this.checkAndCreateRaffle(RaffleType.WEEKLY);
  }

  @Cron('0 0 * * *')
  async checkMonthlyRaffle() {
    await this.checkAndCreateRaffle(RaffleType.MONTHLY);
  }

  private async checkAndCreateRaffle(type: RaffleType) {
    try {
      const pendingExists = await this.raffleRepo.existsBy({
        type,
        status: RaffleStatus.PENDING,
      });

      if (!pendingExists) {
        this.logger.log(`Creating new ${type} raffle`);
        await this.raffleService.createRaffle(type);
      }
    } catch (error) {
      this.logger.error(`Failed to check/create ${type} raffle:`, error);
    }
  }
}
