import { strToU8, zipSync, type Zippable } from 'fflate';

export type Cell = string | number | null;
export type Sheet = { name: string; rows: Cell[][]; money?: number[] };

// characters XML 1.0 refuses, which a receipt line could still carry
const UNSAFE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;
const xml = (text: string) =>
	text.replace(UNSAFE, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function column(index: number) {
	let name = '';
	for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
	return name;
}

function cell(value: Cell, ref: string, money: boolean) {
	if (value === null || value === '') return '';
	if (typeof value === 'number') return `<c r="${ref}"${money ? ' s="1"' : ''}><v>${value}</v></c>`;
	// inline text is never read as a formula, so "=SUM" from a receipt stays text
	return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
}

function sheetXml({ rows, money = [] }: Sheet) {
	const body = rows
		.map((row, r) => `<row r="${r + 1}">${row.map((value, c) => cell(value, `${column(c)}${r + 1}`, r > 0 && money.includes(c))).join('')}</row>`)
		.join('');
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" state="frozen"/></sheetView></sheetViews><sheetData>${body}</sheetData></worksheet>`;
}

// The smallest file Excel, Numbers and Google Sheets all open: inline text, one money format, the
// header row kept in view.
export function workbookFiles(sheets: Sheet[]): Zippable {
	const main = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
	const files: Zippable = {
		'[Content_Types].xml': strToU8(
			`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`
		),
		'_rels/.rels': strToU8(
			`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${main}/officeDocument" Target="xl/workbook.xml"/></Relationships>`
		),
		'xl/workbook.xml': strToU8(
			`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${main}"><sheets>${sheets.map((s, i) => `<sheet name="${xml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`
		),
		'xl/_rels/workbook.xml.rels': strToU8(
			`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${main}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="${main}/styles" Target="styles.xml"/></Relationships>`
		),
		'xl/styles.xml': strToU8(
			`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`
		)
	};
	sheets.forEach((sheet, i) => (files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(sheetXml(sheet))));
	return files;
}

export const workbook = (sheets: Sheet[]) => zipSync(workbookFiles(sheets));
