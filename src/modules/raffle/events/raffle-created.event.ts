export class RaffleCreatedEvent {
  constructor(
    public readonly raffle: {
      tokenAddress: string;
      address: string;
      ticketPrice: string;
    },
  ) {}
}
