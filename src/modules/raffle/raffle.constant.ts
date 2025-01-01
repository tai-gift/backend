import { ethers } from 'ethers';
import { RaffleType } from 'src/modules/raffle/interfaces/raffle-type.enum';

export const RAFFLE_CONFIG = {
  [RaffleType.DAILY]: {
    type: RaffleType.DAILY,
    duration: 86400,
    price: ethers.parseUnits('2', 6),
    guaranteedPrize: ethers.parseUnits('300', 6),
  },
  [RaffleType.WEEKLY]: {
    type: RaffleType.WEEKLY,
    duration: 604800,
    price: ethers.parseUnits('8', 6),
    guaranteedPrize: ethers.parseUnits('700', 6),
  },
  [RaffleType.MONTHLY]: {
    type: RaffleType.MONTHLY,
    duration: 2592000,
    price: ethers.parseUnits('20', 6),
    guaranteedPrize: ethers.parseUnits('2000', 6),
  },
};
