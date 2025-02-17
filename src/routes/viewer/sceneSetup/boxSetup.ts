import * as THREE from 'three';
import { get } from "svelte/store";
//import { getVariableMetaData, getVariableStore } from "../stores/allSlices.store";
import { cloudLayerSettings, meshSize, rainLayerSettings, scaleFactor, temperatureLayerSettings, wind } from '../stores/viewer.store';
import { CloudLayer } from './cloudLayer';
import { TransferFunctionVolumeLayer } from './transferFunctionVolumeLayer';
import { HeatMapLayer } from './heatMapLayer';
import type { RemoteDataLayer } from './remoteDataLayer';

//
// Rendering containers and materials for the layers
//
export const layers: {
  ql?: CloudLayer;
  qr?: TransferFunctionVolumeLayer;
  thetavmix?: HeatMapLayer;
} = {
  ql: undefined,
  qr: undefined,
  thetavmix: undefined,
};

//
// Layers to be fetch and rendered in the scene programatically
// Add and remove for debugging and testing
// They should be all enabled by default
//
export const data_layers = [
  'ql', // clouds
  'qr', // rain
  'thetavmix', // temperature
];

/*
 * A box in which the 3D volume texture will be rendered.
 * The box will be centered at the origin, with X in [-0.5, 0.5] so the width is 1, and
 * Y (height) and Z (depth) scaled to match.
 */
export async function createVolumetricRenderingBox({ scene, variable, variableStore, coarseVariableStore }) {
  const variableInfo = variableStore.variableInfo;
  if (get(meshSize).length === 0) {
    meshSize.set(variableInfo.numCellsXYZ);
  }
  const boxZ = variableInfo.numCellsXYZ[2] < 2 ? variableInfo.numCellsXYZ[1] / variableInfo.numCellsXYZ[0] : 0;
  const boxGeometry = new THREE.BoxGeometry(1, 1, boxZ);
  const planeGeometry = new THREE.PlaneGeometry(1, 1);
  let layer = null;
  switch (variable) {
    // Clouds Layer
    case 'ql': {
      layers.ql = new CloudLayer(variable, variableStore, boxGeometry);
      const cloudMesh = layers.ql.initialize();
      cloudMesh.position.z = 0.04 + 2000 / get(scaleFactor); // was 0.25 // 570 meters above the map TODO: calculate this value from the data
      get(cloudLayerSettings).enabled && scene.add(cloudMesh);
      layer = layers.ql as RemoteDataLayer;
      await layer.update(0);
      break;
    }

    // Rain Layer
    case 'qr': {
      layers.qr = new TransferFunctionVolumeLayer(variable, variableStore, boxGeometry, coarseVariableStore);
      const rainMesh = layers.qr.initialize();
      rainMesh.position.z = 2000 / get(scaleFactor); // it was 0.25 + 570 meters above the map TODO: calculate this value from the data
      get(rainLayerSettings).enabled && scene.add(rainMesh);
      layer = layers.qr as RemoteDataLayer;
      await layer.update(0);
      break;
    }
    // Temperature Layer
    case 'thetavmix': {
      layers.thetavmix = new HeatMapLayer(variable, variableStore, planeGeometry);
      const temperatureMesh = layers.thetavmix.initialize();
      temperatureMesh.position.z = 0.03 // it was -
      get(temperatureLayerSettings).enabled && scene.add(temperatureMesh);
      layer = layers.thetavmix as RemoteDataLayer;
      await layer.update(0);
      break;
    }
  }
}

export function isVisible(layer: RemoteDataLayer) {
  if (layer === undefined) {
    return false;
  }
  if (layer === layers.ql){
    return get(cloudLayerSettings).enabled;
  }
  else if (layer === layers.qr){
    return get(rainLayerSettings).enabled;
  }
  else if (layer === layers.thetavmix){
    return get(temperatureLayerSettings).enabled;
  }
  return false;
}

export async function updateLayers(timestep: number) {
  for (const layer of Object.values(layers)) {
    if (isVisible(layer)){
      console.log('updateLayers', layer.variable, timestep);
      await layer.update(timestep);
    }
  }
}

export async function displaceLayers(subStep: number, subStepsPerStep: number) {
  // TODO: get wind from the data
  for (const layer of Object.values(layers)) {
    if (isVisible(layer)){
      console.log('displaceLayers', layer.variable, subStep);
      layer.displace(subStep, subStepsPerStep, wind);
    }
  }
}