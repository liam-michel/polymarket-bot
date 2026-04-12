import type {
  GammaMarket,
  GammaMarketApiClient,
} from '~/gamma/market/market.js';
import type { Repo } from '~/storage/index.js';
import type { CreateMarketInput } from '~/storage/market.js';
import type { Models } from '~/storage/models.js';

export type MarketService = {
  importMarket: (conditionId: string) => Promise<Models['Market']>;
};

function mapGammaMarketToCreateMarketInput(
  market: GammaMarket,
): CreateMarketInput {
  const outcomes: [string, string] = JSON.parse(market.outcomes);

  return {
    condition_id: market.conditionId,
    question: market.question,
    category: null,
    outcome_a: outcomes[0],
    outcome_b: outcomes[1],
    status: market.closed ? 'CLOSED' : market.active ? 'ACTIVE' : 'CLOSED',
    outcome: null,
    closes_at: new Date(market.endDate),
    resolved_at: null,
    volume_usd: market.volume,
  };
}

export function createMarketService(
  repo: Repo,
  gammaApiClient: GammaMarketApiClient,
): MarketService {
  return {
    importMarket: async (conditionId) => {
      const market = await gammaApiClient.getMarketById(conditionId);

      if (!market) {
        throw new Error(
          `Market with condition ID "${conditionId}" was not found in Gamma`,
        );
      }

      return repo.market.upsertMarket(
        mapGammaMarketToCreateMarketInput(market),
      );
    },
  };
}
