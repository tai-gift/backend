// src/modules/raffle/processors/raffle.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { RaffleService } from '../services/raffle.service';

@Processor('raffle')
export class RaffleProcessor {
  private readonly logger = new Logger(RaffleProcessor.name);

  constructor(private raffleService: RaffleService) {}

  @Process('activate-raffle')
  async handleActivateRaffle(job: Job<{ raffleId: number }>) {
    this.logger.log(`Processing activation for raffle ${job.data.raffleId}`);
    await this.raffleService.activateRaffle(job.data.raffleId);
  }

  @Process('end-raffle')
  async handleEndRaffle(job: Job<{ raffleId: number }>) {
    this.logger.log(`Processing end for raffle ${job.data.raffleId}`);
    await this.raffleService.endRaffle(job.data.raffleId);
  }

  @Process('draw-winners')
  async handleDrawWinners(job: Job<{ raffleId: number }>) {
    this.logger.log(`Processing winner draw for raffle ${job.data.raffleId}`);
    await this.raffleService.drawWinners(job.data.raffleId);
  }
}
