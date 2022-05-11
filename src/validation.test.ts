import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import { ZodError } from 'zod';
import { Config, configSchema } from './validation';
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

it('fails if chain is missing DapiServer contract address', () => {
  const config: Config = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'config', 'airseeker.example.json'), 'utf8')
  );
  delete config.chains['1'].contracts['DapiServer'];
  const interpolatedConfig = interpolateSecrets(config, envVariables);

  expect(() => configSchema.parse(interpolatedConfig)).toThrow(
    new ZodError([
      {
        code: 'custom',
        message: 'DapiServer contract address is missing',
        path: ['chains', '1', 'contracts'],
      },
    ])
  );
});

it('fails if derived beaconId is different to beacons.<beaconId>', () => {
  const config: Config = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'config', 'airseeker.example.json'), 'utf8')
  );
  const firstBeaconId = Object.keys(config.beacons)[0];
  const randomBeaconId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
  config.beacons[randomBeaconId] = config.beacons[firstBeaconId];
  const interpolatedConfig = interpolateSecrets(config, envVariables);

  expect(() => configSchema.parse(interpolatedConfig)).toThrow(
    new ZodError([
      {
        code: 'custom',
        message: `Beacon ID "${randomBeaconId}" is invalid`,
        path: ['beacons', randomBeaconId],
      },
    ])
  );
});

it('fails if derived templateId is different to templates.<templateId>', () => {
  const config: Config = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'config', 'airseeker.example.json'), 'utf8')
  );
  const [firstTemplateId, firstTemplateValues] = Object.entries(config.templates)[0];
  const randomEndpointId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
  firstTemplateValues.endpointId = randomEndpointId;
  const interpolatedConfig = interpolateSecrets(config, envVariables);

  expect(() => configSchema.parse(interpolatedConfig)).toThrow(
    new ZodError([
      {
        code: 'custom',
        message: `Template ID "${firstTemplateId}" is invalid`,
        path: ['templates', firstTemplateId],
      },
    ])
  );
});

it('fails if beacons.<beaconId>.airnode is not defined in gateways', () => {
  const config: Config = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'config', 'airseeker.example.json'), 'utf8')
  );
  const [firstBeaconId, firstBeaconValue] = Object.entries(config.beacons)[0];
  delete config.gateways[firstBeaconValue.airnode];
  const interpolatedConfig = interpolateSecrets(config, envVariables);

  expect(() => configSchema.parse(interpolatedConfig)).toThrow(
    new ZodError([
      {
        code: 'custom',
        message: `Gateway "${firstBeaconValue.airnode}" is not defined in the config.gateways object`,
        path: ['beacons', firstBeaconId, 'airnode'],
      },
    ])
  );
});

it('fails if beacons.<beaconId>.templateId is not defined in templates', () => {
  const config: Config = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'config', 'airseeker.example.json'), 'utf8')
  );
  const [firstBeaconId, firstBeaconValue] = Object.entries(config.beacons)[0];
  delete config.templates[firstBeaconValue.templateId];
  const interpolatedConfig = interpolateSecrets(config, envVariables);

  expect(() => configSchema.parse(interpolatedConfig)).toThrow(
    new ZodError([
      {
        code: 'custom',
        message: `Template ID "${firstBeaconValue.templateId}" is not defined in the config.templates object`,
        path: ['beacons', firstBeaconId, 'templateId'],
      },
    ])
  );
});

it('fails if triggers.beaconUpdates.<chainId> is not defined in chains', () => {
  const config: Config = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'config', 'airseeker.example.json'), 'utf8')
  );
  const [firstChainId, firstChainValues] = Object.entries(config.triggers.beaconUpdates)[0];
  const randomChainId = '123';
  config.triggers.beaconUpdates[randomChainId] = firstChainValues;
  delete config.triggers.beaconUpdates[firstChainId];
  const interpolatedConfig = interpolateSecrets(config, envVariables);

  expect(() => configSchema.parse(interpolatedConfig)).toThrow(
    new ZodError([
      {
        code: 'custom',
        message: `Chain ID "${randomChainId}" is not defined in the config.chains object`,
        path: ['triggers', 'beaconUpdates', randomChainId],
      },
    ])
  );
});

it('fails if triggers.beaconUpdates.<chainId>.<beaconId> is not defined in beacons', () => {
  const config: Config = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'config', 'airseeker.example.json'), 'utf8')
  );
  const randomBeaconId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
  const firstChainId = Object.keys(config.triggers.beaconUpdates)[0];
  const firstSponsorAddress = Object.keys(config.triggers.beaconUpdates[firstChainId])[0];
  config.triggers.beaconUpdates[firstChainId][firstSponsorAddress].beacons[0].beaconId = randomBeaconId;
  const interpolatedConfig = interpolateSecrets(config, envVariables);

  expect(() => configSchema.parse(interpolatedConfig)).toThrow(
    new ZodError([
      {
        code: 'custom',
        message: `Beacon ID "${randomBeaconId}" is not defined in the config.beacons object`,
        path: ['triggers', 'beaconUpdates', firstChainId, firstSponsorAddress, 'beacons', 0],
      },
    ])
  );
});
