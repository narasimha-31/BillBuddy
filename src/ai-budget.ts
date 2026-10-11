// Exact Token Factory ids and catalog prices (USD per 1M tokens), kept in one place.
export const MODELS = {
	vision: { id: 'zai-org/GLM-5.3-Flash', input: 0.15, output: 0.5 },
	names: { id: 'nvidia/Nemotron-3_5-Lightning', input: 0.06, output: 0.24 }
} as const;

export type ModelRole = keyof typeof MODELS;

// $1 a day across everyone: about a thousand receipts, and a hard ceiling on the credits
export const DAILY_CAP_MICROS = 1_000_000;

// a price per 1M tokens times tokens is exactly millionths of a dollar; round up so we never undercount
export function costMicros(role: ModelRole, usage: { prompt_tokens?: number; completion_tokens?: number }) {
	const { input, output } = MODELS[role];
	return Math.ceil((usage.prompt_tokens ?? 0) * input + (usage.completion_tokens ?? 0) * output);
}

export function overDailyCap(spentTodayMicros: number) {
	return spentTodayMicros >= DAILY_CAP_MICROS;
}
