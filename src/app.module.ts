import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RaffleModule } from 'src/modules/raffle/raffle.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { env } from 'process';
import * as dotenv from 'dotenv';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
import { SharedModule } from 'src/shared/shared.module';
import { BullModule } from '@nestjs/bull';
import { EventEmitterModule } from '@nestjs/event-emitter';

dotenv.config();
@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: env.DATABASE_URL,
      entities: [join(__dirname, '**/*.entity{.ts,.js}')],
      synchronize: env.APP_ENV !== 'production',
      migrationsRun: true,
      migrations: ['dist/database/migrations/**/*{.ts,.js}'],
      logging: env.APP_ENV === 'development' ? 'all' : ['error'],
    }),
    BullModule.forRoot({
      redis: {
        host: env.REDIS_HOST,
        port: parseInt(env.REDIS_PORT ?? '6379'),
        password: env.REDIS_PASSWORD,
      },
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    RaffleModule,
    SharedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
