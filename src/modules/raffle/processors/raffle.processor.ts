// src/modules/raffle/processors/raffle.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { RaffleService } from 'src/modules/raffle/services/raffle.service';

@Processor('raffle')
export class RaffleProcessor {
  private readonly logger = new Logger(RaffleProcessor.name);

  constructor(private raffleService: RaffleService) {}

  @Process('end-raffle')
  async handleEndRaffle(job: Job<{ id: string }>) {
    this.logger.log(`Processing end for raffle ${job.data.id}`);
    await this.raffleService.startWinnerSelection(job.data.id);
  }
}
