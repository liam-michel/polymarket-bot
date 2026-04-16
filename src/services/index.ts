import { createMarketService, type MarketService } from './market.js';
import type { GammaMarketApiClient } from '~/gamma/market/market.js';
import type { Repo, Storage } from '~/storage/index.js';

export type Services = {
  market: MarketService;
};

type CreateServicesDeps = {
  repo: Repo;
  gammaApiClient: GammaMarketApiClient;
};

export function createServices(deps: CreateServicesDeps): Services {
  return {
    market: createMarketService(deps),
  };
}

export function createTransactionRunner(
  storage: Storage,
  gammaApiClient: GammaMarketApiClient,
) {
  return <T>(callback: (services: Services) => Promise<T>) =>
    storage.transaction((repo) =>
      callback(createServices({ repo, gammaApiClient })),
    );
}
