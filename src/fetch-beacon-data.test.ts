import * as api from './fetch-beacon-data';
import { Config } from './validation';
import * as makeRequestApi from './make-request';
import * as state from './state';
import { validSignedData } from '../test/fixtures';

const config: Config = {
  beacons: {
    '0x2ba0526238b0f2671b7981fd7a263730619c8e849a528088fd4a92350a8c2f2c': {
      airnode: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
      templateId: '0xea30f92923ece1a97af69d450a8418db31be5a26a886540a13c09c739ba8eaaa',
      fetchInterval: 25,
    },
    '0xa5ddf304a7dcec62fa55449b7fe66b33339fd8b249db06c18423d5b0da7716c2': {
      airnode: '0x5656D3A378B1AAdFDDcF4196ea364A9d78617290',
      templateId: '0xea30f92923ece1a97af69d450a8418db31be5a26a886540a13c09c739ba8eaaa',
      // Artificially low interval to make the tests run fast without mocking
      fetchInterval: 0.5,
    },
    '0x8fa9d00cb8f2d95b1299623d97a97696ed03d0e3350e4ea638f469be4d6f214e': {
      airnode: '0x5656D3A378B1AAdFDDcF4196ea364A9d78617290',
      templateId: '0x9ec34b00a5019442dcd05a4860ff2bf015164b368cb83fcb756088fc6fbd6480',
      fetchInterval: 40,
    },
  },
  beaconSets: {},
  chains: {
    '1': {
      contracts: {
        DapiServer: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
      },
      providers: {
        selfHostedMainnet: {
          url: 'https://some.self.hosted.mainnet.url',
        },
        infuraMainnet: {
          url: 'https://some.infura.mainnet.url',
        },
      },
      options: {
        txType: 'eip1559',
        priorityFee: {
          value: 3.12,
          unit: 'gwei',
        },
        baseFeeMultiplier: 2,
      },
    },
    '3': {
      contracts: {
        DapiServer: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
      },
      providers: {
        infuraRopsten: {
          url: 'https://some.influra.ropsten.url',
        },
      },
      options: {
        txType: 'eip1559',
        priorityFee: {
          value: 3.12,
          unit: 'gwei',
        },
        baseFeeMultiplier: 2,
      },
    },
  },
  gateways: {
    '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace': [
      {
        apiKey: '18e06827-8544-4b0f-a639-33df3b5bc62f',
        url: 'https://some.http.signed.data.gateway.url/',
      },
    ],
    '0x5656D3A378B1AAdFDDcF4196ea364A9d78617290': [
      {
        apiKey: '18e06827-8544-4b0f-a639-33df3b5bc62f',
        url: 'https://another.http.signed.data.gateway.url/',
      },
    ],
  },
  templates: {
    '0xea30f92923ece1a97af69d450a8418db31be5a26a886540a13c09c739ba8eaaa': {
      endpointId: '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6',
      parameters:
        '0x3173737373730000000000000000000000000000000000000000000000000000746f00000000000000000000000000000000000000000000000000000000000055534400000000000000000000000000000000000000000000000000000000005f74797065000000000000000000000000000000000000000000000000000000696e7432353600000000000000000000000000000000000000000000000000005f70617468000000000000000000000000000000000000000000000000000000726573756c7400000000000000000000000000000000000000000000000000005f74696d65730000000000000000000000000000000000000000000000000000313030303030300000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000',
    },
    '0x9ec34b00a5019442dcd05a4860ff2bf015164b368cb83fcb756088fc6fbd6480': {
      endpointId: '0xfa102bdb25c5358994a6213ddccdd27a0f310bf4a4d755e29bb74230f91a9d50',
      parameters:
        '0x3173737373730000000000000000000000000000000000000000000000000000746f00000000000000000000000000000000000000000000000000000000000055534400000000000000000000000000000000000000000000000000000000005f74797065000000000000000000000000000000000000000000000000000000696e7432353600000000000000000000000000000000000000000000000000005f70617468000000000000000000000000000000000000000000000000000000726573756c7400000000000000000000000000000000000000000000000000005f74696d65730000000000000000000000000000000000000000000000000000313030303030300000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000',
    },
  },
  triggers: {
    beaconUpdates: {
      '1': {
        '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC': {
          beacons: [
            {
              beaconId: '0x2ba0526238b0f2671b7981fd7a263730619c8e849a528088fd4a92350a8c2f2c',
              deviationThreshold: 0.1,
              heartbeatInterval: 86_400,
            },
            {
              beaconId: '0xa5ddf304a7dcec62fa55449b7fe66b33339fd8b249db06c18423d5b0da7716c2',
              deviationThreshold: 0.7,
              heartbeatInterval: 15_000,
            },
          ],
          updateInterval: 30,
        },
      },
      '3': {
        '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC': {
          beacons: [
            {
              beaconId: '0x2ba0526238b0f2671b7981fd7a263730619c8e849a528088fd4a92350a8c2f2c',
              deviationThreshold: 0.2,
              heartbeatInterval: 86_400,
            },
          ],
          updateInterval: 30,
        },
      },
    },
    beaconSetUpdates: {},
  },
};

describe('initiateFetchingBeaconData', () => {
  it('starts fetching data for all unique beacons', async () => {
    const fetchBeaconDataIds: string[] = [];
    jest.spyOn(api, 'fetchBeaconDataInLoop').mockImplementation(async (_config, id) => {
      fetchBeaconDataIds.push(id);
    });

    await api.initiateFetchingBeaconData(config);

    expect(fetchBeaconDataIds).toEqual([
      '0x2ba0526238b0f2671b7981fd7a263730619c8e849a528088fd4a92350a8c2f2c',
      '0xa5ddf304a7dcec62fa55449b7fe66b33339fd8b249db06c18423d5b0da7716c2',
    ]);
  });
});

describe('fetchBeaconData', () => {
  it('does nothing if signed data call fails', async () => {
    jest.spyOn(makeRequestApi, 'makeSignedDataGatewayRequests').mockImplementation(async () => {
      throw new Error('API timeout');
    });
    jest.spyOn(console, 'log');
    jest.spyOn(state, 'updateState');

    await api.fetchBeaconData(config, '0xa5ddf304a7dcec62fa55449b7fe66b33339fd8b249db06c18423d5b0da7716c2');

    expect(console.log).toHaveBeenCalledWith(
      `Unable to call signed data gateway. Reason: "Error: Full timeout exceeded"`
    );
    expect(state.updateState).not.toHaveBeenCalled();
  });

  it('updates retries multiple times', async () => {
    jest.spyOn(makeRequestApi, 'makeSignedDataGatewayRequests').mockImplementation(async () => {
      throw new Error('some error');
    });
    // 0.08 * 2_500 (max wait time) = 200 (actual wait time)
    // This means that 2 retries should definitely be done in 500ms
    jest.spyOn(global.Math, 'random').mockImplementation(() => 0.08);

    await api.fetchBeaconData(config, '0xa5ddf304a7dcec62fa55449b7fe66b33339fd8b249db06c18423d5b0da7716c2');

    expect(makeRequestApi.makeSignedDataGatewayRequests).toHaveBeenCalledTimes(3);
  });

  it('updates state with the api response value', async () => {
    jest.spyOn(makeRequestApi, 'makeSignedDataGatewayRequests').mockImplementation(async () => {
      return validSignedData;
    });

    await api.fetchBeaconData(config, '0xa5ddf304a7dcec62fa55449b7fe66b33339fd8b249db06c18423d5b0da7716c2');

    expect(state.getState().beaconValues).toEqual({
      '0xa5ddf304a7dcec62fa55449b7fe66b33339fd8b249db06c18423d5b0da7716c2': validSignedData,
    });
  });
});

describe('fetchBeaconDataInLoop', () => {
  it('calls fetchBeaconData in a loop', async () => {
    let requestCount = 0;
    jest.spyOn(api, 'fetchBeaconData');
    jest.spyOn(makeRequestApi, 'makeSignedDataGatewayRequests').mockImplementation(async () => {
      requestCount++;
      return validSignedData;
    });
    jest.spyOn(state, 'getState').mockImplementation(() => {
      if (requestCount === 2) {
        return {
          stopSignalReceived: true,
          beaconValues: {},
          providers: {},
        };
      } else {
        return {
          stopSignalReceived: false,
          beaconValues: {},
          providers: {},
        };
      }
    });

    await api.fetchBeaconDataInLoop(config, '0xa5ddf304a7dcec62fa55449b7fe66b33339fd8b249db06c18423d5b0da7716c2');

    expect(api.fetchBeaconData).toHaveBeenCalledTimes(2);
  });
});
