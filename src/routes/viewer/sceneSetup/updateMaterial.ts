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
      volumeTexture.format = THREE.RedFormat;
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
      volumeTexture.format = THREE.RedFormat;
      volumeTexture.minFilter = THREE.NearestFilter; // TODO: is this the best filter?
      volumeTexture.magFilter = THREE.NearestFilter;
      uniforms.dataScale.value = qrScale;
      uniforms.dtScale.value = dtScale;
      uniforms.alphaNorm.value = 2.0;
      uniforms.finalGamma.value = finalGamma;
      break;

    case 'thetavmix':
      volumeTexture = new THREE.DataTexture(dataUint8, 1024, 1024);
      // volumeTexture = new THREE.DataTexture(dataUint8, sizes[0] / 2, sizes[1] / 2);
      volumeTexture.format = THREE.RedFormat;
      //     // console.log('🎹 volumeTexture', volumeTexture);
      //     // const material = new THREE.MeshBasicMaterial({ map: volumeTexture });
      //     // boxes.thetavmix.material = new THREE.MeshBasicMaterial({ map: volumeTexture });


      //     // Create the plane geometry
      //     // eslint-disable-next-line no-case-declarations
      //     // const geometry = new THREE.PlaneGeometry(1024, 1024);

      //     // Heatmap data
      //     // eslint-disable-next-line no-case-declarations
      //     const data = new Uint8Array(1024 * 1024); // Your heatmap data here
      //     // Fill data with example values between 0 and 250
      //     for (let i = 0; i < 1024 * 1024; i++) {
      //       data[i] = Math.floor(Math.random() * 250);
      //     }

      //     // Create a texture from the data
      //     // eslint-disable-next-line no-case-declarations
      //     const texture = new THREE.DataTexture(data, 1024, 1024, THREE.LuminanceFormat, THREE.UnsignedByteType);
      //     texture.needsUpdate = true;

      //     // Custom shader material
      //     // eslint-disable-next-line no-case-declarations
      //     const material = new THREE.ShaderMaterial({
      //       uniforms: {
      //         heatmapTexture: { value: texture }
      //       },
      //       vertexShader:
      //         `
      //           // Vertex Shader
      //           precision highp float;
      //         varying vec2 vUv;

      //         void main() {
      //           vUv = uv; // Assign the UV coordinates provided by Three.js to vUv
      //           gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      //         }
      // `, // Your vertex shader code here
      //       fragmentShader: `
      //       // Fragment Shader
      //       precision highp float;

      //       uniform sampler2D heatmapTexture;
      //       varying vec2 vUv;

      //       vec3 valueToColor(float value) {
      //         // Linear interpolation between blue and red based on the texture value
      //         // This assumes the value is normalized between 0 and 1.
      //         return mix(vec3(0.0, 0.0, 1.0), vec3(1.0, 0.0, 0.0), value);
      //       }

      //       void main() {
      //         float value = texture2D(heatmapTexture, vUv).r; // Get the normalized value
      //         vec3 color = valueToColor(value);
      //         // Debugging: Output raw value as color
      //         gl_FragColor = vec4(color, 1.0);
      //       }


      //       ` // Your fragment shader code here
      //     });
      //     localBox.material = material;
      break;

  }
  //
  // Used by all the shaders
  //
  // volumeTexture.format = THREE.RedFormat; //TODO NEEDED FOR THE CLOUDS????????????

  volumeTexture.type = THREE.UnsignedByteType;
  volumeTexture.generateMipmaps = false; // Saves memory.
  volumeTexture.needsUpdate = true;

  //
  // Apply the updated material uniforms with new texture and parameters.
  //
  uniforms.volumeTex.value = volumeTexture;




}
