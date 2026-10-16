// Letters and digits only, lower case: "H-E-B", "heb" and "H E B" all become "heb".
// Each store's key is made once when the list loads; a keystroke only squashes what was typed
// and runs one substring scan over the keys.
export const storeKey = (text: string | null) => (text ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

// whether a store's key contains the squashed query; an empty query keeps everything
export const keyMatches = (key: string, wanted: string) => !wanted || (key !== '' && key.includes(wanted));
