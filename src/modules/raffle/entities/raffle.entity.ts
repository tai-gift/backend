import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RaffleType } from 'src/modules/raffle/interfaces/raffle-type.enum';
import { RaffleStatus } from 'src/modules/raffle/interfaces/raffle-status.enum';

@Entity('raffles')
export class Raffle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: RaffleType,
  })
  @Index()
  type: RaffleType;

  @Column({ length: 42 })
  contractAddress: string;

  @Column({
    type: 'enum',
    enum: RaffleStatus,
    default: RaffleStatus.PENDING,
  })
  @Index()
  status: RaffleStatus;

  @Column({ type: 'timestamp' })
  @Index()
  startTime: Date;

  @Column({ type: 'timestamp' })
  @Index()
  endTime: Date;

  @Column('decimal', {
    precision: 72,
    scale: 0,
    transformer: {
      to: (value: bigint) => value?.toString(),
      from: (value: string) => BigInt(value),
    },
  })
  ticketPrice: bigint;

  @Column('decimal', {
    precision: 72,
    scale: 0,
    transformer: {
      to: (value: bigint) => value?.toString(),
      from: (value: string) => BigInt(value),
    },
  })
  guaranteedPrizePool: bigint;

  @Column('decimal', {
    precision: 72,
    scale: 0,
    default: 0,
    transformer: {
      to: (value: bigint) => value?.toString(),
      from: (value: string) => BigInt(value),
    },
  })
  currentPrizePool: bigint;

  @Column({ nullable: true })
  @Index()
  nextRaffleId: number;

  @Column({ default: false })
  isDrawComplete: boolean;

  @Column({ type: 'jsonb', nullable: true })
  winners: {
    addresses: string[];
    prizes: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  runnersUp: string[];

  @Column({ default: 0 })
  totalParticipants: number;

  @Column({ default: 0 })
  totalTickets: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  drawAt: Date;

  @Column({ nullable: true })
  activatedAt: Date;
}
