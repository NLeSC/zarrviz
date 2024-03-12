import * as THREE from 'three';
import { get } from 'svelte/store';
import { volumeSizes } from '../stores/allSlices.store';
import { boxes } from './boxSetup';


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

export function updateMaterial({ variable, dataUint8 }) {
  const localBox = boxes[variable];


  if (!localBox) { return }
  const uniforms = localBox.material.uniforms;
  const sizes = get(volumeSizes)[variable];
  let volumeTexture = null;

  //
  // Dispose of the old texture to free up memory.
  //
  if (uniforms?.volumeTex.value !== null) {
    uniforms.volumeTex.value.dispose();
  }

  switch (variable) {
    case 'ql':
      volumeTexture = new THREE.Data3DTexture(dataUint8, sizes[0], sizes[1], sizes[2]);

      volumeTexture.minFilter = THREE.LinearFilter; // Better for volume rendering.// TODO: is this the best filter?
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
      break;

    case 'qr':
      volumeTexture = new THREE.Data3DTexture(dataUint8, sizes[0] / 8, sizes[1] / 8, sizes[2] / 8);
      volumeTexture.minFilter = THREE.NearestFilter; // TODO: is this the best filter?
      volumeTexture.magFilter = THREE.NearestFilter;
      uniforms.dataScale.value = qrScale;
      uniforms.dtScale.value = dtScale;
      uniforms.alphaNorm.value = 2.0;
      uniforms.finalGamma.value = finalGamma;
      break;

    case 'thetavmix':
      // volumeTexture = new THREE.DataTexture(dataUint8, 1000, 1000);
      volumeTexture = new THREE.DataTexture(dataUint8, sizes[0], sizes[1]);
      console.log('🎹 volumeTexture', volumeTexture);
      // const material = new THREE.MeshBasicMaterial({ map: volumeTexture });

      // boxes.thetavmix.material = new THREE.MeshBasicMaterial({ map: volumeTexture });
      console.log('🎹 ', JSON.stringify(volumeTexture));

      console.log('thetavmix', uniforms.volumeTex);




      // Create an array with your pixel data
      // For simplicity, we're creating a texture with 2x2 pixels, each pixel has RGBA values, so we need 16 values
      const data = new Uint8Array([
        255,
        0,
        0,
        255, // Red
        0,
        255,
        0,
        255, // Green
        0,
        0,
        255,
        255, // Blue
        255,
        255,
        0,
        255 // Yellow
      ]);

      // Create the DataTexture
      volumeTexture = new THREE.DataTexture(data, 2, 2, THREE.RGBAFormat);
      // const texture = new THREE.DataTexture(data, 2, 2, THREE.RGBAFormat);
      // texture.needsUpdate = true; // Tell Three.js to update the texture
      //
      // Now you can use this texture in a material and apply it to a mesh
      // const material = new THREE.MeshBasicMaterial({ map: texture });
      // const geometry = new THREE.PlaneGeometry(1, 1);
      // const mesh = new THREE.Mesh(geometry, material);
      //
      // Add your mesh to the scene, and you're done!
      // scene.add(mesh);










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
