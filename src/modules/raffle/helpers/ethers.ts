import { ContractTransactionReceipt, ethers } from 'ethers';

export function parseLog(
  receipt: ContractTransactionReceipt,
  eventName: string,
  _interface: ethers.Interface,
) {
  return receipt?.logs.find((log: any) => {
    try {
      const parsedLog = _interface.parseLog({
        topics: log.topics,
        data: log.data,
      });
      return parsedLog?.name === eventName;
    } catch {
      return false;
    }
  });
}

export function parseEvent(
  receipt: ContractTransactionReceipt,
  name: string,
  _interface: ethers.Interface,
) {
  const log = parseLog(receipt, name, _interface);
  if (!log) throw new Error(`${name} event not found`);
  return _interface.parseLog({
    topics: log.topics,
    data: log.data,
  });
}
