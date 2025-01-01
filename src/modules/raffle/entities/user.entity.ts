import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Ticket } from 'src/modules/raffle/entities/ticket.entity';
import { Prize } from 'src/modules/raffle/entities/prize.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: number;

  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ unique: true })
  address: string;

  @Column({ default: false, type: Boolean })
  hiddeDisplayName: boolean;

  @OneToMany(() => Ticket, (ticket) => ticket.buyer)
  tickets: Ticket[];

  @OneToMany(() => Prize, (prize) => prize.winners)
  prizes: Prize[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
