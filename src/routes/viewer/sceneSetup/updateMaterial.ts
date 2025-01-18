import * as THREE from 'three';
import { boxes } from './boxSetup';
import { getVariableMetaData, getVariableData } from '../stores/allSlices.store';

// Be caruful with these values, they can clip the data in the 3D scene
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
  const variableInfo = getVariableMetaData(variable);
  const xRange = variableInfo.upperBoundXYZ[0] - variableInfo.lowerBoundXYZ[0];
  const deltaX = wind[0] * (index / maxIndex) * dTSnapshot / xRange;
  const yRange = variableInfo.upperBoundXYZ[1] - variableInfo.lowerBoundXYZ[1];
  const deltaY = wind[1] * (index / maxIndex) * dTSnapshot / yRange;
  const uniforms = localBox.material.uniforms;
  uniforms.displacement.value = new THREE.Vector3(deltaX, deltaY, 0.0);
}

export async function updateMaterialFast({ variable, timeIndex }) {
//  const localBox = boxes[variable];
//  if (!localBox) { return }
//  const uniforms = localBox.material.uniforms;
//  await getVariableData(variable, timeIndex, 0);
//  uniforms.volumeTex.value.needsUpdate = true;
  await updateMaterial({ variable, timeIndex });
}


export async function updateMaterial({ variable, timeIndex }) {
  const localBox = boxes[variable];
  if (!localBox) { return }
  const uniforms = localBox.material.uniforms;
  const {data, shape}  = await getVariableData(variable, timeIndex, 0);
  let volumeTexture = null;
  let coarseVolumeTexture = null;

  //
  // Dispose of the old texture to free up memory.
  //
  if (uniforms?.volumeTex.value !== null) {
    uniforms.volumeTex.value.dispose();
  }
  const coarse = await getVariableData(variable, timeIndex, -1);
  switch (variable) {
    case 'ql':
      volumeTexture = new THREE.Data3DTexture(data, shape[0], shape[1], shape[2]);
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
      volumeTexture = new THREE.Data3DTexture(data, shape[0], shape[1], shape[2]);
      volumeTexture.minFilter = THREE.NearestFilter;
      volumeTexture.magFilter = THREE.NearestFilter;
      uniforms.dataScale.value = qrScale;
      uniforms.dtScale.value = dtScale;
      uniforms.alphaNorm.value = 2.0;
      uniforms.finalGamma.value = finalGamma;
      uniforms.displacement.value = new THREE.Vector3(0.0, 0.0, 0.0);
      if (coarse.data) {
        coarseVolumeTexture = new THREE.Data3DTexture(coarse.data, coarse.shape[0], coarse.shape[1], coarse.shape[2]);
        coarseVolumeTexture.format = THREE.RedFormat;
        coarseVolumeTexture.minFilter = THREE.NearestFilter;
        coarseVolumeTexture.magFilter = THREE.NearestFilter;
        coarseVolumeTexture.type = THREE.UnsignedByteType;
        coarseVolumeTexture.generateMipmaps = false; // Saves memory.
        coarseVolumeTexture.needsUpdate = true;
        uniforms.coarseVolumeTex.value = coarseVolumeTexture;
        }
      break;

    case 'thetavmix':
      volumeTexture = new THREE.DataTexture(data, shape[0], shape[1]);
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
