import { evm } from '@api3/airnode-node';
import { DapiServer__factory as DapiServerFactory } from '@api3/airnode-protocol-v1';
import { go } from '@api3/promise-utils';
import { ethers } from 'ethers';
import { isEmpty, isNil } from 'lodash';
import { getCurrentBlockNumber } from './block-number';
import { checkOnchainDataFreshness, checkUpdateCondition } from './check-condition';
import { INT224_MAX, INT224_MIN, NO_BEACON_SETS_EXIT_CODE, PROTOCOL_ID } from './constants';
import { getGasPrice } from './gas-oracle';
import { logger } from './logging';
import { readDataFeedWithId } from './read-data-feed-with-id';
import { getState, Provider } from './state';
import { getTransactionCount } from './transaction-count';
import { prepareGoOptions, shortenAddress, sleep } from './utils';
import { BeaconSetUpdate, SignedData } from './validation';

type ProviderSponsorBeaconSets = {
  provider: Provider;
  sponsorAddress: string;
  updateInterval: number;
  beaconSets: BeaconSetUpdate[];
};

type BeaconSetBeaconValue = {
  beaconId: string;
  airnode: string;
  templateId: string;
  fetchInterval: number;
  timestamp: string;
  encodedValue: string;
  signature: string;
  value: ethers.BigNumber;
};

export const groupBeaconSetsByProviderSponsor = () => {
  const { config, providers: stateProviders } = getState();
  return Object.entries(config.triggers.beaconSetUpdates).reduce(
    (acc: ProviderSponsorBeaconSets[], [chainId, beaconSetUpdatesPerSponsor]) => {
      const providers = stateProviders[chainId];

      const providerSponsorGroups = Object.entries(beaconSetUpdatesPerSponsor).reduce(
        (acc: ProviderSponsorBeaconSets[], [sponsorAddress, beaconSetUpdate]) => {
          return [...acc, ...providers.map((provider) => ({ provider, sponsorAddress, ...beaconSetUpdate }))];
        },
        []
      );

      return [...acc, ...providerSponsorGroups];
    },
    []
  );
};

export const initiateBeaconSetUpdates = () => {
  logger.debug('Initiating beacon set updates');

  const providerSponsorBeaconSetsGroups = groupBeaconSetsByProviderSponsor();
  if (isEmpty(providerSponsorBeaconSetsGroups)) {
    logger.error('No beacon sets for processing found. Stopping.');
    process.exit(NO_BEACON_SETS_EXIT_CODE);
  }
  providerSponsorBeaconSetsGroups.forEach(updateBeaconSetsInLoop);
};

export const updateBeaconSetsInLoop = async (providerSponsorBeaconSets: ProviderSponsorBeaconSets) => {
  while (!getState().stopSignalReceived) {
    const startTimestamp = Date.now();
    const { updateInterval } = providerSponsorBeaconSets;

    await updateBeaconSets(providerSponsorBeaconSets);

    const duration = Date.now() - startTimestamp;
    const waitTime = Math.max(0, updateInterval * 1_000 - duration);
    await sleep(waitTime);
  }
};

// We pass return value from `prepareGoOptions` (with calculated timeout) to every `go` call in the function to enforce the update cycle.
// This solution is not precise but since chain operations are the only ones that actually take some time this should be a good enough solution.
export const updateBeaconSets = async (providerSponsorBeaconSets: ProviderSponsorBeaconSets) => {
  const { config, beaconValues } = getState();
  const { provider, sponsorAddress, beaconSets: beaconSetUpdates } = providerSponsorBeaconSets;
  const { rpcProvider, chainId, providerName } = provider;
  const logOptionsSponsor = {
    meta: { chainId, providerName },
    additional: { Sponsor: shortenAddress(sponsorAddress) },
  };
  logger.debug(`Processing beacon set updates`, logOptionsSponsor);

  const startTime = Date.now();
  // All the beacon set updates for given provider & sponsor have up to <updateInterval> seconds to finish
  const totalTimeout = providerSponsorBeaconSets.updateInterval * 1_000;

  // Prepare contract for beacon set updates
  const contractAddress = config.chains[chainId].contracts['DapiServer'];
  const contract = DapiServerFactory.connect(contractAddress, rpcProvider);

  // Get current block number
  const blockNumber = await getCurrentBlockNumber(provider, prepareGoOptions(startTime, totalTimeout));
  if (blockNumber === null) {
    logger.warn(`Unable to obtain block number`, logOptionsSponsor);
    return;
  }

  // Derive sponsor wallet address
  const sponsorWallet = evm
    .deriveSponsorWalletFromMnemonic(config.airseekerWalletMnemonic, sponsorAddress, PROTOCOL_ID)
    .connect(rpcProvider);

  // Get transaction count
  const transactionCount = await getTransactionCount(
    provider,
    sponsorWallet.address,
    blockNumber,
    prepareGoOptions(startTime, totalTimeout)
  );
  if (transactionCount === null) {
    logger.warn(`Unable to fetch transaction count`, logOptionsSponsor);
    return;
  }

  // Process beacon set updates
  let nonce = transactionCount;
  const voidSigner = new ethers.VoidSigner(ethers.constants.AddressZero, rpcProvider);

  for (const beaconSetUpdate of beaconSetUpdates) {
    const logOptionsBeaconSetId = {
      ...logOptionsSponsor,
      additional: {
        ...logOptionsSponsor.additional,
        'Sponsor-Wallet': shortenAddress(sponsorWallet.address),
        'BeaconSet-ID': beaconSetUpdate.beaconSetId,
      },
    };

    logger.debug(`Updating beacon set`, logOptionsBeaconSetId);

    // retrieve values for each beacon within the set from the cache (common memory)
    const beaconSetBeaconValuesPromises: Promise<BeaconSetBeaconValue>[] = config.beaconSets[
      beaconSetUpdate.beaconSetId
    ].map(async (beaconId) => {
      const logOptionsBeaconId = {
        ...logOptionsBeaconSetId,
        additional: {
          ...logOptionsBeaconSetId.additional,
          'Beacon-ID': beaconId,
        },
      };

      const beaconResponse: SignedData = beaconValues[beaconId];

      // Check whether we have a value for given beacon
      if (isNil(beaconResponse)) {
        logger.warn('Missing off chain data for beacon.', logOptionsBeaconId);
        // IF there's no value for a given beacon, fetch it from the chain
        const beaconValueOnChain = await readDataFeedWithId(
          voidSigner,
          contract,
          beaconId,
          prepareGoOptions(startTime, totalTimeout),
          logOptionsBeaconId
        );
        // IF the value is not available on the chain skip the update
        if (isNil(beaconValueOnChain)) {
          const message = `Missing on chain data for beacon.`;
          logger.warn(message, logOptionsBeaconId);
          throw new Error(message);
        }

        return {
          beaconId,
          timestamp: beaconValueOnChain.timestamp.toString(),
          encodedValue: '0x',
          signature: '0x',
          value: beaconValueOnChain.value,
          ...config.beacons[beaconId],
        };
      }

      // Based on https://github.com/api3dao/airnode-protocol-v1/blob/main/contracts/dapis/DapiServer.sol#L878
      const decodedValue = ethers.BigNumber.from(
        ethers.utils.defaultAbiCoder.decode(['int256'], beaconResponse.encodedValue)[0]
      );
      if (decodedValue.gt(INT224_MAX) || decodedValue.lt(INT224_MIN)) {
        const message = `New beacon value is out of type range.`;
        logger.warn(message, logOptionsBeaconId);
        throw new Error(message);
      }

      return { beaconId, ...beaconResponse, value: decodedValue, ...config.beacons[beaconId] };
    });
    const beaconSetBeaconValuesResults = await Promise.allSettled(beaconSetBeaconValuesPromises);
    if (beaconSetBeaconValuesResults.some((data) => data.status === 'rejected')) {
      logger.warn('There was an error fetching beacon data for beacon set. Skipping.');
      continue;
    }

    const beaconSetBeaconValues = beaconSetBeaconValuesResults.map(
      (result) => (result as PromiseFulfilledResult<BeaconSetBeaconValue>).value
    );

    // fetch beacon set value & timestamp from the chain
    const beaconSetValueOnChain = await readDataFeedWithId(
      voidSigner,
      contract,
      beaconSetUpdate.beaconSetId,
      prepareGoOptions(startTime, totalTimeout),
      logOptionsBeaconSetId
    );
    // TODO: what if the beaconSet is not yet initialized?
    // Should we continue with next beaconSet? See https://github.com/API3-CTT/airseeker/blob/166-update-beacon-sets-implementation/src/update-beacons.ts#L151

    // calculate beacon set timestamp from beacon timestamps (https://github.com/api3dao/airnode-protocol-v1/blob/main/contracts/dapis/DapiServer.sol#L443)
    const accumulatedTimestamp = beaconSetBeaconValues.reduce((total, next) => total + parseInt(next.timestamp, 10), 0);
    const updatedTimestamp = Math.floor(accumulatedTimestamp / beaconSetBeaconValues.length);

    // IF new timestamp is older than the on-chain one skip the update (similar to checkSignedDataFreshness)
    if (beaconSetValueOnChain && beaconSetValueOnChain.timestamp >= updatedTimestamp) {
      logger.info('On chain beacon set value is more up-to-date. Skipping.');
      continue;
    }

    // IF the last update is older than now + heartbeat interval force update
    const isOnchainDataFresh =
      beaconSetValueOnChain &&
      checkOnchainDataFreshness(beaconSetValueOnChain.timestamp, beaconSetUpdate.heartbeatInterval);
    if (!isOnchainDataFresh) {
      logger.info(
        `On chain data timestamp older than heartbeat. Updating without condition check.`,
        logOptionsBeaconSetId
      );
    } else {
      // IF the deviation threshold is reached do the update, skip otherwise
      const median = (arr: ethers.BigNumber[]) => {
        const mid = Math.floor(arr.length / 2);
        const nums = [...arr].sort((a, b) => {
          if (a.lt(b)) return -1;
          else if (a.gt(b)) return 1;
          else return 0;
        });
        return arr.length % 2 !== 0 ? nums[mid] : nums[mid - 1].add(nums[mid]).div(2);
      };
      // Check beacon set condition
      // TODO: should we use median like in DapiServer or mean?
      const updatedValue = median(beaconSetBeaconValues.map((value) => value.value));
      const shouldUpdate = checkUpdateCondition(
        beaconSetValueOnChain.value,
        beaconSetUpdate.deviationThreshold,
        updatedValue
      );
      if (shouldUpdate === null) {
        logger.warn(`Unable to fetch current beacon set value`, logOptionsBeaconSetId);
        // This can happen only if we reach the total timeout so it makes no sense to continue with the rest of the beacons
        return;
      }
      if (!shouldUpdate) {
        logger.info(`Deviation threshold not reached. Skipping.`, logOptionsBeaconSetId);
        continue;
      }

      logger.info(`Deviation threshold reached. Updating.`, logOptionsBeaconSetId);
    }

    // Get gas price from oracle
    const gasPrice = await getGasPrice(provider, config.chains[chainId].options.gasOracle);

    // Update beacon
    const tx = await go(
      () =>
        contract.connect(sponsorWallet).updateBeaconSetWithSignedData(
          beaconSetBeaconValues.map((value) => value.airnode),
          beaconSetBeaconValues.map((value) => value.templateId),
          beaconSetBeaconValues.map((value) => value.timestamp),
          beaconSetBeaconValues.map((value) => value.encodedValue),
          beaconSetBeaconValues.map((value) => value.signature),
          {
            gasLimit: ethers.BigNumber.from(config.chains[chainId].options.fulfillmentGasLimit),
            type: config.chains[chainId].options.txType === 'eip1559' ? 2 : 0,
            gasPrice,
            nonce,
          }
        ),
      {
        ...prepareGoOptions(startTime, totalTimeout),
        onAttemptError: (goError) =>
          logger.warn(`Failed attempt to update beacon set. Error ${goError.error}`, logOptionsBeaconSetId),
      }
    );

    if (!tx.success) {
      logger.warn(`Unable to update beacon set with nonce ${nonce}. Error: ${tx.error}`, logOptionsBeaconSetId);
      return;
    }

    logger.info(`Beacon set successfully updated. Tx hash ${tx.data.hash}.`, logOptionsBeaconSetId);
    nonce++;
  }
};
