import * as THREE from 'three';

import { get } from "svelte/store";
import { volumeSizes } from "../stores/allSlices.store";
import { scaleFactor } from '../stores/viewer.store';
import { initMaterial, updateMaterial } from './initMaterial';

// TODO:
// TODO:
// TODO: MAKE THIS WORK
// TODO:

/*
 * A box in which the 3D volume texture will be rendered.
 * The box will be centered at the origin, with X in [-0.5, 0.5] so the width is 1, and
 * Y (height) and Z (depth) scaled to match.
 */
export function createVolumetricRenderingBox({ scene, boxes, variable, dataUint8, dataCoarse }) {
  //const boxGeometry = new THREE.BoxGeometry(get(volumeSize)[0], get(volumeSize)[1], get(volumeSize)[2]);
  // const boxSizeInKm = 33.8; // 33.8 km
  // const boxScale = boxSizeInKm; // / scaleFactor; // Convert to meters and then apply scale factor to scene units

  const boxZ = get(volumeSizes)[variable][2] / get(volumeSizes)[variable][1];
  // const boxScale = 33800 / scaleFactor; //  33.8 km in meters in scene units
  const boxGeometry = new THREE.BoxGeometry(1, 1, boxZ);

  switch (variable) {
    case 'ql': {
      const qlBox = new THREE.Mesh(boxGeometry);
      qlBox.position.z = 0.25 + 2000 / get(scaleFactor); // 570 meters above the map TODO: calculate this value from the data
      qlBox.renderOrder = 0;
      qlBox.material = initMaterial({ variable });
      qlMaterial = qlBox.material;
      boxes[variable] = qlBox;
      updateMaterial({ variable, dataUint8, dataCoarse });
      scene.add(qlBox);
      break;
    }
    case 'qr': {
      const qrBox = new THREE.Mesh(boxGeometry);
      qrBox.position.z = 0.25 + 2000 / get(scaleFactor); // 570 meters above the map TODO: calculate this value from the data
      qrBox.renderOrder = 0;
      qrBox.material = initMaterial({ variable });
      qrMaterial = qrBox.material;
      boxes[variable] = qrBox;
      updateMaterial({ variable, dataUint8, dataCoarse });
      scene.add(qrBox);
      break;
    }
  }

  // renderScene(); // no need to render the scene
}
// A plane in whcin the plane texture will be rendered.
export function createPlaneRenderingBox({ variable, dataUint8, dataCoarse }): THREE.Points {
  //const boxGeometry = new THREE.BoxGeometry(get(volumeSize)[0], get(volumeSize)[1], get(volumeSize)[2]);
  // const boxSizeInKm = 33.8; // 33.8 km
  // const boxScale = boxSizeInKm; // / scaleFactor; // Convert to meters and then apply scale factor to scene units

  //const planeGeometry = new THREE.PlaneGeometry(1.0, 1.0);
  //const planeGeometry = new THREE.PlaneGeometry(1, 1, get(volumeSizes)[variable][0], get(volumeSizes)[variable][1]);
  const planeGeometry = new THREE.PlaneGeometry(1, 1, 1000, 1000);
  planeGeometry.rotateX(Math.PI / 2);

  //planeGeometry.translate(0, 0, 20);
  const plane: THREE.Points = new THREE.Points(planeGeometry);
  plane.rotateX(-Math.PI / 2);
  //plane.position.z = 2000 / scaleFactor; // 570 meters above the map TODO: calculate this value from the data
  plane.renderOrder = 0;
  plane.position.z = 0.1;

  plane.material = initMaterial({ variable });
  // const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  // box.material = cubeMaterial;
  // boxes[variable] = plane;
  updateMaterial({ variable, dataUint8, dataCoarse });
  // scene.add(plane);
  // renderScene();
  return plane;
}
