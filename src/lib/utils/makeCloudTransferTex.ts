import * as THREE from 'three';

export function makeCloudTransferTex() {
	const width = 32;
	const height = 1;
	const size = width * height;
	const data = new Uint8Array(4 * size);

	const rstart = 0;
	const rend = 28;
	const astart = 0;
	const aend = 32;
	const imid = 16;
	const amid = 16;

	for (let i = 0; i < width; i += 1) {
		const r = rstart + (i * (rend - rstart)) / (width - 1);
		let alpha = 0;
		if (i < imid) {
			alpha = astart + (i * (amid - astart)) / (imid - 1);
		} else {
			alpha = amid + ((i - imid) * (aend - amid)) / (width - imid);
		}

		data[4 * i] = r;
		data[4 * i + 1] = 0;
		data[4 * i + 2] = r;
		data[4 * i + 3] = alpha;
	}
	// console.log(data);

	const transferTexture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
	transferTexture.wrapS = THREE.ClampToEdgeWrapping;
	transferTexture.wrapT = THREE.ClampToEdgeWrapping;
	transferTexture.needsUpdate = true;

	return transferTexture;
}
