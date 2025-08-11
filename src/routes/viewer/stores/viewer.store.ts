import * as THREE from 'three';
import { persisted } from 'svelte-persisted-store'
import { writable } from 'svelte/store';
import { MultiVariableStore } from './multiVariableStore';
import type { RemoteDataLayer } from '../sceneSetup/remoteDataLayer';
import type { CustomLayerInterface } from 'maplibre-gl';
import CameraControls from 'camera-controls';
CameraControls.install({ THREE: THREE });

export const showGrid = persisted('showGrid', true); // defatult 10. It can be more
export const cloudLayerSettings = persisted('cloudLayer', { enabled: true, opacity: 100, active: true }); // 0 to 100
export const rainLayerSettings = persisted('rainLayer', { enabled: true, opacity: 100, active: true }); // 0 to 100
export const temperatureLayerSettings = persisted('temperatureLayer', { enabled: true, opacity: 100, active: true }); // 0 to 100

// 1 unit in the scene = 1000 meters (1 kilometer) in real life
// Meters of the bounding box of the data
// NOTE: Calculate the bounding box of the data and set it here if possible.
export const scaleFactor = persisted('scaleFactor', 33800);

export const currentTimeIndex = writable(0);
export const currentStepIndex = writable(0);
export const numTimes = writable(0);
export const loading = writable(false);
export const loadTime = writable(0);
export const meshSize = writable([]);

export const subStepsPerFrame = 20;
export const wind = [-9.5, -3.7];

export const multiVariableStore: MultiVariableStore = new MultiVariableStore();

export const dataRenderLayers: {
  ql: {layers: RemoteDataLayer[], lod: THREE.LOD, currentLODLevel: number};
  qr: {layers: RemoteDataLayer[], lod: THREE.LOD, currentLODLevel: number};
  thetavmix: {layers: RemoteDataLayer[], lod: THREE.LOD, currentLODLevel: number};
} = {
  ql: {layers: [], lod: null, currentLODLevel: 0},
  qr: {layers: [], lod: null, currentLODLevel: 0},
  thetavmix: {layers: [], lod: null, currentLODLevel: 0},
};

export interface ThreeJsCustomLayer extends CustomLayerInterface {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  cameraControls: CameraControls;
}

export const customLayer = writable<ThreeJsCustomLayer | null>(null);