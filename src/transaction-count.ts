import { go, GoAsyncOptions } from '@api3/promise-utils';
import { ethers } from 'ethers';
import { logger } from './logging';
import { shortenAddress } from './utils';

export const getTransactionCount = async (
  rpcProvider: ethers.providers.StaticJsonRpcProvider,
  sponsorWalletAddress: string,
  currentBlockNumber: number,
  goOptions: GoAsyncOptions
): Promise<number | null> => {
  const goTransactionCount = await go(() => rpcProvider.getTransactionCount(sponsorWalletAddress, currentBlockNumber), {
    ...goOptions,
    onAttemptError: (goError) => logger.log(`Failed attempt to get transaction count. Error ${goError.error}`),
  });

  if (!goTransactionCount.success) {
    logger.log(`Unable to get transaction count. Error: ${goTransactionCount.error}`);
    return null;
  }

  const transactionCount = goTransactionCount.data;
  logger.log(`Transaction count for sponsor wallet ${shortenAddress(sponsorWalletAddress)} is ${transactionCount}`);

  return transactionCount;
};
