import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { Raffle } from './entities/raffle.entity';
import { RaffleService } from './services/raffle.service';
import { SchedulerService } from './services/scheduler.service';
import { RaffleProcessor } from './processors/raffle.processor';
// import { RaffleController } from './controllers/raffle.controller';
import { RaffleFactoryContract } from './contracts/factory.contract';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Raffle]),
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
    SchedulerService,
    RaffleProcessor,
    RaffleFactoryContract,
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
  // controllers: [RaffleController],
  exports: [RaffleService],
})
export class RaffleModule {}
