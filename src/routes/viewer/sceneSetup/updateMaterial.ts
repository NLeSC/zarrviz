import * as THREE from 'three';
import { get, writable } from 'svelte/store';
import { volumeSizes, voxelSizes } from '../stores/allSlices.store';
import { boxes } from './boxSetup';

export const currentTimeIndex = writable(0);
export const currentStepIndex = writable(0);

// Be caruful with these valies, they can clip the data in the 3D scene
const dtScale: number = 0.8;
const ambientFactor: number = 0.0;
const solarFactor: number = 0.8;
const qlScale: number = 0.00446;
const qrScale: number = 0.0035;
const gHG: number = 0.6;
const dataEpsilon: number = 1e-10;
const bottomColor: number[] = [0.0, 0.0005, 0.0033];
const bottomHeight: number = 675.0;
const finalGamma = 6.0;

const dTSnapshot = 10.0;
const wind = [-10.5, -4.7];


export function refreshMaterial({variable, index, maxIndex}) {
  const localBox = boxes[variable];
  if (!localBox) { return }
  const cellSizes = get(voxelSizes)[variable];
  const numCells = get(volumeSizes)[variable];
  const deltaX = wind[0] * (index / maxIndex) * dTSnapshot / (cellSizes[0] * numCells[0]);
  const deltaY = wind[1] * (index / maxIndex) * dTSnapshot / (cellSizes[1] * numCells[1]);
  const uniforms = localBox.material.uniforms;
  uniforms.displacement.value = new THREE.Vector3(deltaX, deltaY, 0.0);
}

export function updateMaterial({ variable, dataUint8, coarseData = null }) {
  const localBox = boxes[variable];


  if (!localBox) { return }
  const uniforms = localBox.material.uniforms;
  const sizes = get(volumeSizes)[variable];
  let volumeTexture = null;
  let coarseVolumeTexture = null;

  //
  // Dispose of the old texture to free up memory.
  //
  if (uniforms?.volumeTex.value !== null) {
    uniforms.volumeTex.value.dispose();
  }
  const s0 = Math.ceil(sizes[0] / 8);
  const s1 = Math.ceil(sizes[1] / 8);
  const s2 = Math.ceil(sizes[2] / 8);
  switch (variable) {
    case 'ql':
      volumeTexture = new THREE.Data3DTexture(dataUint8, sizes[0], sizes[1], sizes[2]);
      volumeTexture.minFilter = THREE.LinearFilter; // Better for volume rendering.
      volumeTexture.magFilter = THREE.LinearFilter;
      uniforms.dataScale.value = qlScale;
      uniforms.dtScale.value = dtScale;
      uniforms.ambientFactor.value = ambientFactor;
      uniforms.solarFactor.value = solarFactor;
      uniforms.gHG.value = gHG;
      uniforms.dataEpsilon.value = dataEpsilon;
      uniforms.bottomColor.value = bottomColor;
      uniforms.bottomHeight.value = bottomHeight;
      uniforms.finalGamma.value = finalGamma;
      uniforms.displacement.value = new THREE.Vector3(0.0, 0.0, 0.0);
      break;

    case 'qr':
      if (uniforms?.coarseVolumeTex.value !== null) {
        uniforms.coarseVolumeTex.value.dispose();
      }
    
      volumeTexture = new THREE.Data3DTexture(dataUint8, sizes[0], sizes[1], sizes[2]);
      volumeTexture.minFilter = THREE.NearestFilter;
      volumeTexture.magFilter = THREE.NearestFilter;
      uniforms.dataScale.value = qrScale;
      uniforms.dtScale.value = dtScale;
      uniforms.alphaNorm.value = 2.0;
      uniforms.finalGamma.value = finalGamma;

      coarseVolumeTexture = new THREE.Data3DTexture(coarseData, s0, s1, s2);
      coarseVolumeTexture.format = THREE.RedFormat;
      coarseVolumeTexture.minFilter = THREE.NearestFilter;
      coarseVolumeTexture.magFilter = THREE.NearestFilter;
      coarseVolumeTexture.type = THREE.UnsignedByteType;
      coarseVolumeTexture.generateMipmaps = false; // Saves memory.
      coarseVolumeTexture.needsUpdate = true;
      uniforms.coarseVolumeTex.value = coarseVolumeTexture;
      uniforms.displacement.value = new THREE.Vector3(0.0, 0.0, 0.0);
      break;

    case 'thetavmix':
      volumeTexture = new THREE.DataTexture(dataUint8, sizes[0], sizes[1]);
      uniforms.displacement.value = new THREE.Vector2(0.0, 0.0);
      break;
  }
  //
  // Used by all the shaders
  //
  volumeTexture.format = THREE.RedFormat;
  volumeTexture.type = THREE.UnsignedByteType;
  volumeTexture.generateMipmaps = false; // Saves memory.
  volumeTexture.needsUpdate = true;

  //
  // Apply the updated material uniforms with new texture and parameters.
  //
  uniforms.volumeTex.value = volumeTexture;
}
