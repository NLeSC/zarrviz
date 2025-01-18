import * as THREE from 'three';
import { get } from 'svelte/store';

import vertexShaderVolume from '$lib/shaders/volume.vert';
import fragmentShaderVolumeClouds from '$lib/shaders/volumeClouds.frag'; // ql
import fragmentShaderVolumeTransfer from '$lib/shaders/volumeTransfer.frag'; // qr
import fragmentShaderVolumeransferSlow from '$lib/shaders/volumeTransferSlow.frag'; // qr
import vertexShaderSurface from '$lib/shaders/surface.vert';
import fragmentShaderSurfaceHeatMap from '$lib/shaders/surfaceHeatmap.frag';  // heat map

import { makeRainTransferTex } from '$lib/utils/makeRainTransferTex';

import { cameraFar, cameraNear } from './create3DScene';
import { cloudLayerSettings, rainLayerSettings, temperatureLayerSettings } from '../stores/viewer.store';
import { getVariableMetaData } from '../stores/allSlices.store';

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
  let shaderMaterial: THREE.ShaderMaterial = null;
  const variableInfo = getVariableMetaData(variable);
  const hasCoarseData = getVariableMetaData(variable, -1) !== null;
  switch (variable) {
    case 'ql':
      shaderMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShaderVolume,
        fragmentShader: fragmentShaderVolumeClouds,
        side: THREE.DoubleSide,
        clipping: true,
        transparent: true,
        depthTest: false,
        uniforms: {
          uTransparency: { value: get(cloudLayerSettings).opacity / 100 },
          boxSize: new THREE.Uniform(variableInfo.getBoxSizes()),
          volumeTex: new THREE.Uniform(null),
          voxelSize: new THREE.Uniform(variableInfo.getVoxelSizes()),
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
          finalGamma: new THREE.Uniform(0),
          displacement: new THREE.Uniform(new THREE.Vector3(0.0, 0.0, 0.0)),
        }
      });
      break;
    case 'qr':
      shaderMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShaderVolume,
        fragmentShader: hasCoarseData ? fragmentShaderVolumeTransfer : fragmentShaderVolumeransferSlow,
        side: THREE.DoubleSide,
        transparent: true,
        clipping: true,
        depthTest: false,
        uniforms: {
          uTransparency: { value: get(rainLayerSettings).opacity / 100 },
          boxSize: new THREE.Uniform(variableInfo.getBoxSizes()),
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
          useLighting: new THREE.Uniform(false),
          displacement: new THREE.Uniform(new THREE.Vector3(0.0, 0.0, 0.0)),
        }
      });
      break;
    case 'thetavmix':

      shaderMaterial = new THREE.ShaderMaterial({
        transparent: true,
        uniforms: {
          volumeTex: { value: null },
          uTransparency: { value: get(temperatureLayerSettings).opacity / 100 },
          uScaleFactor: { value: 200.0 },
          displacement: new THREE.Uniform(new THREE.Vector2(0.0, 0.0)),
        },
        vertexShader: vertexShaderSurface,
        fragmentShader: fragmentShaderSurfaceHeatMap,
      });
      break;
  }
  // shaderMaterial.uniforms.uTransparency = { value: 1 };
  return shaderMaterial;
}



