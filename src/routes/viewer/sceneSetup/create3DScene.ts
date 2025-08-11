import * as THREE from 'three';
//import { createPlaneMesh } from './createPlaneMesh';
import { type ThreeJsCustomLayer, customLayer } from '../stores/viewer.store';
import CameraControls from 'camera-controls';
import maplibregl from 'maplibre-gl';
import { mat4 } from 'gl-matrix';
import { get } from 'svelte/store';

export let updateLODCallback: () => void;

export const cameraFovDegrees = 1.0; // it was 5  - 1.0 has no artifacts almost, but less performant
export const cameraNear = 0.01;
export const cameraFar = 1000.0;

function createRenderer(canvas: HTMLCanvasElement, context: WebGLRenderingContext | WebGL2RenderingContext): THREE.WebGLRenderer {
  return new THREE.WebGLRenderer({ antialias: true, canvas: canvas, context: context });
}

export function renderScene() {
  if (!get(customLayer) || !get(customLayer).scene || !get(customLayer).renderer) {
    console.error('Custom layer is not initialized.');
    return;
  }
  console.info('Rendering Three.js scene');
  get(customLayer).renderer.render(get(customLayer).scene, get(customLayer).camera);
}

export function setUpdateLODCallback(callback: () => void) {
  updateLODCallback = callback;
}

export function createCustomLayer(canvasId: string): ThreeJsCustomLayer {
  return {
    id: 'threejs-layer',
    renderingMode: '3d' as const,
    type: 'custom' as const,
    scene: null as THREE.Scene,
    camera: null as THREE.PerspectiveCamera,
    cameraControls: null as CameraControls,
    renderer: null as THREE.WebGLRenderer,
    onAdd: function (map, gl) {
      // Create the Three.js scene
      const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
      this.scene = new THREE.Scene();
      // Add a plane with the Map to the scene
      //this.scene.add(createPlaneMesh());

      // Synchronize the Three.js camera with the MapLibre camera
      const center = map.getCenter();
      const zoom = map.getZoom();
      const pitch = map.getPitch();
      const bearing = map.getBearing();

      // Update the camera position and orientation based on the map's center, zoom, pitch, and bearing
      this.camera = new THREE.PerspectiveCamera(
        cameraFovDegrees,
        window.innerWidth / window.innerHeight,
        cameraNear,
        cameraFar
      );
      this.camera.position.set(center.lng, center.lat, zoom);
      this.camera.rotation.set(THREE.MathUtils.degToRad(pitch), THREE.MathUtils.degToRad(bearing), 0);
      this.cameraControls = new CameraControls(this.camera, canvas);

      this.renderer = createRenderer(canvas, gl);
    },
    render: function (gl, options: { projectionMatrix: mat4 }) {
      // Convert MapLibre's matrix to a Three.js matrix
      const m = new THREE.Matrix4().fromArray(Array.from(options.projectionMatrix) as number[]);
      this.camera.projectionMatrix = m;

      // Render the Three.js scene
      this.renderer.render(this.scene, this.camera);
    },
  };
}

export function initializeMapWith3DScene(containerId: string) {
  // Initialize MapLibre map
  return new maplibregl.Map({
    container: containerId,
    style: 'https://demotiles.maplibre.org/style.json', // Replace with your style URL
    center: [0, 0], // Set your desired center
    zoom: 2,
    pitch: 60, // Add pitch for 3D perspective
    bearing: 0,
  });
}
