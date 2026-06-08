export interface MlRecommendationInput {
  inventory: number;
  backlog?: number;
  pipeline?: number;
  month: number;
  avg_demand: number;
  category: string;
  min_stock?: number;
  max_order?: number;
  unit_price?: number;
}

export interface MlRecommendationResult {
  recommended_order: number;
  policy: 'rl' | 'baseline';
  confidence: number;
  inventory: number;
  backlog: number;
  pipeline: number;
  stock_position: number;
  month: number;
  avg_demand: number;
  category: string;
  reason: string;
}

const ML_SERVICE_URL = process.env.ML_SERVICE_URL?.trim() || 'http://127.0.0.1:8001';

export async function getMlRecommendation(input: MlRecommendationInput): Promise<MlRecommendationResult | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(`${ML_SERVICE_URL}/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const message = await response.text();
      console.warn(`[ML] service returned ${response.status}: ${message}`);
      return null;
    }

    return await response.json() as MlRecommendationResult;
  } catch (error) {
    console.warn('[ML] service unavailable, fallback backend logic will be used:', error instanceof Error ? error.message : error);
    return null;
  }
}
