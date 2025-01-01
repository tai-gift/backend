import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from 'src/modules/raffle/entities/user.entity';
import { Raffle } from 'src/modules/raffle/entities/raffle.entity';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: number;

  @Column({
    default: 0,
    unsigned: true,
  })
  amount: number;

  @Column({
    unsigned: true,
  })
  count: number;

  @Column({
    unsigned: true,
  })
  block_number: number;

  @Column()
  hash: string;

  @ManyToOne(() => User, (user) => user.tickets)
  @JoinColumn({ name: 'buyer_address', referencedColumnName: 'address' })
  buyer: User;

  @ManyToOne(() => Raffle, (raffle) => raffle.tickets)
  @JoinColumn({
    name: 'raffle_address',
    referencedColumnName: 'address',
  })
  raffle: Raffle;
}
