import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/modules/raffle/entities/user.entity';
import { Ticket } from 'src/modules/raffle/entities/ticket.entity';
import { Repository } from 'typeorm';
import { Raffle } from 'src/modules/raffle/entities/raffle.entity';
import { instanceToPlain } from 'class-transformer';

@Injectable()
export class TicketService {
  private readonly logger = new Logger(TicketService.name);
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Raffle)
    private readonly raffleRepository: Repository<Raffle>,
  ) {}

  async saveTicketPurchase(param: {
    amount: any;
    address: any;
    count: any;
    block_number: any;
    hash: any;
    buyer: any;
  }) {
    const raffle = await this.raffleRepository.findOneBy({
      address: param.address?.toLowerCase(),
    });
    if (!raffle) {
      this.logger.error(`Failed to save ticket purchase: raffle not found`);
      throw new NotFoundException(`Raffle not found`);
    }
    try {
      const user =
        (await this.userRepository.findOneBy({
          address: param.buyer?.toLowerCase(),
        })) ??
        (await this.userRepository.save({
          address: param.buyer?.toLowerCase(),
        }));

      const ticket = this.ticketRepository.create({
        amount: param.amount,
        count: param.count,
        block_number: param.block_number,
        hash: param.hash,
        buyer: user,
        raffle,
      });
      await this.ticketRepository.save(ticket, { reload: true });
      return instanceToPlain(ticket);
    } catch (error) {
      this.logger.error(`Failed to save ticket purchase:`, error);
      throw error;
    }
  }
}
