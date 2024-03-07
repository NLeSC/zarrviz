import * as THREE from 'three';

import vertexShaderVolume from '$lib/shaders/volume.vert';
import fragmentShaderVolume from '$lib/shaders/volume.frag';
import fragmentShaderVolumeTransfer from '$lib/shaders/volume_transfer.frag';
import fragmentShaderSurfaceHeatMap from '$lib/shaders/surface_heatmap.frag';
import vertexShaderSurface from '$lib/shaders/surface.vert';
import {
  voxelSizes,
  volumeSizes,
  boxSizes,
} from '../stores/allSlices.store';
import { makeRainTransferTex } from '$lib/utils/makeRainTransferTex';
import { get } from 'svelte/store';
import { cameraFar, cameraNear } from './create3DScene';
import { cloudLayerSettings, rainLayerSettings, temperatureLayerSettings } from '../stores/viewer.store';
import { boxes } from './boxSetup';



// TODO:
// TODO:
// TODO: MAKE THIS WORK
// TODO:

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


// Run only once at mount
const transferTexture = makeRainTransferTex();

const sunLightDir = new THREE.Vector3(0.0, 0.5, 0.5);
const sunLightColor = new THREE.Color(0.99, 0.83, 0.62);
const sunLight = new THREE.DirectionalLight(sunLightColor.getHex(), 1.0);
sunLight.position.copy(sunLightDir);

const seaLightColor = new THREE.Color(0.0, 0.0005, 0.0033);
const toaLightColor = new THREE.Color(0.0, 0.0002, 0.033);
const hemisphereLight = new THREE.HemisphereLight(seaLightColor.getHex(), toaLightColor.getHex(), 1.0);
const lightColor = sunLight.color;
const lightColorV = new THREE.Vector3(lightColor.r, lightColor.g, lightColor.b);
const ambientLightColorV = new THREE.Vector3(
  hemisphereLight.color.r,
  hemisphereLight.color.g,
  hemisphereLight.color.b
);
const finalGamma = 6.0;



export function initMaterial({ variable }): THREE.Material {
  let shaderMaterial: THREE.Material = null;
  switch (variable) {
    case 'ql':
      shaderMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShaderVolume,
        fragmentShader: fragmentShaderVolume,
        side: THREE.DoubleSide,
        transparent: true,
        uniforms: {
          uTransparency: { value: get(cloudLayerSettings).opacity / 100 },   // TODO: Implement this uniform in the shader
          boxSize: new THREE.Uniform(get(boxSizes)[variable]),
          volumeTex: new THREE.Uniform(null),
          voxelSize: new THREE.Uniform(get(voxelSizes)[variable]),
          sunLightDir: new THREE.Uniform(sunLight.position),
          sunLightColor: new THREE.Uniform(lightColorV),
          ambientLightColor: new THREE.Uniform(ambientLightColorV),
          near: new THREE.Uniform(cameraNear),
          far: new THREE.Uniform(cameraFar),
          // The following are set separately, since they are based on `props` values that can
          // change often, and should not trigger complete re-initialization.
          dtScale: new THREE.Uniform(0),
          ambientFactor: new THREE.Uniform(0),
          solarFactor: new THREE.Uniform(0),
          dataScale: new THREE.Uniform(0),
          gHG: new THREE.Uniform(0),
          dataEpsilon: new THREE.Uniform(0),
          bottomColor: new THREE.Uniform(new THREE.Vector3(0.0, 0.0005, 0.0033)),
          bottomHeight: new THREE.Uniform(0),
          finalGamma: new THREE.Uniform(0)
        }
      });
      break;
    case 'qr':
      shaderMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShaderVolume,
        fragmentShader: fragmentShaderVolumeTransfer,
        side: THREE.DoubleSide,
        transparent: true,
        uniforms: {
          uTransparency: { value: get(rainLayerSettings).opacity / 100 },
          boxSize: new THREE.Uniform(get(boxSizes)[variable]),
          volumeTex: new THREE.Uniform(null),
          coarseVolumeTex: new THREE.Uniform(null),
          sunLightDir: new THREE.Uniform(sunLight.position),
          sunLightColor: new THREE.Uniform(lightColorV),
          near: new THREE.Uniform(cameraNear),
          far: new THREE.Uniform(cameraFar),
          // The following are set separately, since they are based on `props` values that can
          // change often, and should not trigger complete re-initialization.
          transferTex: new THREE.Uniform(transferTexture),
          dtScale: new THREE.Uniform(0),
          dataScale: new THREE.Uniform(0),
          alphaNorm: new THREE.Uniform(0),
          finalGamma: new THREE.Uniform(0),
          useLighting: new THREE.Uniform(false)
        }
      });
      break;
    case 'thetavmix':
      // Create an elevation texture
      shaderMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShaderSurface,
        fragmentShader: fragmentShaderSurfaceHeatMap,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 1.0,
        clipping: true,
        uniforms: {
          uTransparency: { value: get(temperatureLayerSettings).opacity / 100 },   // TODO: Implement this uniform in the shader
          volumeTex: new THREE.Uniform(null),
          heightRatio: new THREE.Uniform(0),
          heightBias: new THREE.Uniform(0),
          //gradientTexture: {value: gradientMap}
          colorLow: new THREE.Uniform(new THREE.Vector3(0, 0, 1)),
          colorMid: new THREE.Uniform(new THREE.Vector3(0, 1, 0)),
          colorHigh: new THREE.Uniform(new THREE.Vector3(1, 0, 0))
        }
      });
      break;
  }
  // shaderMaterial.uniforms.uTransparency = { value: 1 };
  return shaderMaterial;
}

// TODO:
// TODO:
// TODO: dataUint8 is the same that dataCoarse, just a comperssed one,
// TODO: but it sohuld not be different params depending on the variable
// TODO:
export function updateMaterial({ variable, dataUint8, dataCoarse = null }) {
  let localBox = boxes[variable];

  if (!localBox) {
    return;
  }
  // Dispose of the old texture to free up memory.
  if (localBox.material.uniforms.volumeTex.value != null) {
    localBox.material.uniforms.volumeTex.value.dispose();
  }

  // Create a new 3D texture for the volume data.
  let volumeTexture = null;
  if (variable === 'thetavmix') {
    volumeTexture = new THREE.DataTexture(dataUint8, get(volumeSizes)[variable][0], get(volumeSizes)[variable][1]);
  } else {
    volumeTexture = new THREE.Data3DTexture(
      dataUint8,
      get(volumeSizes)[variable][0],
      get(volumeSizes)[variable][1],
      get(volumeSizes)[variable][2]
    );
  }
  volumeTexture.format = THREE.RedFormat;
  volumeTexture.type = THREE.UnsignedByteType;
  volumeTexture.generateMipmaps = false; // Saves memory.
  volumeTexture.minFilter = THREE.LinearFilter; // Better for volume rendering.
  volumeTexture.magFilter = THREE.LinearFilter;
  volumeTexture.needsUpdate = true;

  if (localBox.material.uniforms.coarseVolumeTex.value != null) {
    localBox.material.uniforms.coarseVolumeTex.value.dispose();
  }

  let coarseVolumeTexture = null;
  if (dataCoarse !== null) {
    coarseVolumeTexture = new THREE.Data3DTexture(
      dataCoarse,
      get(volumeSizes)[variable][0] / 8,
      get(volumeSizes)[variable][1] / 8,
      get(volumeSizes)[variable][2] / 8
    );
    coarseVolumeTexture.format = THREE.RedFormat;
    coarseVolumeTexture.type = THREE.UnsignedByteType;
    coarseVolumeTexture.generateMipmaps = false; // Saves memory.
    coarseVolumeTexture.minFilter = THREE.NearestFilter; // Better for volume rendering.
    coarseVolumeTexture.magFilter = THREE.NearestFilter;
    coarseVolumeTexture.needsUpdate = true;
  }

  // Update material uniforms with new texture and parameters.
  localBox.material.uniforms.volumeTex.value = volumeTexture;
  switch (String(variable)) {
    case 'ql':
      localBox.material.uniforms.dataScale.value = qlScale;
      localBox.material.uniforms.dtScale.value = dtScale;
      localBox.material.uniforms.ambientFactor.value = ambientFactor;
      localBox.material.uniforms.solarFactor.value = solarFactor;
      localBox.material.uniforms.gHG.value = gHG;
      localBox.material.uniforms.dataEpsilon.value = dataEpsilon;
      localBox.material.uniforms.bottomColor.value = bottomColor;
      localBox.material.uniforms.bottomHeight.value = bottomHeight;
      localBox.material.uniforms.finalGamma.value = finalGamma;
      break;
    case 'qr':
      localBox.material.uniforms.coarseVolumeTex.value = coarseVolumeTexture;
      localBox.material.uniforms.dataScale.value = qrScale;
      localBox.material.uniforms.dtScale.value = dtScale;
      localBox.material.uniforms.alphaNorm.value = 2.0;
      localBox.material.uniforms.finalGamma.value = finalGamma;
      break;
  }
}


