import { ethers } from 'ethers';
import { calculateUpdateInPercentage, checkUpdateCondition, HUNDRED_PERCENT } from './check-condition';

describe('calculateUpdateInPercentage', () => {
  it('calculates increase', () => {
    const updateInPercentage = calculateUpdateInPercentage(ethers.BigNumber.from(10), ethers.BigNumber.from(15));
    expect(updateInPercentage).toEqual(ethers.BigNumber.from(0.5 * HUNDRED_PERCENT));
  });

  it('calculates decrease', () => {
    const updateInPercentage = calculateUpdateInPercentage(ethers.BigNumber.from(10), ethers.BigNumber.from(5));
    expect(updateInPercentage).toEqual(ethers.BigNumber.from(0.5 * HUNDRED_PERCENT));
  });

  it('calculates zero change', () => {
    const updateInPercentage = calculateUpdateInPercentage(ethers.BigNumber.from(10), ethers.BigNumber.from(10));
    expect(updateInPercentage).toEqual(ethers.BigNumber.from(0 * HUNDRED_PERCENT));
  });

  it('calculates 100 percent change', () => {
    const updateInPercentage = calculateUpdateInPercentage(ethers.BigNumber.from(10), ethers.BigNumber.from(20));
    expect(updateInPercentage).toEqual(ethers.BigNumber.from(1 * HUNDRED_PERCENT));
  });

  it('calculates positive to negative change', () => {
    const updateInPercentage = calculateUpdateInPercentage(ethers.BigNumber.from(10), ethers.BigNumber.from(-5));
    expect(updateInPercentage).toEqual(ethers.BigNumber.from(1.5 * HUNDRED_PERCENT));
  });

  it('calculates negative to positive change', () => {
    const updateInPercentage = calculateUpdateInPercentage(ethers.BigNumber.from(-5), ethers.BigNumber.from(5));
    expect(updateInPercentage).toEqual(ethers.BigNumber.from(2 * HUNDRED_PERCENT));
  });

  it('calculates initial zero to positive change', () => {
    const updateInPercentage = calculateUpdateInPercentage(ethers.BigNumber.from(0), ethers.BigNumber.from(5));
    expect(updateInPercentage).toEqual(ethers.BigNumber.from(5 * HUNDRED_PERCENT));
  });

  it('calculates initial zero to negative change', () => {
    const updateInPercentage = calculateUpdateInPercentage(ethers.BigNumber.from(0), ethers.BigNumber.from(-5));
    expect(updateInPercentage).toEqual(ethers.BigNumber.from(5 * HUNDRED_PERCENT));
  });

  it('calculates initial positive to zero change', () => {
    const updateInPercentage = calculateUpdateInPercentage(ethers.BigNumber.from(5), ethers.BigNumber.from(0));
    expect(updateInPercentage).toEqual(ethers.BigNumber.from(1 * HUNDRED_PERCENT));
  });

  it('calculates initial negative to zero change', () => {
    const updateInPercentage = calculateUpdateInPercentage(ethers.BigNumber.from(-5), ethers.BigNumber.from(0));
    expect(updateInPercentage).toEqual(ethers.BigNumber.from(1 * HUNDRED_PERCENT));
  });

  it('calculates initial negative to negative change', () => {
    const updateInPercentage = calculateUpdateInPercentage(ethers.BigNumber.from(-5), ethers.BigNumber.from(-1));
    expect(updateInPercentage).toEqual(ethers.BigNumber.from(0.8 * HUNDRED_PERCENT));
  });
});

describe('checkUpdateCondition', () => {
  const providerUrl = 'http://127.0.0.1:8545/';
  const beaconId = '0x2ba0526238b0f2671b7981fd7a263730619c8e849a528088fd4a92350a8c2f2c';
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const voidSigner = new ethers.VoidSigner(ethers.constants.AddressZero, provider);

  let readDataFeedWithIdSpy: jest.Mock;
  let dapiServerMock: {
    connect(_signerOrProvider: ethers.Signer | ethers.providers.Provider | string): typeof dapiServerMock;
    readDataFeedWithId: jest.Mock;
  };

  beforeEach(() => {
    const readDataFeedWithIdMock = (_beaconId: string) => Promise.resolve([ethers.BigNumber.from(500)]);
    readDataFeedWithIdSpy = jest.fn().mockImplementation(readDataFeedWithIdMock);
    dapiServerMock = {
      connect(_signerOrProvider: ethers.Signer | ethers.providers.Provider | string) {
        return this;
      },
      readDataFeedWithId: readDataFeedWithIdSpy,
    };
  });

  it('reads dapiserver value and checks the threshold condition to be true for increase', async () => {
    const checkUpdateConditionResult = await checkUpdateCondition(voidSigner, dapiServerMock as any, beaconId, 10, 560);

    expect(readDataFeedWithIdSpy).toHaveBeenNthCalledWith(1, beaconId);
    expect(checkUpdateConditionResult).toEqual(true);
  });

  it('reads dapiserver value and checks the threshold condition to be true for decrease', async () => {
    const readDataFeedWithIdOnceSpy = jest
      .fn()
      .mockImplementationOnce(() => Promise.resolve([ethers.BigNumber.from(400)]));
    const checkUpdateConditionResult = await checkUpdateCondition(
      voidSigner,
      {
        ...dapiServerMock,
        functions: { readDataFeedWithId: readDataFeedWithIdOnceSpy },
        readDataFeedWithId: readDataFeedWithIdOnceSpy,
      } as any,
      beaconId,
      10,
      450
    );

    expect(readDataFeedWithIdOnceSpy).toHaveBeenNthCalledWith(1, beaconId);
    expect(checkUpdateConditionResult).toEqual(true);
  });

  it('reads dapiserver value and checks the threshold condition to be false', async () => {
    const checkUpdateConditionResult = await checkUpdateCondition(voidSigner, dapiServerMock as any, beaconId, 10, 480);

    expect(readDataFeedWithIdSpy).toHaveBeenNthCalledWith(1, beaconId);
    expect(checkUpdateConditionResult).toEqual(false);
  });
});
