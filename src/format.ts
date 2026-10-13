export const money = (cents: number | null) =>
	cents === null ? '' : `${cents < 0 ? '−' : ''}$${(Math.abs(cents) / 100).toFixed(2)}`;

// noon UTC and formatted in UTC, so a purchase date never shifts a day between server and browser
const asDate = (iso: string) => new Date(`${iso}T12:00:00Z`);

export const longDay = (iso: string | null) =>
	iso ? asDate(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : 'Date not printed';

export const shortDay = (iso: string | null) =>
	iso ? asDate(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : 'No date';
