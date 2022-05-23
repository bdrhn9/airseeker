# Airseeker

A tool to update a beacons with signed responses from Airnode's gateway

# Installation

```sh
yarn install
```

## Build

```sh
yarn build
```

## Configuration

You need to create a configuration file `config/airseeker.json`. Take a look at `config/airseeker.example.json` for an
example configuration file. You can use string interpolation (with `${VAR}` syntax) for providing secrets. Secrets are
read from the environment variables. When running locally, either just with `yarn start` or via process manager, secrets
are automatically loaded from `config/secrets.env` file. Take a look at `config/secrets.example.env` for an example
secrets file.

### Gas oracle options

- `fallbackGasPrice`: (required) - The gas price to use for beacon update transactions if fetching both blocks and
  fallback gas prices fails. Defined as an object, e.g. `{"value": 10, "unit": "gwei"}`.
- `maxTimeout`: (optional) - The maximum timeout (in seconds) for fetching a block or fallback gas price (defaults to
  `3`).
- `recommendedGasPriceMultiplier`: (optional) - The multiplier to apply to the fallback gas price reported by the
  provider.

- `latestGasPriceOptions`: (optional) - An object containing the following configuration options for calculating a gas
  price:
  - `percentile`: (optional) - The percentile of gas prices to return from a block (defaults to `60`).
  - `minTransactionCount`: (optional) - The minimum amount of transactions required in a block to use for calculating a
    gas price percentile (defaults to `10`).
  - `pastToCompareInBlocks`: (optional) - The number of blocks to look back for the reference block (defaults to `20`).
  - `maxDeviationMultiplier`: (optional) - The maximum deviation multiplier of the latest block gas price percentile
    compared to the reference block gas price percentile (defaults to `2`). Used to protect against large gas price
    spikes.

## Usage

```sh
yarn start
```

### Running with process manager

You can use [PM2](https://pm2.keymetrics.io/) process manager to run Airseeker. PM2 is also used in the
[Dockerized](#docker) version.

```sh
# Starting Airseeker
yarn pm2:start
# PM2 status
yarn pm2:status
# Logs
yarn pm2:logs
# Stopping Airseeker
yarn pm2:stop
```

## Docker

The container is running the Airseeker with the [PM2](https://pm2.keymetrics.io/) process manager and running a cronjob
taking care of log rotation with [logrotate](https://linux.die.net/man/8/logrotate). We're using a default
[generated logrotate configuration from PM2](https://pm2.keymetrics.io/docs/usage/log-management/#setting-up-a-native-logrotate).

### Build

```sh
yarn docker:build
```

Resulting image is named `api3/airseeker`.

## Deploy

Airseeker can be deployed to an ECS AWS cluster using the terraform recipes located in the `terraform` directory.

Terraform will build an intermediate docker image based on another image previously built using the `docker/Dockerfile`
file. This intermediate image will have the config file baked into it and it will then be pushed to an ECR repository.

### Prerequisites

- [Docker](https://docs.docker.com/)
- [Terraform](https://www.terraform.io/)

### Steps to deploy to AWS

To run deploy Airseeker then you will need to cd into the `terraform` directory and run the following commands:

```sh
terraform init
terraform apply -var 'app_environment=dev'
Alternatively you can provide the `aws_region`, `app_environment`, `app_docker_image`, etc as arguments to the `terraform apply` command.
```

### Steps to remove from AWS

Then to destroy the deployment you can run the following command:

```sh
terraform destroy -var 'app_environment=dev' -auto-approve
```
