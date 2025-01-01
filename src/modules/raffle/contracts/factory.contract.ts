// src/modules/raffle/contracts/factory.contract.ts
import { Inject, Injectable } from '@nestjs/common';
import { ContractTransactionResponse, ethers } from 'ethers';
import { abi as RaffleFactoryABI } from './abi/factory.json';
import { abi as RaffleABI } from './abi/raffle.json';
import { RaffleStatus } from 'src/modules/raffle/interfaces/raffle-status.enum';
import { parseEvent } from 'src/modules/raffle/helpers/ethers';

interface Web3Config {
  provider: string;
  factoryAddress: string;
  privateKey: string;
}

export type RaffleInfo = {
  needsFallback: boolean;
  timeLeft: bigint;
  status: RaffleStatus;
  currentPrizePool: bigint;
  participants: bigint;
};

export type RaffleWinners = {
  winners: string[];
  runnersUp: string[];
  prizes: bigint[];
};

@Injectable()
export class RaffleFactoryContract {
  private readonly provider: ethers.JsonRpcProvider;
  private readonly signer: ethers.Wallet;
  private readonly factory: RaffleFactoryInterface;
  private readonly interface = new ethers.Interface(RaffleFactoryABI);

  constructor(@Inject('WEB3_CONFIG') private config: Web3Config) {
    this.provider = new ethers.JsonRpcProvider(config.provider);
    this.signer = new ethers.Wallet(config.privateKey, this.provider);
    this.factory = new ethers.Contract(
      config.factoryAddress,
      RaffleFactoryABI,
      this.signer,
    ) as unknown as RaffleFactoryInterface;
  }

  async deployRaffle(
    token: string,
    ticketPrice: bigint,
    duration: number,
    prizePool: bigint,
  ): Promise<string> {
    const tx = await this.factory.deployRaffle(
      token,
      ticketPrice?.toString(),
      duration,
      prizePool.toString(),
    );
    const receipt = await tx.wait();

    // Get deployment info from events
    const event = parseEvent(receipt, 'RaffleDeployed', this.interface);
    return event?.args?.[0];
  }

  async activateRaffle(address: string): Promise<void> {
    const raffle = this.raffleContract(address);
    const tx = await raffle.unpause();
    await tx.wait();
  }

  async pauseRaffle(address: string): Promise<void> {
    const raffle = this.raffleContract(address);
    const tx = await raffle.pause();
    await tx.wait();
  }

  async endRaffle(address: string): Promise<void> {
    const raffle = this.raffleContract(address);
    const tx = await raffle.endRaffle();
    await tx.wait();
  }

  async submitCommitment(address: string, commitHash: string): Promise<void> {
    const raffle = this.raffleContract(address);
    const tx = await raffle.submitCommitment(commitHash);
    await tx.wait();
  }

  async revealAndDraw(address: string, secret: Uint8Array): Promise<void> {
    const raffle = this.raffleContract(address);
    const tx = await raffle.revealAndDraw(secret);
    await tx.wait();
  }

  async getWinners(address: string): Promise<RaffleWinners> {
    const raffle = this.raffleContract(address);
    const winners = await raffle.getWinners();
    const runnersUp = await raffle.getRunnersUp();
    return { winners: winners[0], runnersUp, prizes: winners[1] };
  }

  private raffleContract(address: string) {
    return new ethers.Contract(
      address,
      RaffleABI,
      this.signer,
    ) as unknown as RaffleInterface;
  }

  async getRaffleInfo(address: string): Promise<RaffleInfo> {
    const raffle = this.raffleContract(address);
    const [status, currentPrizePool, timeLeft, participants, needsFallback] =
      await raffle.getRaffleInfo();
    return {
      status: status as RaffleStatus,
      currentPrizePool,
      timeLeft,
      participants,
      needsFallback,
    };
  }
}

export interface RaffleFactoryInterface {
  deployRaffle(
    token: string,
    ticketPrice: string,
    duration: number,
    prizePool: string,
  ): Promise<ContractTransactionResponse>;
  activateRaffle(address: string): Promise<void>;
  endRaffle(address: string): Promise<void>;
  submitCommitment(address: string, commitHash: string): Promise<void>;
  revealAndDraw(address: string, secret: string): Promise<void>;
  getWinners(
    address: string,
  ): Promise<{ winners: string[]; runnersUp: string[] }>;
}

export interface RaffleInterface {
  getRaffleInfo(): Promise<_RaffleInfo>;
  endRaffle(): Promise<ContractTransactionResponse>;
  submitCommitment(commitHash: string): Promise<ContractTransactionResponse>;
  revealAndDraw(secret: Uint8Array): Promise<ContractTransactionResponse>;
  getWinners(): Promise<[string[], bigint[]]>;
  getRunnersUp(): Promise<string[]>;
  pause(): Promise<ContractTransactionResponse>;
  unpause(): Promise<ContractTransactionResponse>;
}

export type _RaffleInfo = [
  (
    | 'Active'
    | 'Ready to End'
    | 'Invalid - Refunds Available'
    | 'Drawing Pending'
    | 'Completed'
  ),
  bigint,
  bigint,
  bigint,
  boolean,
];
