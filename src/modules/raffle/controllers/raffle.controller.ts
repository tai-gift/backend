// src/modules/raffle/controllers/raffle.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { RaffleService } from '../services/raffle.service';

@Controller('raffles')
export class RaffleController {
  constructor(private raffleService: RaffleService) {}

  @Get(':id/winners')
  async getWinners(@Param('id') id: number) {
    return this.raffleService.getWinners(id);
  }

  @Get(':id')
  async getRaffle(@Param('id') id: number) {
    return this.raffleService.getRaffleInfo(id);
  }

  @Get()
  async getActiveRaffles() {
    return this.raffleService.getActiveRaffles();
  }
}
