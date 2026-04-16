import type {
  GammaMarket,
  GammaMarketApiClient,
} from '~/gamma/market/market.js';
import type { Repo } from '~/storage/index.js';
import type { CreateMarketInput } from '~/storage/market.js';
import type { Models } from '~/storage/models.js';

type MarketServiceDeps = {
  repo: Repo;
  gammaApiClient: GammaMarketApiClient;
};

export type MarketService = {
  importMarket: (conditionId: string) => Promise<Models['Market']>;
};

function mapGammaMarketToCreateMarketInput(
  market: GammaMarket,
): CreateMarketInput {
  return {
    condition_id: market.conditionId,
    question: market.question,
    category: null,
    outcome_a: market.outcomes[0],
    outcome_b: market.outcomes[1],
    status: market.active && !market.closed ? 'ACTIVE' : 'CLOSED',
    outcome: null,
    closes_at: new Date(market.endDate),
    resolved_at: null,
    volume_usd: market.volume,
  };
}

function importMarket(
  repo: Repo,
  gammaApiClient: GammaMarketApiClient,
): MarketService['importMarket'] {
  return async function (conditionId) {
    const market = await gammaApiClient.getMarketById(conditionId);

    if (!market) {
      throw new Error(
        `Market with condition ID "${conditionId}" was not found in Gamma`,
      );
    }

    return repo.market.upsertMarket(mapGammaMarketToCreateMarketInput(market));
  };
}

export function createMarketService(deps: MarketServiceDeps): MarketService {
  const { repo, gammaApiClient } = deps;
  return {
    importMarket: importMarket(repo, gammaApiClient),
  };
}
