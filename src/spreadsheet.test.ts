import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { workbook } from './spreadsheet';

describe('workbook', () => {
	const file = unzipSync(
		workbook([
			{ name: 'Items', rows: [['Item', 'Paid'], ['Milk & eggs <2>', 3.5], ['=SUM(A1)', null]], money: [1] },
			{ name: 'My list', rows: [['Item'], ['Okra']] }
		])
	);
	const sheet = strFromU8(file['xl/worksheets/sheet1.xml']);

	it('has a part per sheet and names them', () => {
		expect(Object.keys(file)).toContain('xl/worksheets/sheet2.xml');
		expect(strFromU8(file['xl/workbook.xml'])).toContain('<sheet name="My list" sheetId="2" r:id="rId2"/>');
	});

	it('escapes text, formats money and leaves blanks out', () => {
		expect(sheet).toContain('<c r="A2" t="inlineStr"><is><t xml:space="preserve">Milk &amp; eggs &lt;2&gt;</t></is></c>');
		expect(sheet).toContain('<c r="B2" s="1"><v>3.5</v></c>');
		expect(sheet).not.toContain('r="B3"');
	});

	it('keeps formula-looking text as text', () => {
		expect(sheet).toContain('<c r="A3" t="inlineStr"><is><t xml:space="preserve">=SUM(A1)</t></is></c>');
	});

	it('drops characters XML refuses', () => {
		const odd = strFromU8(unzipSync(workbook([{ name: 'S', rows: [['a\u0001b']] }]))['xl/worksheets/sheet1.xml']);
		expect(odd).toContain('>ab<');
	});
});
