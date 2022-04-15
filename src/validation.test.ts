import fs from 'fs';
import path from 'path';
import { configSchema } from './validation';
import { interpolateSecrets } from './config';

const envVariables = {
  AIRSEEKER_WALLET_MNEMONIC: 'achieve climb couple wait accident symbol spy blouse reduce foil echo label',
  CP_SELF_HOSTED_MAINNET_URL: 'https://some.self.hosted.mainnet.url',
  CP_INFURA_MAINNET_URL: 'https://some.infura.mainnet.url',
  CP_INFURA_ROPSTEN_URL: 'https://some.influra.ropsten.url',
  HTTP_SIGNED_DATA_GATEWAY_KEY: '18e06827-8544-4b0f-a639-33df3b5bc62f',
  HTTP_SIGNED_DATA_GATEWAY_URL: 'https://some.http.signed.data.gateway.url/',
};

it('successfully parses example configuration', () => {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'airseeker.example.json'), 'utf8'));
  const interpolatedConfig = interpolateSecrets(config, envVariables);

  expect(() => configSchema.parse(interpolatedConfig)).not.toThrow();
});
