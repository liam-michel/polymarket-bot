import { createMarketService, type MarketService } from './market.js';
import { DataApiClient } from '~/data-api/index.js';
import type { GammaMarketApiClient } from '~/gamma/market/index.js';
import type { Repo, Storage } from '~/storage/index.js';

export type Services = {
  market: MarketService;
};

type CreateServicesDeps = {
  repo: Repo;
  gammaApiClient: GammaMarketApiClient;
  dataApiClient: DataApiClient;
};

type createTransactionRunnerDeps = {
  storage: Storage;
  gammaApiClient: GammaMarketApiClient;
  dataApiClient: DataApiClient;
};
export function createServices(deps: CreateServicesDeps): Services {
  return {
    market: createMarketService(deps),
  };
}

export function createTransactionRunner(deps: createTransactionRunnerDeps) {
  const { storage, gammaApiClient, dataApiClient } = deps;
  return <T>(callback: (services: Services) => Promise<T>) =>
    storage.transaction((repo) =>
      callback(createServices({ repo, gammaApiClient, dataApiClient })),
    );
}
