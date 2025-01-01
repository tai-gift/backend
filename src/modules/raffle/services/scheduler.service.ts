import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Raffle } from '../entities/raffle.entity';
import { RaffleService } from 'src/modules/raffle/services/raffle.service';
import { RaffleStatus } from 'src/modules/raffle/interfaces/raffle-status.enum';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { RaffleCreatedEvent } from 'src/modules/raffle/events/raffle-created.event';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectRepository(Raffle)
    private raffleRepo: Repository<Raffle>,
    @InjectQueue('raffle') private raffleQueue: Queue,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing scheduler service...');
    const raffles = await this.raffleRepo.findBy({
      status: RaffleStatus.ACTIVE,
    });

    for (const raffle of raffles) {
      await this.scheduleRaffleEnd(raffle);
    }
  }

  @OnEvent(RaffleCreatedEvent.name)
  async handleRaffleCreated(event: RaffleCreatedEvent) {
    const raffle = await this.raffleRepo.findOneBy({
      address: event.raffle.address,
    });
    await this.scheduleRaffleEnd(raffle);
  }

  private async scheduleRaffleEnd(raffle: Raffle) {
    const endTime = raffle.endTime.getTime();
    const delay = Math.max(0, endTime - Date.now());

    this.logger.log(`Scheduling raffle ${raffle.id} to end in ${delay}ms`);
    await this.raffleQueue.add(
      'end-raffle',
      { id: raffle.id, address: raffle.address },
      {
        delay,
        removeOnComplete: true,
        backoff: {
          type: 'exponential',
          delay: 60000,
        },
      },
    );

    this.logger.log(`Scheduled end for raffle ${raffle.id} in ${delay}ms`);
  }
}
