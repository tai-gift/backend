import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { RaffleType } from 'src/modules/raffle/interfaces/raffle-type.enum';
import { RaffleStatus } from 'src/modules/raffle/interfaces/raffle-status.enum';
import { Ticket } from 'src/modules/raffle/entities/ticket.entity';
import { Prize } from 'src/modules/raffle/entities/prize.entity';

@Entity('raffles')
export class Raffle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: RaffleType,
  })
  @Index()
  type: RaffleType;

  @Column({ length: 42, unique: true })
  address: string;

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

  @Column({ nullable: true })
  @Exclude()
  randomValue: string;

  @Column({ nullable: true })
  @Exclude()
  seed: string;

  @OneToMany(() => Ticket, (ticket) => ticket.raffle)
  tickets: Ticket[];

  @OneToMany(() => Prize, (prize) => prize.raffle)
  prizes: Prize[];
}
