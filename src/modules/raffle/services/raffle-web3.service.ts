import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseWallet, ethers } from 'ethers';
import * as RaffleFactory from 'src/modules/raffle/contracts/abi/factory.json';
import * as Raffle from 'src/modules/raffle/contracts/abi/Raffle.json';
import * as ERC20 from 'src/modules/raffle/contracts/abi/ERC20.json';
import * as Wallets from 'src/modules/raffle/contracts/wallets.json';

interface WinnerSelection {
  indices: bigint[];
  seeds: string[];
  winners: string[];
}

@Injectable()
export class RaffleWeb3Service {
  private readonly logger = new Logger(RaffleWeb3Service.name);

  private readonly provider: ethers.JsonRpcProvider;
  private readonly signer: ethers.Wallet;
  private readonly factoryContract: ethers.Contract;
  private readonly tokenContract: ethers.Contract;
  private currentNonce: number | null = null;

  constructor(private configService: ConfigService) {
    this.provider = new ethers.JsonRpcProvider(
      this.configService.get<string>('RPC_URL'),
    );
    this.signer = new ethers.Wallet(
      this.configService.get<string>('PRIVATE_KEY'),
      this.provider,
    );
    this.factoryContract = new ethers.Contract(
      this.configService.get<string>('FACTORY_ADDRESS'),
      RaffleFactory.abi,
      this.signer,
    );
    this.tokenContract = new ethers.Contract(
      this.configService.get<string>('TOKEN_ADDRESS'),
      ERC20.abi,
      this.signer,
    );
  }

  async deployRaffle(
    ticketPrice: bigint,
    durationInSeconds: number,
    guaranteedPrize: bigint,
  ): Promise<string> {
    try {
      const tx = await this.factoryContract.deployRaffle(
        this.configService.get<string>('TOKEN_ADDRESS'),
        ticketPrice,
        durationInSeconds,
        guaranteedPrize,
      );
      const receipt = await tx.wait();

      const factoryInterface = new ethers.Interface(RaffleFactory.abi);
      const raffleDeployedLog = receipt.logs.find(
        (log) =>
          log.topics[0] ===
          factoryInterface.getEvent('RaffleDeployed').topicHash,
      );

      if (!raffleDeployedLog) {
        throw new Error('Raffle deployment event not found in logs');
      }

      const decodedEvent = factoryInterface.parseLog({
        topics: raffleDeployedLog.topics,
        data: raffleDeployedLog.data,
      });

      return decodedEvent.args[0];
    } catch (error) {
      this.currentNonce = null;
      console.error(`Failed to deploy raffle: ${error.message}`);
      throw error;
    }
  }

  async buyTickets(
    raffleAddress: string,
    participantSigner: BaseWallet,
    totalCost: bigint,
    numberOfTickets: bigint,
  ): Promise<boolean> {
    try {
      const raffleContract = new ethers.Contract(
        raffleAddress,
        Raffle.abi,
        participantSigner,
      );
      const tokenAddress = await raffleContract.token();

      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20.abi,
        participantSigner,
      );

      const approveTx = await tokenContract.approve(raffleAddress, totalCost);
      await approveTx.wait();

      const buyTx = await raffleContract.buyTickets(numberOfTickets);
      await buyTx.wait();

      return true;
    } catch (error) {
      console.error(`Failed to buy tickets: ${error.message}`);
      throw error;
    }
  }

  async initiateWinnerSelection(raffleAddress: string) {
    try {
      const raffleContract = new ethers.Contract(
        raffleAddress,
        Raffle.abi,
        this.signer,
      );

      // Generate and sign commitment
      const randomValue = ethers.hexlify(ethers.randomBytes(32));
      const seed = ethers.hexlify(ethers.randomBytes(32));
      const commitmentHash = ethers.keccak256(
        ethers.solidityPacked(['bytes32', 'bytes32'], [randomValue, seed]),
      );
      const signature = await this.signer.signMessage(
        ethers.getBytes(commitmentHash),
      );

      console.log('Initiating winner selection...');
      const response = await raffleContract.initiateWinnerSelection(
        commitmentHash,
        signature,
      );
      await response.wait();

      return { randomValue, seed };
    } catch (error) {
      this.currentNonce = null;
      console.error('Failed to end raffle');
      throw error;
    }
  }

  async raffleCompleteWinnerSelection(
    raffleAddress: string,
    randomValue: string,
    seed: string,
    totalTickets: bigint,
  ): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 5 * 60 * 1000));
    try {
      const raffleContract = new ethers.Contract(
        raffleAddress,
        Raffle.abi,
        this.signer,
      );

      // Complete selection
      const winners = await this.selectWinners(
        totalTickets,
        randomValue,
        raffleAddress,
      );

      console.log('Completing winner selection...');
      await (
        await raffleContract.completeWinnerSelection(randomValue, seed, winners)
      ).wait();
      console.log('Completed winner selection.');

      return true;
    } catch (error) {
      this.currentNonce = null;
      console.error('Failed to complete winner selection');
      throw error;
    }
  }

  private async selectWinners(
    totalTickets: bigint,
    randomValue: string,
    raffleAddress: string,
  ): Promise<WinnerSelection> {
    // Generate winners list from existing ticket holders
    const raffleContract = new ethers.Contract(
      raffleAddress,
      Raffle.abi,
      this.signer,
    );
    const numWinners = 10;
    const indices: bigint[] = [];
    const seeds: string[] = [];
    const winners: Set<string> = new Set<string>();

    let currentSeed = randomValue;

    while (winners.size < numWinners) {
      const index = ethers.toBigInt(currentSeed) % totalTickets;
      const winner = await raffleContract.ticketOwners(index);

      indices.push(index);
      seeds.push(currentSeed);
      winners.add(winner);

      currentSeed = ethers.keccak256(
        ethers.solidityPacked(['bytes32', 'address'], [currentSeed, winner]),
      );
    }

    return { indices, seeds, winners: Array.from(winners) };
  }

  async unpauseRaffle(address: string) {
    const raffle = new ethers.Contract(address, Raffle.abi, this.signer);
    const response = await raffle.unpause();
    await response.wait();
    return true;
  }

  async raffleEndTime(address: string) {
    const raffle = new ethers.Contract(address, Raffle.abi, this.signer);
    return await raffle.raffleEndTime();
  }

  async buyDefaultTickets(data: {
    address: string;
    price: string;
    token_address: string;
  }) {
    console.log('Buying default tickets...', data);
    try {
      const tokenContract = new ethers.Contract(
        data.token_address,
        ERC20.abi,
        this.signer,
      );

      for (const wallet of Wallets) {
        const walletSigner = new ethers.Wallet(
          wallet.privateKey,
          this.provider,
        );

        const [ethBalance, tokenBalance] = await Promise.all([
          this.provider.getBalance(wallet.address),
          tokenContract.balanceOf(wallet.address),
        ]);

        if (ethBalance < ethers.parseEther('0.0009')) {
          const value = ethers.parseEther('0.005') - ethBalance;
          await this.signer.sendTransaction({
            to: wallet.address,
            value: value,
          });
          this.logger.log(`Sent ${value} ETH to ${wallet.address}`);
        }

        if (tokenBalance < ethers.parseUnits('100', 6)) {
          const amount = ethers.parseUnits('100', 6) - tokenBalance;
          const tx = await tokenContract.transfer(wallet.address, amount);
          await tx.wait();
          this.logger.log(`Sent ${amount} tokens to ${wallet.address}`);
        }

        const numberOfTickets = BigInt(Math.floor(Math.random() * 5) + 1);
        const totalCost = BigInt(data.price) * numberOfTickets;

        const response = await this.tokenContract.approve(
          data.address,
          totalCost,
        );
        await response.wait();

        const response2 = await this.buyTickets(
          data.address,
          walletSigner,
          totalCost,
          numberOfTickets,
        );

        response2 &&
          this.logger.log(
            `Bought ${numberOfTickets} tickets for ${wallet.address}`,
          );
      }

      return true;
    } catch (error) {
      console.error(`Failed to buy default ticket for ${data.address}:`, error);
      throw error;
    }
  }

  getWinners(address: string) {
    const raffle = new ethers.Contract(address, Raffle.abi, this.signer);
    const winners = raffle.getWinners();

    return { winners: winners[0], prizes: winners[1] };
  }
}
