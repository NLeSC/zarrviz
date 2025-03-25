import * as THREE from 'three';
import { get } from "svelte/store";
import { cloudLayerSettings, meshSize, rainLayerSettings, scaleFactor, temperatureLayerSettings, wind, dataRenderLayers } from '../stores/viewer.store';
import { CloudLayer } from './cloudLayer';
import { TransferFunctionVolumeLayer } from './transferFunctionVolumeLayer';
import { HeatMapLayer } from './heatMapLayer';
import { RemoteDataLayer } from './remoteDataLayer';

/*
 * A box in which the 3D volume texture will be rendered.
 * The box will be centered at the origin, with X in [-0.5, 0.5] so the width is 1, and
 * Y (height) and Z (depth) scaled to match.
 */
export async function createVolumetricRenderingBox({ scene, variable, variableStores }) {
  let level = 0;
  let boxZ = 0;
  const coarseVariableStore = variableStores[variableStores.length - 1];
  for (const variableStore of variableStores) {
    const variableInfo = variableStore.variableInfo;
    if (level == 0 && get(meshSize).length === 0) {
      meshSize.set(variableInfo.numCellsXYZ);
    }
    if (level == 0){
      boxZ = variableInfo.numCellsXYZ[2] < 2 ? variableInfo.numCellsXYZ[1] / variableInfo.numCellsXYZ[0] : 0;
    }
    const boxGeometry = new THREE.BoxGeometry(1, 1, boxZ);
    const planeGeometry = new THREE.PlaneGeometry(1, 1);
    let layer = null;
    let mesh = null;
    let enabled = false;
    let renderingLayerInfo: {layers: RemoteDataLayer[], lod: THREE.LOD} = {layers: [], lod: null};
    switch (variable) {
      // Clouds Layer
      case 'ql': {
        const cloudLayer = new CloudLayer(variable, variableStore, boxGeometry)
        mesh = cloudLayer.initialize();
        mesh.position.z = 0.04 + 2000 / get(scaleFactor); // was 0.25 // 570 meters above the map TODO: calculate this value from the data
        enabled = get(cloudLayerSettings).enabled;
        layer = cloudLayer as RemoteDataLayer;
        renderingLayerInfo = dataRenderLayers.ql;
        break;
      }

      // Rain Layer
      case 'qr': {
        const rainLayer = new TransferFunctionVolumeLayer(variable, variableStore, boxGeometry, coarseVariableStore);
        mesh = rainLayer.initialize();
        mesh.position.z = 2000 / get(scaleFactor); // it was 0.25 + 570 meters above the map TODO: calculate this value from the data
        enabled = get(rainLayerSettings).enabled;
        layer = rainLayer as RemoteDataLayer;
        renderingLayerInfo = dataRenderLayers.qr;
        break;
      }
      // Temperature Layer
      case 'thetavmix': {
        const thetaLayer = new HeatMapLayer(variable, variableStore, planeGeometry);
        mesh = thetaLayer.initialize();
        mesh.position.z = 0.03 // it was -
        enabled = get(temperatureLayerSettings).enabled;
        layer = thetaLayer as RemoteDataLayer;
        renderingLayerInfo = dataRenderLayers.thetavmix;
        break;
      }
    }
    if (enabled) {
      await layer.update(0);
      renderingLayerInfo.layers.push(layer);
      if (variableStores.length > 1) {
        if (renderingLayerInfo.lod === null){
          renderingLayerInfo.lod = new THREE.LOD();
        }
        renderingLayerInfo.lod.addLevel(mesh, (0.5 * level ** 2 + 0.25 * level + 0.1) * 20);
        if (level == variableStores.length - 1) {
          scene.add(renderingLayerInfo.lod);
        }
      }
      else {
        scene.add(mesh);
      }
    }
    level++;
  }
}

export function isVisible(key: string) {
  if (key == 'ql'){
    return get(cloudLayerSettings).enabled;
  }
  else if (key == 'qr'){
    return get(rainLayerSettings).enabled;
  }
  else if (key == 'thetavmix'){
    return get(temperatureLayerSettings).enabled;
  }
  return false;
}

export async function updateLayers(timestep: number) {
  for (const [key, value] of Object.entries(dataRenderLayers)) {
    if (isVisible(key)){
      if (value.layers.length == 0){
        continue;
      }
      const level = value.lod ? value.lod.getCurrentLevel() : 0;
      console.log('updateLayers', value.layers[level].variable, timestep, level);
      await value.layers[level].update(timestep);
    }
  }
}

export async function displaceLayers(subStep: number, subStepsPerStep: number) {
  // TODO: get wind from the data
  for (const [key, value] of Object.entries(dataRenderLayers)) {
    if (isVisible(key)){
      if (value.layers.length == 0){
        continue;
      }
      const level = value.lod ? value.lod.getCurrentLevel() : 0;
      console.log('displaceLayers', value.layers[level].variable, subStep, level);
      value.layers[level].displace(subStep, subStepsPerStep, wind);
    }
  }
}