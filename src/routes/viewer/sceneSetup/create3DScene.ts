import * as THREE from 'three';
import WebGL from 'three/examples/jsm/capabilities/WebGL.js';
import CameraControls from 'camera-controls';
import { get } from 'svelte/store';
import { scaleFactor } from '../stores/viewer.store';
import { createMapTiles, createTerrainTiles } from './createPlaneMesh';
import { CloudShadow } from './cloudShadow';
import { SkyDome } from './skyDome';
import type { TilesRenderer } from '3d-tiles-renderer';
CameraControls.install({ THREE: THREE });

export let scene: THREE.Scene;
export let camera: THREE.PerspectiveCamera;
export let cameraControls: CameraControls | null = null;
export let renderer: THREE.WebGLRenderer;
export let mapTiles: TilesRenderer;
export let cloudShadow: CloudShadow;
export let skyDome: SkyDome;
export let updateLODCallback: () => void;

let groundTerrain: ReturnType<typeof createTerrainTiles> | null = null;
let groundPosition: THREE.Vector3 | null = null;
let groundYaw = 0;
let groundPitch = Math.PI / 9;
let sceneDirty = false;
let animationFrame = 0;
let resizeHandler: (() => void) | null = null;
let savedCamera: {
	position: THREE.Vector3;
	target: THREE.Vector3;
	up: THREE.Vector3;
	fov: number;
	near: number;
	zoom: number;
} | null = null;

export const cameraFovDegrees = 1.0; // it was 5  - 1.0 has no artifacts almost, but less performant
export const cameraNear = 0.01;
export const cameraFar = 1000.0;

export let updateCloudShadowCallback: (() => void) | null = null;
export function setUpdateCloudShadowCallback(callback: () => void) {
	updateCloudShadowCallback = callback;
}

export function setUpdateLODCallback(callback: () => void) {
	updateLODCallback = callback;
}

function lookFromGround() {
	if (!groundPosition) return;
	camera.position.copy(groundPosition);
	const horizontal = Math.cos(groundPitch);
	camera.lookAt(
		groundPosition.x + Math.sin(groundYaw) * horizontal,
		groundPosition.y + Math.cos(groundYaw) * horizontal,
		groundPosition.z + Math.sin(groundPitch)
	);
	sceneDirty = true;
}

export function turnGroundView(dx: number, dy: number) {
	if (!groundPosition) return;
	groundYaw -= dx * 0.005;
	groundPitch = THREE.MathUtils.clamp(groundPitch + dy * 0.005, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
	lookFromGround();
}

export function enterGroundView(clientX: number, clientY: number, canvas: HTMLElement, onError: () => void): boolean {
	if (!cameraControls || groundPosition) return false;
	const rect = canvas.getBoundingClientRect();
	const pointer = new THREE.Vector2(
		((clientX - rect.left) / rect.width) * 2 - 1,
		-((clientY - rect.top) / rect.height) * 2 + 1
	);
	const raycaster = new THREE.Raycaster();
	raycaster.setFromCamera(pointer, camera);
	const point = raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), new THREE.Vector3());
	if (!point) return false;

	const terrain = createTerrainTiles(camera, renderer, () => (sceneDirty = true), cloudShadow, onError);
	savedCamera = {
		position: cameraControls.getPosition(new THREE.Vector3()),
		target: cameraControls.getTarget(new THREE.Vector3()),
		up: camera.up.clone(),
		fov: camera.fov,
		near: camera.near,
		zoom: camera.zoom
	};
	cameraControls.enabled = false;
	groundPosition = point;
	groundPosition.z = 1.7 / get(scaleFactor);
	groundYaw = 0;
	groundPitch = Math.PI / 9;
	camera.up.set(0, 0, 1);
	camera.fov = 60;
	camera.zoom = 1;
	camera.near = 0.2 / get(scaleFactor);
	camera.updateProjectionMatrix();
	groundTerrain = terrain;
	mapTiles.group.visible = false;
	scene.add(groundTerrain.tiles.group);
	lookFromGround();
	return true;
}

export function exitGroundView() {
	if (!groundPosition || !savedCamera || !cameraControls) return;
	groundPosition = null;
	if (groundTerrain) {
		scene.remove(groundTerrain.tiles.group);
		groundTerrain.tiles.dispose();
		groundTerrain = null;
	}
	mapTiles.group.visible = true;
	camera.up.copy(savedCamera.up);
	camera.fov = savedCamera.fov;
	camera.near = savedCamera.near;
	camera.zoom = savedCamera.zoom;
	camera.updateProjectionMatrix();
	cameraControls.updateCameraUp();
	const { position, target } = savedCamera;
	cameraControls.setLookAt(position.x, position.y, position.z, target.x, target.y, target.z, false);
	cameraControls.zoomTo(savedCamera.zoom, false);
	cameraControls.enabled = true;
	savedCamera = null;
	sceneDirty = true;
}

export function dispose3DScene() {
	cancelAnimationFrame(animationFrame);
	if (resizeHandler) window.removeEventListener('resize', resizeHandler);
	exitGroundView();
	cameraControls?.dispose();
	mapTiles?.dispose();
	renderer?.dispose();
}

// Render the scene. This function can be reused in other effects or callbacks.
export function renderScene(): void {
	// The shadow only depends on the cloud data and sun, not on the camera, so it is refreshed here only
	updateCloudShadowCallback?.();
	skyDome?.followCamera(camera);
	if (cameraControls) cloudShadow?.setHazeFocus(cameraControls.distance);
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
	// Check WebGL availability before attempting to create the renderer
	if (!WebGL.isWebGL2Available()) {
		const warning = WebGL.getWebGL2ErrorMessage();
		canvas.parentElement?.appendChild(warning);
		throw new Error('WebGL2 is not available in this browser/environment. ' + warning.textContent);
	}

	// Set up the Three.js scene and renderer
	scene = new THREE.Scene();
	renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas }); // Create a WebGLRenderer and specify the canvas to use

	camera = new THREE.PerspectiveCamera(cameraFovDegrees, window.innerWidth / window.innerHeight, cameraNear, cameraFar);

	camera.position.set(0, -30, 50); // Adjusted for scaled scene
	camera.lookAt(new THREE.Vector3(0, 0, 0));

	cameraControls = new CameraControls(camera, canvas);

	skyDome = new SkyDome(cameraFar * 0.9);
	scene.add(skyDome.mesh);

	// Add the map tiles (3DTilesRendererJS) to the scene
	let mapDirty = true;
	cloudShadow = new CloudShadow();
	mapTiles = createMapTiles(camera, renderer, () => (mapDirty = true), cloudShadow);
	scene.add(mapTiles.group);

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
		const cameraChanged = !groundPosition && cameraControls.update(delta);
		if (cameraChanged || mapDirty || sceneDirty) {
			mapDirty = false;
			sceneDirty = false;
			if (groundTerrain && groundPosition) {
				const elevation = groundTerrain.elevationAt(groundPosition.x, groundPosition.y);
				if (elevation !== null) {
					groundPosition.z = elevation + 1.7 / get(scaleFactor);
					lookFromGround();
					sceneDirty = false;
				}
			}
			camera.updateMatrixWorld();
			skyDome.followCamera(camera);
			cloudShadow.setHazeFocus(groundPosition ? 0.001 : cameraControls.distance);
			const activeTiles = groundTerrain?.tiles ?? mapTiles;
			activeTiles.setResolutionFromRenderer(camera, renderer);
			activeTiles.update();
			renderer.render(scene, camera);
			if (cameraChanged || groundPosition) updateLODCallback?.();
		}
		animationFrame = requestAnimationFrame(animate);
	}
	resizeHandler = () => {
		resize(canvas, camera);
		sceneDirty = true;
	};
	window.addEventListener('resize', resizeHandler);
	resize(canvas, camera);
	animate();
	renderer.render(scene, camera);

	// return Promise.resolve(scene); // Fix: Wrap the scene variable in a Promise.resolve() function
	// console.log('🔋 3d scene created');
}
