import * as THREE from 'three';

/**
 * Creates a lookup texture for fast data value conversion
 * Replaces the expensive computation: dataScale * pow(dataEpsilon/dataScale, 1.0-v) - dataEpsilon
 *
 * @param dataScale - The data scale factor
 * @param dataEpsilon - The epsilon value for data conversion
 * @returns A 1D DataTexture containing precomputed conversion values
 */
export function makeDataConversionTex(dataScale: number, dataEpsilon: number) {
	const size = 256; // One entry for each possible uint8 value
	const data = new Float32Array(size);

	for (let i = 0; i < size; i++) {
		const v = i / 255.0; // Normalized value [0, 1]

		// Original calculation from shader:
		// float ql = (v == 0.0) ? 0.0 : (dataScale * pow(dataEpsilon/dataScale, 1.0-v) - dataEpsilon);
		if (v === 0.0) {
			data[i] = 0.0;
		} else {
			data[i] = dataScale * Math.pow(dataEpsilon / dataScale, 1.0 - v) - dataEpsilon;
		}
	}

	const texture = new THREE.DataTexture(
		data,
		size,
		1,
		THREE.RedFormat,
		THREE.FloatType
	);

	texture.minFilter = THREE.LinearFilter;
	texture.magFilter = THREE.LinearFilter;
	texture.wrapS = THREE.ClampToEdgeWrapping;
	texture.wrapT = THREE.ClampToEdgeWrapping;
	texture.needsUpdate = true;

	return texture;
}
