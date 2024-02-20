import { get } from "svelte/store";
import * as THREE from 'three';

import vertexShaderVolume from '$lib/shaders/volume.vert';
import fragmentShaderVolume from '$lib/shaders/volume_cloud.frag';
import fragmentShaderVolumeTransfer from '$lib/shaders/volume_transfer.frag';
import vertexShaderSurface from '$lib/shaders/surface.vert';
import fragmentShaderSurfaceHeatMap from '$lib/shaders/surface_heatmap.frag';

import { voxelSizes, volumeSizes, boxSizes } from '$lib/stores/allSlices.store';
import { cloudLayer, rainLayer, temperatureLayer } from "$lib/stores/viewer.store";

import { makeRainTransferTex } from '$lib/utils/makeRainTransferTex';
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
const ambientLightColorV = new THREE.Vector3(hemisphereLight.color.r, hemisphereLight.color.g, hemisphereLight.color.b);


export async function initMaterial({ variable, dataUint8, cameraNear, cameraFar }): Promise<THREE.Material> {
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
  // Disabling mimpaps saves memory.
  volumeTexture.generateMipmaps = false;
  // Linear filtering disables LODs, which do not help with volume rendering.
  volumeTexture.minFilter = THREE.LinearFilter;
  volumeTexture.magFilter = THREE.LinearFilter;
  volumeTexture.needsUpdate = true;
  let layerMaterial = null;

  switch (variable) {
    case 'ql':
      layerMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShaderVolume,
        fragmentShader: fragmentShaderVolume,
        side: THREE.DoubleSide,
        transparent: true,
        uniforms: {
          opacity: { value: get(cloudLayer).opacity },
          boxSize: { value: get(boxSizes)[variable] },
          volumeTex: { value: volumeTexture },
          voxelSize: { value: get(voxelSizes)[variable] },
          sunLightDir: { value: sunLight.position },
          sunLightColor: { value: lightColorV },
          ambientLightColor: { value: ambientLightColorV },
          near: { value: cameraNear },
          far: { value: cameraFar },
          // The following are set separately, since they are based on `props` values that can
          // change often, and should not trigger complete re-initialization.
          dtScale: { value: 0 },
          ambientFactor: { value: 0 },
          solarFactor: { value: 0 },
          dataScale: { value: 0 },
          gHG: { value: 0 },
          dataEpsilon: { value: 0 },
          bottomColor: { value: new THREE.Vector3(0.0, 0.0005, 0.0033) },
          bottomHeight: { value: 0 },
          finalGamma: { value: 0 },
        }
      });

      break;
    case 'qr':
      layerMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShaderVolume,
        fragmentShader: fragmentShaderVolumeTransfer,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 1.0,
        uniforms: {
          opacity: { value: get(rainLayer).opacity },
          boxSize: { value: get(boxSizes)[variable] },
          volumeTex: { value: volumeTexture },
          sunLightDir: { value: sunLight.position },
          sunLightColor: { value: lightColorV },
          near: { value: cameraNear },
          far: { value: cameraFar },
          // The following are set separately, since they are based on `props` values that can
          // change often, and should not trigger complete re-initialization.
          transferTex: { value: transferTexture },
          dtScale: { value: 0 },
          dataScale: { value: 0 },
          alphaNorm: { value: 0 },
          finalGamma: { value: 0 },
          useLighting: { value: false },
        }
      });
      break;
    case 'thetavmix':
      // create an elevation texture
      layerMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShaderSurface,
        fragmentShader: fragmentShaderSurfaceHeatMap,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 1.0,
        clipping: true,
        uniforms: {
          volumeTex: { value: volumeTexture },
          heightRatio: { value: 0 },
          heightBias: { value: 0 },
          //gradientTexture: {value: gradientMap}
          colorLow: { value: new THREE.Vector3(0, 0, 1) },
          colorMid: { value: new THREE.Vector3(0, 1, 0) },
          colorHigh: { value: new THREE.Vector3(1, 0, 0) },
          opacity: { value: get(temperatureLayer).opacity },
        }
      });
      break;
  }
  return layerMaterial;
}
