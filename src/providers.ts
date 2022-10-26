import { ethers } from 'ethers';
import { networks } from '@api3/airnode-protocol';
import { uniq } from 'lodash';
import { getState, Provider, Providers, updateState } from './state';
import { PROVIDER_TIMEOUT_MS } from './constants';

export const initializeProvider = (chainId: string, providerUrl: string): Omit<Provider, 'providerName'> => {
  const network = networks[chainId] || null;
  const rpcProvider = new ethers.providers.StaticJsonRpcProvider(
    { url: providerUrl, timeout: PROVIDER_TIMEOUT_MS },
    network
  );

  return { rpcProvider, chainId };
};

export const initializeProviders = () => {
  const { config } = getState();
  const triggersUpdatesChains = uniq([...Object.keys(config.triggers.dataFeedUpdates)]);
  const providers = triggersUpdatesChains.reduce((acc: Providers, chainId: string) => {
    const chain = config.chains[chainId];

    const chainProviders = Object.entries(chain.providers).map(([providerName, provider]) => ({
      ...initializeProvider(chainId, provider.url),
      providerName,
    }));

    return { ...acc, [chainId]: chainProviders };
  }, {});

  updateState((state) => ({ ...state, providers }));
};
