import * as THREE from 'three';
import { get } from "svelte/store";
import { volumeSizes } from "../stores/allSlices.store";
import { cloudLayerSettings, rainLayerSettings, scaleFactor, temperatureLayerSettings } from '../stores/viewer.store';
import { initMaterial } from './initMaterial';
import { updateMaterial } from './updateMaterial';

//
// Rendering containers and materials for the volume rendering layers
//
export const boxes: {
  ql?: THREE.Mesh;
  qr?: THREE.Mesh;
  thetavmix?: THREE.Points | THREE.Mesh;
  // thetavmix?: THREE.Mesh;
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
  // 'qr', // rain
  // 'ql', // clouds
  'thetavmix', // temperature
];


/*
 * A box in which the 3D volume texture will be rendered.
 * The box will be centered at the origin, with X in [-0.5, 0.5] so the width is 1, and
 * Y (height) and Z (depth) scaled to match.
 */
export function createVolumetricRenderingBox({ scene, variable, dataUint8 }) {
  // const boxGeometry = new THREE.BoxGeometry(get(volumeSize)[0], get(volumeSize)[1], get(volumeSize)[2]);
  // const boxSizeInKm = 33.8; // 33.8 km
  // const boxScale = boxSizeInKm; // / scaleFactor; // Convert to meters and then apply scale factor to scene units

  const boxZ = get(volumeSizes)[variable][2] / get(volumeSizes)[variable][1];
  // const boxScale = 33800 / scaleFactor; //  33.8 km in meters in scene units
  const boxGeometry = new THREE.BoxGeometry(1, 1, boxZ);
  const planeGeometry = new THREE.PlaneGeometry(1, 1);
  switch (variable) {
    // Clouds Layer
    case 'ql': {
      boxes.ql = new THREE.Mesh(boxGeometry);
      boxes.ql.position.z = 0.04 + 2000 / get(scaleFactor); // was 0.25 // 570 meters above the map TODO: calculate this value from the data
      boxes.ql.renderOrder = 0;
      boxes.ql.material = initMaterial({ variable });
      get(cloudLayerSettings).enabled && scene.add(boxes.ql);
      break;
    }

    // Rain Layer
    case 'qr': {
      boxes.qr = new THREE.Mesh(boxGeometry);
      boxes.qr.position.z = 2000 / get(scaleFactor); // it was 0.25 + 570 meters above the map TODO: calculate this value from the data
      boxes.qr.renderOrder = 0;
      boxes.qr.material = initMaterial({ variable });
      get(rainLayerSettings).enabled && scene.add(boxes.qr);
      break;
    }
    // Temperature Layer
    case 'thetavmix': {
      boxes.thetavmix = new THREE.Mesh(planeGeometry);
      boxes.thetavmix.material = initMaterial({ variable });
      boxes.thetavmix.position.z = 0.03 // it was -
      get(temperatureLayerSettings).enabled && scene.add(boxes.thetavmix);
      break;

    }
  }
  updateMaterial({ variable, dataUint8 });

}