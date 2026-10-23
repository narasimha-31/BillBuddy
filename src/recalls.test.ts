import { describe, expect, it } from 'vitest';
import { isRecallNotice, names, plainTitle, recallsFor, type Recall } from './recalls';

const recall = (title: string): Recall => ({ url: `https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/${title.length}`, title, published_on: null, found_on: '2026-10-22' });

describe('names', () => {
	it('needs every word of the product, singular or plural', () => {
		expect(names('WinCo Foods Issues Allergy Alert on Undeclared Sesame in Hoagie Rolls', 'Hoagie roll')).toBe(true);
		expect(names('Brand X Recalls Diced Tomatoes', 'Roma tomatoes')).toBe(false);
		expect(names('Brand X Recalls Diced Tomatoes', 'Tomato')).toBe(true);
		expect(names('Fresh Berries Recalled', 'Strawberries')).toBe(false);
		expect(names('Mixed berries recalled', 'Mixed berry')).toBe(true);
	});

	it('never matches on small words alone', () => {
		expect(names('Recall of the 12 oz pack', 'The 12 oz pack')).toBe(false);
	});
});

describe('recallsFor', () => {
	it('keeps the notices that name something the shopper bought', () => {
		const found = recallsFor([recall('Safety Alert for Salmonella: Oysters from Virginia'), recall('Pharmacy Recalls Veterinary Medications')], ['Whole milk', 'Oysters']);
		expect(found.map((r) => r.product)).toEqual(['Oysters']);
	});
});

describe('isRecallNotice', () => {
	it('takes one notice page, not lists or devices', () => {
		expect(isRecallNotice('https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/winco-foods-llc-issues-allergy-alert-undeclared-sesame-hoagie-rolls')).toBe(true);
		expect(isRecallNotice('https://www.fda.gov/food/alerts-advisories-safety-information/safety-alert-salmonella-oysters-little-wicomico-river-virginia')).toBe(true);
		expect(isRecallNotice('https://www.fda.gov/food/recalls-outbreaks-emergencies/alerts-advisories-safety-information')).toBe(false);
		expect(isRecallNotice('https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfRES/res.cfm?id=223001')).toBe(false);
		expect(isRecallNotice('https://evil.example/safety/recalls-market-withdrawals-safety-alerts/x')).toBe(false);
	});
});

describe('headlines', () => {
	it('drops the site name', () => {
		expect(plainTitle('WinCo Foods Issues Allergy Alert | FDA')).toBe('WinCo Foods Issues Allergy Alert');
		expect(plainTitle("Egg prices have tumbled. Here's why - NPR")).toBe("Egg prices have tumbled. Here's why");
		expect(plainTitle('Ready-to-eat meals recalled')).toBe('Ready-to-eat meals recalled');
	});
});
