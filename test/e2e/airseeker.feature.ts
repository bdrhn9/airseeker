import { mockReadFileSync } from '../mock-utils';
import { ContractFactory, Contract, Wallet } from 'ethers';
import * as hre from 'hardhat';
import '@nomiclabs/hardhat-ethers';
import { buildAirseekerConfig, buildLocalSecrets } from '../fixtures/config';
import { deployAndUpdateSubscriptions } from '../setup/deployment';
import { main, handleStopSignal } from '../../src/main';
import { sleep } from '../../src/utils';
import * as makeRequest from '../../src/make-request';

// Jest version 27 has a bug where jest.setTimeout does not work correctly inside describe or test blocks
// https://github.com/facebook/jest/issues/11607
jest.setTimeout(70_000);

const provider = new hre.ethers.providers.StaticJsonRpcProvider('http://127.0.0.1:8545');

const airseekerConfig = buildAirseekerConfig();
const secretsConfig = buildLocalSecrets();
process.env = Object.assign(process.env, secretsConfig);

describe('Airseeker', () => {
  let deployment: {
    accessControlRegistryFactory: ContractFactory;
    accessControlRegistry: Contract;
    airnodeProtocolFactory: ContractFactory;
    airnodeProtocol: Contract;
    dapiServerFactory: ContractFactory;
    dapiServer: Contract;
    templateIdETH: string;
    templateIdBTC: string;
    airnodePspSponsorWallet: Wallet;
    airnodeWallet: Wallet;
    subscriptionIdETH: string;
    subscriptionIdBTC: string;
    beaconIdETH: string;
    beaconIdBTC: string;
    beaconIdLTC: string;
    beaconSetId: string;
  };

  beforeEach(async () => {
    // Reset the local hardhat network state for each test to prevent issues with other test contracts
    await hre.network.provider.send('hardhat_reset');
    // Set the net block timestamp to current time in seconds
    await hre.network.provider.send('evm_setNextBlockTimestamp', [Math.floor(Date.now() / 1000)]);
    // Mine the next block to set the timestamp for the following test
    await hre.network.provider.send('evm_mine');

    jest.restoreAllMocks();
    jest.clearAllTimers();

    deployment = await deployAndUpdateSubscriptions();
  });

  it('updates the beacons successfully', async () => {
    const voidSigner = new hre.ethers.VoidSigner(hre.ethers.constants.AddressZero, provider);
    const dapiServer = deployment.dapiServer.connect(voidSigner);

    // Check that initial values are updated
    const beaconValueETH = await dapiServer.readDataFeedValueWithId(deployment.beaconIdETH);
    const beaconValueBTC = await dapiServer.readDataFeedValueWithId(deployment.beaconIdBTC);
    const beaconValueLTC = await dapiServer.readDataFeedValueWithId(deployment.beaconIdLTC);
    const beaconSetValue = await dapiServer.readDataFeedValueWithId(deployment.beaconSetId);

    expect(beaconValueETH).toEqual(hre.ethers.BigNumber.from(723.39202 * 1_000_000));
    expect(beaconValueBTC).toEqual(hre.ethers.BigNumber.from(41_091.12345 * 1_000_000));
    expect(beaconValueLTC).toEqual(hre.ethers.BigNumber.from(51.42 * 1_000_000));
    expect(beaconSetValue).toEqual(hre.ethers.BigNumber.from(20_907.257735 * 1_000_000));

    mockReadFileSync('airseeker.json', JSON.stringify(airseekerConfig));

    await main().then(async () => {
      // Wait for Airseeker cycles to finish
      await sleep(20_000);
      // Stop Airseeker
      handleStopSignal('stop');
      // Wait for last cycle to finish
      await sleep(20_000);
    });

    const beaconValueETHNew = await dapiServer.readDataFeedValueWithId(deployment.beaconIdETH);
    const beaconValueBTCNew = await dapiServer.readDataFeedValueWithId(deployment.beaconIdBTC);
    const beaconValueLTCNew = await dapiServer.readDataFeedValueWithId(deployment.beaconIdLTC);
    const beaconSetValueNew = await dapiServer.readDataFeedValueWithId(deployment.beaconSetId);

    expect(beaconValueETHNew).toEqual(hre.ethers.BigNumber.from(800 * 1_000_000));
    expect(beaconValueBTCNew).toEqual(hre.ethers.BigNumber.from(43_000 * 1_000_000));
    expect(beaconValueLTCNew).toEqual(hre.ethers.BigNumber.from(54.85 * 1_000_000));
    expect(beaconSetValueNew).toEqual(hre.ethers.BigNumber.from(21_900 * 1_000_000));
  });

  it('does not update if the condition check fails', async () => {
    const voidSigner = new hre.ethers.VoidSigner(hre.ethers.constants.AddressZero, provider);
    const dapiServer = deployment.dapiServer.connect(voidSigner);

    // Check that initial values are updated
    const beaconValueETH = await dapiServer.readDataFeedValueWithId(deployment.beaconIdETH);
    const beaconValueBTC = await dapiServer.readDataFeedValueWithId(deployment.beaconIdBTC);
    const beaconValueLTC = await dapiServer.readDataFeedValueWithId(deployment.beaconIdLTC);
    const beaconSetValue = await dapiServer.readDataFeedValueWithId(deployment.beaconSetId);

    mockReadFileSync(
      'airseeker.json',
      JSON.stringify({
        ...airseekerConfig,
        triggers: {
          dataFeedUpdates: {
            '31337': {
              '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC': {
                beacons: [
                  {
                    beaconId: '0x924b5d4cb3ec6366ae4302a1ca6aec035594ea3ea48a102d160b50b0c43ebfb5',
                    deviationThreshold: 50,
                    heartbeatInterval: 86400,
                  },
                  {
                    beaconId: '0xbf7ce55d109fd196de2a8bf1515d166c56c9decbe9cb473656bbca30d5743990',
                    deviationThreshold: 50,
                    heartbeatInterval: 86400,
                  },
                  {
                    beaconId: '0x9b5825decf1232f79d3408fb6f7eeb7050fd88037f6517a94914e7d01ccd0cef',
                    deviationThreshold: 50,
                    heartbeatInterval: 86400,
                  },
                ],
                beaconSets: [
                  {
                    beaconSetId: '0xf7f1620b7f422eb9a69c8e21b317ba1555d3d87e1d804f0b024f03b107e411e8',
                    deviationThreshold: 50,
                    heartbeatInterval: 86400,
                  },
                ],
                updateInterval: 20,
              },
            },
          },
        },
      })
    );

    await main().then(async () => {
      // Wait for Airseeker cycles to finish
      await sleep(20_000);
      // Stop Airseeker
      handleStopSignal('stop');
      // Wait for last cycle to finish
      await sleep(20_000);
    });

    const beaconValueETHNew = await dapiServer.readDataFeedValueWithId(deployment.beaconIdETH);
    const beaconValueBTCNew = await dapiServer.readDataFeedValueWithId(deployment.beaconIdBTC);
    const beaconValueLTCNew = await dapiServer.readDataFeedValueWithId(deployment.beaconIdLTC);
    const beaconSetValueNew = await dapiServer.readDataFeedValueWithId(deployment.beaconSetId);

    expect(beaconValueETHNew).toEqual(hre.ethers.BigNumber.from(beaconValueETH));
    expect(beaconValueBTCNew).toEqual(hre.ethers.BigNumber.from(beaconValueBTC));
    expect(beaconValueLTCNew).toEqual(hre.ethers.BigNumber.from(beaconValueLTC));
    expect(beaconSetValueNew).toEqual(hre.ethers.BigNumber.from(beaconSetValue));
  });

  it('updates if the DapiServer timestamp is older than heartbeatInterval', async () => {
    mockReadFileSync(
      'airseeker.json',
      JSON.stringify({
        ...airseekerConfig,
        triggers: {
          dataFeedUpdates: {
            '31337': {
              '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC': {
                beacons: [
                  {
                    beaconId: '0x924b5d4cb3ec6366ae4302a1ca6aec035594ea3ea48a102d160b50b0c43ebfb5',
                    deviationThreshold: 50,
                    heartbeatInterval: 10,
                  },
                  {
                    beaconId: '0xbf7ce55d109fd196de2a8bf1515d166c56c9decbe9cb473656bbca30d5743990',
                    deviationThreshold: 50,
                    heartbeatInterval: 10,
                  },
                  {
                    beaconId: '0x9b5825decf1232f79d3408fb6f7eeb7050fd88037f6517a94914e7d01ccd0cef',
                    deviationThreshold: 50,
                    heartbeatInterval: 10,
                  },
                ],
                beaconSets: [
                  {
                    beaconSetId: '0xf7f1620b7f422eb9a69c8e21b317ba1555d3d87e1d804f0b024f03b107e411e8',
                    deviationThreshold: 50,
                    heartbeatInterval: 10,
                  },
                ],
                updateInterval: 20,
              },
            },
          },
        },
      })
    );

    await main().then(async () => {
      // Wait for Airseeker cycles to finish
      await sleep(20_000);
      // Stop Airseeker
      handleStopSignal('stop');
      // Wait for last cycle to finish
      await sleep(20_000);
    });

    const voidSigner = new hre.ethers.VoidSigner(hre.ethers.constants.AddressZero, provider);
    const dapiServer = deployment.dapiServer.connect(voidSigner);

    const beaconValueETHNew = await dapiServer.readDataFeedValueWithId(deployment.beaconIdETH);
    const beaconValueBTCNew = await dapiServer.readDataFeedValueWithId(deployment.beaconIdBTC);
    const beaconValueLTCNew = await dapiServer.readDataFeedValueWithId(deployment.beaconIdLTC);
    const beaconSetValueNew = await dapiServer.readDataFeedValueWithId(deployment.beaconSetId);

    expect(beaconValueETHNew).toEqual(hre.ethers.BigNumber.from(800 * 1_000_000));
    expect(beaconValueBTCNew).toEqual(hre.ethers.BigNumber.from(43_000 * 1_000_000));
    expect(beaconValueLTCNew).toEqual(hre.ethers.BigNumber.from(54.85 * 1_000_000));
    expect(beaconSetValueNew).toEqual(hre.ethers.BigNumber.from(21_900 * 1_000_000));
  });

  it('updates successfully after retrying a failed api call', async () => {
    mockReadFileSync('airseeker.json', JSON.stringify(airseekerConfig));

    const makeSignedDataGatewayRequestsSpy = jest.spyOn(makeRequest, 'makeSignedDataGatewayRequests');
    makeSignedDataGatewayRequestsSpy.mockRejectedValueOnce(new Error('Gateway call failed'));

    const makeApiRequestSpy = jest.spyOn(makeRequest, 'makeApiRequest');
    makeApiRequestSpy.mockRejectedValueOnce(new Error('Direct API call failed'));

    await main().then(async () => {
      // Wait for Airseeker cycles to finish
      await sleep(40_000);
      // Stop Airseeker
      handleStopSignal('stop');
      // Wait for last cycle to finish
      await sleep(20_000);
    });

    const voidSigner = new hre.ethers.VoidSigner(hre.ethers.constants.AddressZero, provider);
    const dapiServer = deployment.dapiServer.connect(voidSigner);

    const beaconValueETHNew = await dapiServer.readDataFeedValueWithId(deployment.beaconIdETH);
    const beaconValueBTCNew = await dapiServer.readDataFeedValueWithId(deployment.beaconIdBTC);
    const beaconValueLTCNew = await dapiServer.readDataFeedValueWithId(deployment.beaconIdLTC);
    const beaconSetValueNew = await dapiServer.readDataFeedValueWithId(deployment.beaconSetId);

    expect(beaconValueETHNew).toEqual(hre.ethers.BigNumber.from(800 * 1_000_000));
    expect(beaconValueBTCNew).toEqual(hre.ethers.BigNumber.from(43_000 * 1_000_000));
    expect(beaconValueLTCNew).toEqual(hre.ethers.BigNumber.from(54.85 * 1_000_000));
    expect(beaconSetValueNew).toEqual(hre.ethers.BigNumber.from(21_900 * 1_000_000));
  });

  it('updates successfully with one invalid provider present', async () => {
    mockReadFileSync(
      'airseeker.json',
      JSON.stringify({
        ...airseekerConfig,
        chains: {
          '31337': {
            contracts: {
              DapiServer: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
            },
            providers: {
              invalidProvider: {
                url: 'http://invalid',
              },
              local: {
                url: '${CP_LOCAL_URL}',
              },
            },
            options: {
              fulfillmentGasLimit: 500000,
              gasPriceOracle: [
                {
                  gasPriceStrategy: 'latestBlockPercentileGasPrice',
                  percentile: 60,
                  minTransactionCount: 29,
                  pastToCompareInBlocks: 20,
                  maxDeviationMultiplier: 5,
                },
                {
                  gasPriceStrategy: 'providerRecommendedGasPrice',
                  recommendedGasPriceMultiplier: 1.2,
                },
                {
                  gasPriceStrategy: 'constantGasPrice',
                  gasPrice: {
                    value: 10,
                    unit: 'gwei',
                  },
                },
              ],
            },
          },
        },
      })
    );

    await main().then(async () => {
      // Wait for Airseeker cycles to finish
      await sleep(20_000);
      // Stop Airseeker
      handleStopSignal('stop');
      // Wait for last cycle to finish
      await sleep(20_000);
    });

    const voidSigner = new hre.ethers.VoidSigner(hre.ethers.constants.AddressZero, provider);
    const dapiServer = deployment.dapiServer.connect(voidSigner);

    const beaconValueETHNew = await dapiServer.readDataFeedValueWithId(deployment.beaconIdETH);
    const beaconValueBTCNew = await dapiServer.readDataFeedValueWithId(deployment.beaconIdBTC);
    const beaconValueLTCNew = await dapiServer.readDataFeedValueWithId(deployment.beaconIdLTC);
    const beaconSetValueNew = await dapiServer.readDataFeedValueWithId(deployment.beaconSetId);

    expect(beaconValueETHNew).toEqual(hre.ethers.BigNumber.from(800 * 1_000_000));
    expect(beaconValueBTCNew).toEqual(hre.ethers.BigNumber.from(43_000 * 1_000_000));
    expect(beaconValueLTCNew).toEqual(hre.ethers.BigNumber.from(54.85 * 1_000_000));
    expect(beaconSetValueNew).toEqual(hre.ethers.BigNumber.from(21_900 * 1_000_000));
  });

  it('throws on invalid airseeker config', async () => {
    mockReadFileSync(
      'airseeker.json',
      JSON.stringify({
        ...airseekerConfig,
        chains: '',
      })
    );
    await expect(main()).rejects.toThrow('Invalid Airseeker configuration file');
  });
});
