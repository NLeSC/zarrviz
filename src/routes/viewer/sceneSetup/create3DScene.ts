import * as THREE from 'three';
import CameraControls from 'camera-controls';
import { createPlaneMesh } from './createPlaneMesh';
CameraControls.install({ THREE: THREE });

export let scene: THREE.Scene;
export let camera: THREE.PerspectiveCamera;

export let cameraControls: CameraControls | null = null;
export let renderer: THREE.WebGLRenderer;


export const cameraFovDegrees = 1.0; // it was 5  - 1.0 has no artifacts almost, but less performant
export const cameraNear = 0.01;
export const cameraFar = 1000.0;

// Render the scene. This function can be reused in other effects or callbacks.
export function renderScene(): void {
  renderer.render(scene, camera);
  console.log('🔥 rendered');
}
// Resize the canvas and camera when the window is resized
function resize(canvas, camera) {
  // Get the dimensions of the parent element
  const parent = canvas.parentElement;
  const width = parent.clientWidth;
  const height = parent.clientHeight;

  // Update the renderer and camera with the new sizes
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

export function create3DScene({ canvas }): void {
  // Set up the Three.js scene and renderer
  scene = new THREE.Scene();
  renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas }); // Create a WebGLRenderer and specify the canvas to use

  camera = new THREE.PerspectiveCamera(
    cameraFovDegrees,
    window.innerWidth / window.innerHeight,
    cameraNear,
    cameraFar
  );

  camera.position.set(0, -30, 50); // Adjusted for scaled scene
  camera.lookAt(new THREE.Vector3(0, 0, 0));

  cameraControls = new CameraControls(camera, canvas);

  // Add a plane with the Map to the scene
  scene.add(createPlaneMesh());


  // Add controls to the scene
  // scene.add(viewHelper);
  //
  // Lights, to be used both during rendering the volume, and rendering the optional surface.
  //
  // Add the sun light to the scene
  // scene.add(sunLight);
  // Add the hemisphere light to the scene
  // scene.add(hemisphereLight);

  //
  // Render loop for aniamtion and updating the scene
  //
  const clock = new THREE.Clock();
  function animate() {
    const delta = clock.getDelta();
    if(cameraControls.update(delta)) {
      renderer.render(scene, camera);
    }
    requestAnimationFrame(animate);
  }
  window.addEventListener('resize', () => resize(canvas, camera)); // Fix: Pass the correct arguments to the resize function
  resize(canvas, camera);
  animate();
  renderer.render(scene, camera);

  // return Promise.resolve(scene); // Fix: Wrap the scene variable in a Promise.resolve() function
  // console.log('🔋 3d scene created');
}