import {
  Body,
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { RaffleService } from 'src/modules/raffle/services/raffle.service';
import { TicketService } from 'src/modules/raffle/services/ticket.service';
import { GoldskyGuard } from 'src/shared/guards/goldsky.guard';
import { BigIntInterceptor } from 'src/shared/interceptors/bigInt.interceptor';
import { PrizeService } from 'src/modules/raffle/services/prize.service';

@Controller('raffle/webhook')
export class WebhookController {
  constructor(
    private readonly raffleService: RaffleService,
    private readonly ticketService: TicketService,
    private readonly prizeService: PrizeService,
  ) {}

  @Post('goldsky')
  @UseGuards(GoldskyGuard)
  async goldsky(@Body() body: any) {
    const data = body.data.new;
    switch (body.entity) {
      case 'raffle_created':
        this.raffleService
          .buyDefaultTickets({
            price: data.ticket_price,
            address: data.raffle_address,
            token_address: data.token_address,
          })
          .catch(console.log);
        break;
      case 'tickets_bought':
        await this.ticketService.saveTicketPurchase({
          address: data.raffle_address,
          count: data.number_of_tickets,
          amount: data.total_cost,
          buyer: data.buyer,
          block_number: data.block_number,
          hash: data.transaction_hash,
        });
      case 'winner_selection_initiated':
        await this.raffleService.drawWinners({
          address: data.raffle_address,
          totalTickets: data.total_tickets,
        });
        break;
      case 'winners_drawn':
        await this.prizeService.saveWinnersAndPrize({
          address: data.raffle_address,
          winners: data.winners,
          prizes: data.prizes,
        });
        break;
    }
  }
}
