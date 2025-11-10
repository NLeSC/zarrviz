import * as THREE from 'three';
import CameraControls from 'camera-controls';
import { createPlaneMesh } from './createPlaneMesh';
import { AtmosphereSetup } from './atmosphereSetup';
import { GoogleEarthTilesSetup } from './googleEarthTilesSetup';
CameraControls.install({ THREE: THREE });

export let scene: THREE.Scene;
export let camera: THREE.PerspectiveCamera;
export let cameraControls: CameraControls | null = null;
export let renderer: THREE.WebGLRenderer;
export let updateLODCallback: () => void;

// Geospatial components
export let atmosphereSetup: AtmosphereSetup | null = null;
export let googleEarthTilesSetup: GoogleEarthTilesSetup | null = null;

export const cameraFovDegrees = 1.0; // it was 5  - 1.0 has no artifacts almost, but less performant
export const cameraNear = 0.01;
export const cameraFar = 1000.0;

export function setUpdateLODCallback(callback: () => void) {
  updateLODCallback = callback;
}

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

// Update geospatial components with time-based changes
function updateGeospatialComponents() {
  if (atmosphereSetup) {
    // Update sun direction based on time (simplified example)
    const time = Date.now() * 0.0001;
    const sunDirection = new THREE.Vector3(
      Math.cos(time) * 0.5,
      Math.sin(time * 0.5) * 0.3 + 0.3,
      Math.sin(time) * 0.5
    ).normalize();

    // Update atmosphere
    atmosphereSetup.updateSunDirection(sunDirection);
  }

  // Update Google Earth tiles
  if (googleEarthTilesSetup) {
    googleEarthTilesSetup.update();
  }
}

export function create3DScene({ canvas }): void {
  // Set up the Three.js scene and renderer
  scene = new THREE.Scene();
  renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas }); // Create a WebGLRenderer and specify the canvas to use

  camera = new THREE.PerspectiveCamera(
    45, // Increased FOV for better 3D tiles viewing
    window.innerWidth / window.innerHeight,
    0.1, // Closer near plane for detailed tiles
    10000.0 // Far plane for large scale tiles
  );

  // Position camera for Earth viewing (higher altitude)
  camera.position.set(0, 0, 100); // Start further out for Earth tiles
  camera.lookAt(new THREE.Vector3(0, 0, 0));

  cameraControls = new CameraControls(camera, canvas);

  // Configure camera controls for 3D tiles navigation
  cameraControls.minDistance = 1; // Allow very close inspection
  cameraControls.maxDistance = 5000; // Allow viewing from far away
  cameraControls.dampingFactor = 0.05; // Smooth camera movement
  cameraControls.draggingDampingFactor = 0.05; // Smooth dragging

  // Initialize geospatial components
  try {
    console.log('🌍 Setting up geospatial atmosphere and Google Earth tiles...');

    // Create atmosphere setup (disable advanced textures to avoid 404 errors)
    atmosphereSetup = new AtmosphereSetup(scene, undefined, false);

    // Create Google Earth 3D tiles setup (replaces surface setup)
    // API key is loaded from VITE_GOOGLE_EARTH_API_KEY in .env
    googleEarthTilesSetup = new GoogleEarthTilesSetup(scene, camera, renderer, import.meta.env.VITE_GOOGLE_EARTH_API_KEY);

    console.log('✅ Geospatial components initialized successfully');
  } catch (error) {
    console.warn('⚠️ Failed to initialize geospatial components, using basic setup:', error);

    // Fallback to original plane if geospatial setup fails
    scene.add(createPlaneMesh());

    // Add basic lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);
  }

  //
  // Render loop for animation and updating the scene
  //
  const clock = new THREE.Clock();
  function animate() {
    const delta = clock.getDelta();

    // Update geospatial components
    updateGeospatialComponents();

    if (cameraControls.update(delta)) {
      renderer.render(scene, camera);
      updateLODCallback();
    }
    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', () => resize(canvas, camera));
  resize(canvas, camera);
  animate();
  renderer.render(scene, camera);

  console.log('🔋 3D scene with geospatial components created');
}

// Export functions to control geospatial components
export function updateSunDirection(direction: THREE.Vector3) {
  if (atmosphereSetup) {
    atmosphereSetup.updateSunDirection(direction);
  }
}

export function getTilesRenderer() {
  return googleEarthTilesSetup?.getTilesRenderer();
}

export function getTilesBounds() {
  return googleEarthTilesSetup?.getBounds();
}

export function raycastTiles(raycaster: THREE.Raycaster): THREE.Intersection[] {
  return googleEarthTilesSetup?.raycast(raycaster) || [];
}

export function setSunIntensity(intensity: number) {
  if (atmosphereSetup) {
    atmosphereSetup.setSunIntensity(intensity);
  }
}

export async function enableAdvancedAtmosphere(texturesUrl?: string): Promise<boolean> {
  if (atmosphereSetup) {
    return atmosphereSetup.enableAdvancedAtmosphere(texturesUrl);
  }
  return false;
}

export function setTilesErrorTarget(errorTarget: number) {
  if (googleEarthTilesSetup) {
    googleEarthTilesSetup.setErrorTarget(errorTarget);
  }
}

export function setTilesMaxDepth(maxDepth: number) {
  if (googleEarthTilesSetup) {
    googleEarthTilesSetup.setMaxDepth(maxDepth);
  }
}

export function toggleTilesDebug(show: boolean) {
  if (googleEarthTilesSetup) {
    googleEarthTilesSetup.toggleActiveTilesDisplay(show);
  }
}

// Cleanup function
export function disposeGeospatialComponents() {
  if (atmosphereSetup) {
    atmosphereSetup.dispose();
    atmosphereSetup = null;
  }
  if (googleEarthTilesSetup) {
    googleEarthTilesSetup.dispose();
    googleEarthTilesSetup = null;
  }
}

