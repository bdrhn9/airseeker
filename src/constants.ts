import { LogOptions } from '@api3/airnode-utilities';
import { ethers } from 'ethers';

export const INFINITE_RETRIES = 100_000;
export const GATEWAY_TIMEOUT_MS = 5_000;
export const PROVIDER_TIMEOUT_MS = 5_000;
export const RANDOM_BACKOFF_MIN_MS = 0;
export const RANDOM_BACKOFF_MAX_MS = 2_500;
export const PRIORITY_FEE_IN_WEI = 3_120_000_000;
// The Base Fee to Max Fee multiplier
export const BASE_FEE_MULTIPLIER = 2;
export const PROTOCOL_ID = '5';
// The default gas limit for transactions
export const GAS_LIMIT = 500_000;
// Solidity type(int224).min
export const INT224_MIN = ethers.BigNumber.from(2).pow(ethers.BigNumber.from(223)).mul(ethers.BigNumber.from(-1));
// Solidity type(int224).max
export const INT224_MAX = ethers.BigNumber.from(2).pow(ethers.BigNumber.from(223)).sub(ethers.BigNumber.from(1));
export const NO_BEACONS_EXIT_CODE = 1;
export const NO_FETCH_EXIT_CODE = 2;

export const DEFAULT_LOG_OPTIONS: LogOptions = {
  format: 'plain',
  // TODO: The log level is hardcoded for now, but it should be overridable from airseeker.json
  level: 'DEBUG',
  meta: {},
};
