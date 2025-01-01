import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Prize } from 'src/modules/raffle/entities/prize.entity';
import { In, Repository } from 'typeorm';
import { User } from 'src/modules/raffle/entities/user.entity';
import { Raffle } from 'src/modules/raffle/entities/raffle.entity';
import { instanceToPlain } from 'class-transformer';

@Injectable()
export class PrizeService {
  constructor(
    @InjectRepository(Prize)
    private readonly prizeRepository: Repository<Prize>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Raffle)
    private readonly raffleRepository: Repository<Raffle>,
  ) {}

  async saveWinnersAndPrize(param: {
    address: string;
    winners: string[];
    prizes: string[];
  }) {
    if (param.winners.length !== param.prizes.length)
      throw new UnprocessableEntityException();

    const raffle = await this.raffleRepository.findOneByOrFail({
      address: param.address?.toLowerCase(),
    });
    const users = await this.userRepository.findBy({
      address: In(param.winners),
    });

    const prizes = param.prizes.map((prize, index) => {
      const user = users.find(
        (user) =>
          user.address?.toLowerCase() === param.winners[index]?.toLowerCase(),
      );
      return this.prizeRepository.create({
        amount: BigInt(prize),
        raffle,
        winner: user,
      });
    });

    await this.prizeRepository.save(prizes);

    return instanceToPlain(prizes);
  }
}
