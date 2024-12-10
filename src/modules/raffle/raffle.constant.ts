import { ethers } from 'ethers';
import { RaffleType } from 'src/modules/raffle/interfaces/raffle-type.enum';

export const RAFFLE_CONFIG = {
  [RaffleType.DAILY]: {
    ticketPrice: ethers.parseEther('2'),
    prizePool: ethers.parseEther('100'),
    duration: 5 * 60,
    // duration: 24 * 60 * 60,
  },
  [RaffleType.WEEKLY]: {
    ticketPrice: ethers.parseEther('10'),
    prizePool: ethers.parseEther('500'),
    duration: 7 * 24 * 60 * 60,
  },
  [RaffleType.MONTHLY]: {
    ticketPrice: ethers.parseEther('30'),
    prizePool: ethers.parseEther('1500'),
    duration: 30 * 24 * 60 * 60,
  },
};
