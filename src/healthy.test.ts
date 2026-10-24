import { describe, expect, it } from 'vitest';
import { nextPick, sourceName, type HealthyFood } from './healthy';

const food = (name: string, diet: HealthyFood['diet'], category = 'Produce'): HealthyFood => ({ name, why: 'Good for you.', diet, category, source_url: 'https://www.mayoclinic.org/x', source: 'Mayo Clinic' });
const foods = [food('Lentils', 'vegan', 'Pantry'), food('Broccoli', 'vegan'), food('Greek yogurt', 'vegetarian', 'Dairy & eggs'), food('Salmon', 'meat', 'Meat & seafood')];

describe('nextPick', () => {
	it('keeps to the diet', () => {
		expect(nextPick(foods, 'vegan', [], ['Broccoli', 'Lentils'], {})).toBeNull();
		expect(nextPick(foods, 'vegetarian', [], ['Broccoli', 'Lentils'], {})?.name).toBe('Greek yogurt');
		expect(nextPick(foods, 'meat', [], ['Broccoli', 'Lentils', 'Greek yogurt'], {})?.name).toBe('Salmon');
	});

	it('skips what they already buy, whatever the receipt called it', () => {
		expect(nextPick(foods, 'vegan', ['Red lentils'], [], { Produce: 500, Pantry: 0 })?.name).toBe('Broccoli');
	});

	it('starts from the aisle they spend least on', () => {
		expect(nextPick(foods, 'meat', [], [], { Produce: 4000, Pantry: 900, 'Dairy & eggs': 0, 'Meat & seafood': 2000 })?.name).toBe('Greek yogurt');
	});

	it('never repeats one already shown', () => {
		expect(nextPick(foods, 'vegan', [], ['lentils'], { Pantry: 0, Produce: 10 })?.name).toBe('Broccoli');
	});
});

describe('sourceName', () => {
	it('names the sites we search, and falls back to the address', () => {
		expect(sourceName('https://www.mayoclinic.org/healthy-lifestyle/x')).toBe('Mayo Clinic');
		expect(sourceName('https://pmc.ncbi.nlm.nih.gov/articles/PMC1')).toBe('National Institutes of Health');
		expect(sourceName('https://www.example.org/a')).toBe('example.org');
	});
});
