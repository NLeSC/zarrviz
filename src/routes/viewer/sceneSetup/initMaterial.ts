import * as THREE from 'three';
import { get } from 'svelte/store';

import vertexShaderVolume from '$lib/shaders/volume.vert';
import fragmentShaderVolume from '$lib/shaders/volume.frag'; // ql
import fragmentShaderVolumeTransfer from '$lib/shaders/volume_transfer.frag'; // qr
import vertexShaderSurface from '$lib/shaders/surface.vert';
import fragmentShaderSurfaceHeatMap from '$lib/shaders/surface_heatmap.frag';  // heat map

import { voxelSizes, boxSizes } from '../stores/allSlices.store';
import { makeRainTransferTex } from '$lib/utils/makeRainTransferTex';

import { cameraFar, cameraNear } from './create3DScene';
import { cloudLayerSettings, rainLayerSettings, temperatureLayerSettings } from '../stores/viewer.store';

// TODO:
// TODO:
// TODO: MAKE THIS WORK
// TODO:

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


export function initMaterial({ variable }): THREE.Material {
  let shaderMaterial: THREE.Material = null;
  switch (variable) {
    case 'ql':
      shaderMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShaderVolume,
        fragmentShader: fragmentShaderVolume,
        side: THREE.DoubleSide,
        clipping: true,
        transparent: true,
        depthTest: false,
        uniforms: {
          uTransparency: { value: get(cloudLayerSettings).opacity / 100 },
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
        clipping: true,
        depthTest: false,
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
        clipping: true,
        uniforms: {
          uTransparency: { value: get(temperatureLayerSettings).opacity / 100 },
          volumeTex: new THREE.Uniform(null),

          //
          // Not being used at the moment:
          //
          heightRatio: new THREE.Uniform(0),
          heightBias: new THREE.Uniform(0),
          colorLow: new THREE.Uniform(new THREE.Vector3(0, 0, 1)),
          colorMid: new THREE.Uniform(new THREE.Vector3(0, 1, 0)),
          colorHigh: new THREE.Uniform(new THREE.Vector3(1, 0, 0)),
          //gradientTexture: {value: gradientMap}
        }
      });
      break;
  }
  // shaderMaterial.uniforms.uTransparency = { value: 1 };
  return shaderMaterial;
}



