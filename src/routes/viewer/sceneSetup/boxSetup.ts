import * as THREE from 'three';
import { get } from "svelte/store";
import { volumeSizes } from "../stores/allSlices.store";
import { cloudLayerSettings, rainLayerSettings, scaleFactor, temperatureLayerSettings } from '../stores/viewer.store';
import { initMaterial, updateMaterial } from './initMaterial';


// TODO:
// TODO:
// TODO:
// TODO: CONTINUE HERE
// TODO: add and remove the layers from the scene and materials as needed
// TODO:  CONTINUE VERY CAREFULLY LINE BY LINE, I AM TESTING AND THINGS I COMMENTED OUT SHOULD BE PUT BACK
// TODO:
// TODO:
//
// Rendering containers and materials for the volume rendering layers
//
export const boxes: {
  ql?: THREE.Mesh;
  qr?: THREE.Mesh;
  thetavmix?: THREE.Points;
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
  // 'qr', // rain
  // 'thetavmix' // temperature
];


/*
 * A box in which the 3D volume texture will be rendered.
 * The box will be centered at the origin, with X in [-0.5, 0.5] so the width is 1, and
 * Y (height) and Z (depth) scaled to match.
 */
export function createVolumetricRenderingBox({ scene, variable, dataUint8, dataCoarse = null }) {
  //const boxGeometry = new THREE.BoxGeometry(get(volumeSize)[0], get(volumeSize)[1], get(volumeSize)[2]);
  // const boxSizeInKm = 33.8; // 33.8 km
  // const boxScale = boxSizeInKm; // / scaleFactor; // Convert to meters and then apply scale factor to scene units

  const boxZ = get(volumeSizes)[variable][2] / get(volumeSizes)[variable][1];
  // const boxScale = 33800 / scaleFactor; //  33.8 km in meters in scene units
  const boxGeometry = new THREE.BoxGeometry(1, 1, boxZ);

  switch (variable) {
    // Clouds Layer
    case 'ql': {
      boxes.ql = new THREE.Mesh(boxGeometry);
      boxes.ql.position.z = 0.25 + 2000 / get(scaleFactor); // 570 meters above the map TODO: calculate this value from the data
      boxes.ql.renderOrder = 0;
      boxes.ql.material = initMaterial({ variable });

      console.log('🎹 ', boxes.ql.material);

      // boxes.qlBox.material = new THREE.MeshBasicMaterial({
      //   color: 0x00ff00, transparent: true,
      //   opacity: get(cloudLayerSettings).opacity / 100
      // });


      updateMaterial({ variable, dataUint8 });
      // scene.add(qlBox);
      get(cloudLayerSettings).enabled && scene.add(boxes.ql);
      break;
    }
    // Rain Layer
    case 'qr': {
      boxes.qr = new THREE.Mesh(boxGeometry);
      boxes.qr.position.z = 0.25 + 2000 / get(scaleFactor); // 570 meters above the map TODO: calculate this value from the data
      boxes.qr.renderOrder = 0;
      // qrBox.material = initMaterial({ variable });
      boxes.qr.material = new THREE.MeshBasicMaterial({ color: 'purple', transparent: true, opacity: get(rainLayerSettings).opacity / 100 });


      updateMaterial({ variable, dataUint8, dataCoarse });
      get(rainLayerSettings).enabled && scene.add(boxes.qr);
      break;
    }
    // Temperature Layer
    case 'thetavmix': {
      //!
      //!
      //! CHAGE PLANE GEOMETRY TO TEXTURE GEOMETRY????? 1000 * 1000 generates 1 million vertices
      //!
      //!
      const planeGeometry = new THREE.PlaneGeometry(1, 1, 100, 100);
      // const planeGeometry = new THREE.PlaneGeometry(1, 1, get(volumeSizes)[variable][0], get(volumeSizes)[variable][1]);
      planeGeometry.rotateX(Math.PI / 2);
      //planeGeometry.translate(0, 0, 20);
      const plane: THREE.Points = new THREE.Points(planeGeometry);
      plane.rotateX(-Math.PI / 2);
      //plane.position.z = 2000 / scaleFactor; // 570 meters above the map TODO: calculate this value from the data
      plane.renderOrder = 0;
      // plane.position.z = 0.04;

      // plane.material = initMaterial({ variable });
      // plane.material = initMaterial({ variable });
      boxes.thetavmix = plane
      plane.material = new THREE.PointsMaterial({
        color: 'red', transparent: true,
        size: 2, // Adjust the size to simulate larger voxels
        sizeAttenuation: true, // Ensure size diminishes with distance (optional)
        opacity: get(temperatureLayerSettings).opacity / 100
      });
      // const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      // box.material = cubeMaterial;
      // boxes.thetavmixMaterial = plane.material;
      // updateMaterial({ variable, dataUint8, dataCoarse });
      console.log('🎹 get(temperatureLayerSettings).enabled ', get(temperatureLayerSettings).enabled);

      get(temperatureLayerSettings).enabled && scene.add(boxes.thetavmix);
      // renderScene();
      break;


    }
  }

  // renderScene(); // no need to render the scene
}
/* // A plane in whcin the plane texture will be rendered.
export function createPlaneRenderingBox({ variable, dataUint8 }): THREE.Points {
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
  updateMaterial({ variable, dataUint8 });
  // scene.add(plane);
  // renderScene();
  return plane;
}
 */