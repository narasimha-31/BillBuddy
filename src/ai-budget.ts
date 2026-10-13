// Exact Token Factory ids, catalog prices (USD per 1M tokens) and how long to wait for an answer.
// GLM normally reads a receipt in 3 to 9 seconds, so 20 seconds means it is down or overloaded
// and the backup gets its turn.
export const MODELS = {
	vision: { id: 'zai-org/GLM-5.3-Flash', input: 0.15, output: 0.5, seconds: 20 },
	visionBackup: { id: 'deepseek-ai/DeepSeek-V4.1-Flash', input: 0.3, output: 1.2, seconds: 45 },
	names: { id: 'nvidia/Nemotron-3_5-Lightning', input: 0.06, output: 0.24, seconds: 45 }
} as const;

export type ModelRole = keyof typeof MODELS;

// $1 a day across everyone: about a thousand receipts, and a hard ceiling on the credits
export const DAILY_CAP_MICROS = 1_000_000;

// a price per 1M tokens times tokens is exactly millionths of a dollar; round up so we never undercount
export function costMicros(role: ModelRole, usage: { prompt_tokens?: number; completion_tokens?: number }) {
	const { input, output } = MODELS[role];
	return Math.ceil((usage.prompt_tokens ?? 0) * input + (usage.completion_tokens ?? 0) * output);
}

// 5 cents a day per person, about 40 to 60 receipts. Counted from the call log, which people
// cannot touch, so deleting receipts and adding them again never buys more reads.
export const USER_DAILY_CAP_MICROS = 50_000;

export function overDailyCap(spentTodayMicros: number) {
	return spentTodayMicros >= DAILY_CAP_MICROS;
}

export function overUserCap(userSpentTodayMicros: number) {
	return userSpentTodayMicros >= USER_DAILY_CAP_MICROS;
}
