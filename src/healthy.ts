import { names } from './recalls';

export type Diet = 'vegan' | 'vegetarian' | 'meat';
// the nine major allergens US labels must name
export const ALLERGENS = ['milk', 'eggs', 'fish', 'shellfish', 'tree nuts', 'peanuts', 'wheat', 'soy', 'sesame'] as const;
export type Allergen = (typeof ALLERGENS)[number];
export type HealthyFood = { name: string; why: string; diet: Diet; category: string; allergens: Allergen[]; source_url: string; source: string };

// what each kind of eater can be offered
const FITS: Record<Diet, Diet[]> = { vegan: ['vegan'], vegetarian: ['vegan', 'vegetarian'], meat: ['vegan', 'vegetarian', 'meat'] };
export const suits = (food: HealthyFood, diet: Diet) => FITS[diet].includes(food.diet);

// "Lentils" is bought when a receipt said "Red lentils"; either name may hold the other
const boughtAlready = (food: string, bought: string[]) => bought.some((b) => names(b, food) || names(food, b));

// The next healthy thing to try: fits their diet, never on their receipts, never shown before. The
// aisle they spend least on comes first, so the pick fills what they are not eating. O(foods x bought).
export function nextPick(foods: HealthyFood[], diet: Diet, bought: string[], seen: string[], aisleCents: Record<string, number>) {
	const shown = new Set(seen.map((s) => s.toLowerCase()));
	const left = foods.filter((f) => suits(f, diet) && !shown.has(f.name.toLowerCase()) && !boughtAlready(f.name, bought));
	left.sort((a, b) => (aisleCents[a.category] ?? 0) - (aisleCents[b.category] ?? 0) || a.name.localeCompare(b.name));
	return left[0] ?? null;
}

// the site behind a fact, by name
const SOURCES: [RegExp, string][] = [
	[/(^|\.)hsph\.harvard\.edu$/, 'Harvard Nutrition Source'],
	[/(^|\.)myplate\.gov$/, 'MyPlate, USDA'],
	[/(^|\.)heart\.org$/, 'American Heart Association'],
	[/(^|\.)mayoclinic\.org$/, 'Mayo Clinic'],
	[/(^|\.)nih\.gov$/, 'National Institutes of Health'],
	[/(^|\.)eatright\.org$/, 'Academy of Nutrition and Dietetics'],
	[/(^|\.)cdc\.gov$/, 'CDC']
];
export function sourceName(url: string) {
	const host = new URL(url).hostname;
	return SOURCES.find(([pattern]) => pattern.test(host))?.[1] ?? host.replace(/^www\./, '');
}
