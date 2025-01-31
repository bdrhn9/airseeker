import { go, GoAsyncOptions } from '@api3/promise-utils';
import { logger } from './logging';
import { Provider } from './state';
import { shortenAddress } from './utils';

export const getTransactionCount = async (
  provider: Provider,
  sponsorWalletAddress: string,
  goOptions: GoAsyncOptions
): Promise<number | null> => {
  const { chainId, rpcProvider, providerName } = provider;
  const logOptionsSponsorWallet = {
    meta: { 'Chain-ID': chainId, Provider: providerName, 'Sponsor-Wallet': shortenAddress(sponsorWalletAddress) },
  };

  const goTransactionCount = await go(() => rpcProvider.getTransactionCount(sponsorWalletAddress), {
    ...goOptions,
    onAttemptError: (goError) =>
      logger.warn(`Failed attempt to get transaction count. Error ${goError.error}`, logOptionsSponsorWallet),
  });

  if (!goTransactionCount.success) {
    logger.warn(`Unable to get transaction count. Error: ${goTransactionCount.error}`, logOptionsSponsorWallet);
    return null;
  }

  const transactionCount = goTransactionCount.data;
  logger.info(`Transaction count is ${transactionCount}`, logOptionsSponsorWallet);

  return transactionCount;
};
