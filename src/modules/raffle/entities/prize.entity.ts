import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/modules/raffle/entities/user.entity';
import { Raffle } from 'src/modules/raffle/entities/raffle.entity';

@Entity('prizes')
export class Prize {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  amount: bigint;

  @ManyToOne(() => Raffle, (raffle) => raffle.prizes)
  @JoinColumn({
    name: 'raffle_address',
    referencedColumnName: 'address',
  })
  raffle: Raffle;

  @ManyToOne(() => User, (raffle) => raffle.prizes)
  @JoinColumn({
    name: 'raffle_address',
    referencedColumnName: 'address',
  })
  winner: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
