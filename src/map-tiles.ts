// Tiles the proxy will fetch: street level to city level, and only over the US (Alaska and Hawaii
// included), so it can never be used as a free tile server for the whole world.
export const MIN_ZOOM = 9;
export const MAX_ZOOM = 18;
const US = { north: 72, south: 18, west: -180, east: -64 };

const lngOf = (x: number, z: number) => (x / 2 ** z) * 360 - 180;
const latOf = (y: number, z: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** z))) * 180) / Math.PI;

export function tileAllowed(z: number, x: number, y: number) {
	if (![z, x, y].every(Number.isInteger) || z < MIN_ZOOM || z > MAX_ZOOM) return false;
	const size = 2 ** z;
	if (x < 0 || y < 0 || x >= size || y >= size) return false;
	// the tile's corners must overlap the US box
	return lngOf(x + 1, z) > US.west && lngOf(x, z) < US.east && latOf(y + 1, z) < US.north && latOf(y, z) > US.south;
}
