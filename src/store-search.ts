// letters and digits only, lower case: "H-E-B", "heb" and "H E B" all become "heb"
const squash = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '');

// whether a store's name contains what was typed, however loosely it was typed
export function storeMatches(name: string | null, typed: string) {
	const wanted = squash(typed);
	if (!wanted) return true;
	return name !== null && squash(name).includes(wanted);
}
