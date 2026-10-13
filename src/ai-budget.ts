// Exact Token Factory ids, catalog prices (USD per 1M tokens) and how long to wait for an answer.
// Qwen reads a receipt in about 5 seconds, so 30 seconds means it is down and the backup gets its turn.
export const MODELS = {
	// Qwen over DeepSeek and GLM: on real crumpled receipts it got every name and amount right
	// where DeepSeek shifted every amount by a line and invented items. GLM was down for hours.
	vision: { id: 'Qwen/Qwen3.8-27B', input: 0.45, output: 3, seconds: 30 },
	visionBackup: { id: 'deepseek-ai/DeepSeek-V4.1-Flash', input: 0.3, output: 1.2, seconds: 45 },
	// Super over Lightning: in a side-by-side on real receipt lines Lightning merged shampoo and chicken
	// thighs into "Chicken breast"; Super kept them apart. A wrong merge corrupts price comparisons.
	names: { id: 'nvidia/nemotron-3-super-120b-a12b', input: 0.3, output: 0.9, seconds: 45 }
} as const;

export type ModelRole = keyof typeof MODELS;

// 50 cents a day across everyone: about 100 receipts, and a hard ceiling on the credits
export const DAILY_CAP_MICROS = 500_000;

// a price per 1M tokens times tokens is exactly millionths of a dollar; round up so we never undercount
export function costMicros(role: ModelRole, usage: { prompt_tokens?: number; completion_tokens?: number }) {
	const { input, output } = MODELS[role];
	return Math.ceil((usage.prompt_tokens ?? 0) * input + (usage.completion_tokens ?? 0) * output);
}

// 5 cents a day per person, enough for the 10 receipts a day the database allows. Counted from the call log, which people
// cannot touch, so deleting receipts and adding them again never buys more reads.
export const USER_DAILY_CAP_MICROS = 50_000;

export function overDailyCap(spentTodayMicros: number) {
	return spentTodayMicros >= DAILY_CAP_MICROS;
}

export function overUserCap(userSpentTodayMicros: number) {
	return userSpentTodayMicros >= USER_DAILY_CAP_MICROS;
}
