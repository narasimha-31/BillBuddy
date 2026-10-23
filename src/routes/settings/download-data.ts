import { zip, type Zippable } from 'fflate';

const AT_ONCE = 4;

function save(blob: Blob, name: string) {
	const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
	link.click();
	setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
}

async function fetched(url: string) {
	const answer = await fetch(url);
	if (!answer.ok) throw new Error(`download failed (${answer.status})`);
	return answer;
}

// The spreadsheet comes from the server; with photos, they are fetched straight from storage and
// zipped here, since a server answer is capped far below a year of photos.
export async function downloadData(withPhotos: boolean, progress: (done: number, of: number) => void) {
	const day = new Date().toISOString().slice(0, 10);
	const sheet = await (await fetched('/export')).blob();
	if (!withPhotos) return save(sheet, `billi-${day}.xlsx`);

	const links: { name: string; url: string }[] = await (await fetched('/export?photos')).json();
	const files: Zippable = { [`billi-${day}.xlsx`]: [new Uint8Array(await sheet.arrayBuffer()), { level: 0 }] };
	let done = 0;
	progress(done, links.length);
	const queue = [...links];
	await Promise.all(
		Array.from({ length: AT_ONCE }, async () => {
			for (let link = queue.shift(); link; link = queue.shift()) {
				files[`photos/${link.name}`] = [new Uint8Array(await (await fetched(link.url)).arrayBuffer()), { level: 0 }];
				progress(++done, links.length);
			}
		})
	);
	const bytes = await new Promise<Uint8Array>((resolve, reject) => zip(files, (problem, out) => (problem ? reject(problem) : resolve(out))));
	save(new Blob([bytes as BlobPart], { type: 'application/zip' }), `billi-${day}.zip`);
}
