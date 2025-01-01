import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { Raffle } from './entities/raffle.entity';
import { RaffleWeb3Service } from 'src/modules/raffle/services/raffle-web3.service';
import { SchedulerService } from './services/scheduler.service';
import { RaffleProcessor } from './processors/raffle.processor';
// import { RaffleController } from './controllers/raffle.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RaffleService } from 'src/modules/raffle/services/raffle.service';
import { WebhookController } from 'src/modules/raffle/controllers/webhook.controller';
import { TicketService } from 'src/modules/raffle/services/ticket.service';
import { Ticket } from 'src/modules/raffle/entities/ticket.entity';
import { User } from 'src/modules/raffle/entities/user.entity';
import { Prize } from 'src/modules/raffle/entities/prize.entity';
import { PrizeService } from 'src/modules/raffle/services/prize.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Raffle, Ticket, User, Prize]),
    BullModule.registerQueue({
      name: 'raffle',
      defaultJobOptions: {
        removeOnComplete: true,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60000,
        },
      },
    }),
    ScheduleModule.forRoot(),
    ConfigModule,
  ],
  providers: [
    RaffleService,
    RaffleWeb3Service,
    TicketService,
    SchedulerService,
    RaffleProcessor,
    PrizeService,
    {
      provide: 'WEB3_CONFIG',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          provider: config.get<string>('RPC_URL'),
          factoryAddress: config.get<string>('FACTORY_ADDRESS'),
          privateKey: config.get<string>('PRIVATE_KEY'),
        };
      },
    },
  ],
  controllers: [WebhookController],
  exports: [RaffleWeb3Service],
})
export class RaffleModule {}
