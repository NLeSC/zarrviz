import * as THREE from 'three';
import CameraControls from 'camera-controls';
import { cloudLayer, scaleFactor, showGrid } from '../stores/viewer.store';
import { get } from 'svelte/store';
import { createPlaneMesh } from './createPlaneMesh';
CameraControls.install({ THREE: THREE });

export let cameraControls: CameraControls | null = null;
let renderer: THREE.WebGLRenderer;
// Create the Three.js scene
let gridHelper: THREE.GridHelper;



// TODO:
// TODO:
// TODO: MAKE THIS WORK
// TODO:

export function toggleGrid() {
  // toggle showGrid
  showGrid.update($showGrid => !$showGrid);


  gridHelper.visible = get(showGrid); // Assuming gridHelper is your grid object
}

//
// Create and add a grid helper to the scene
//
function createGridHelper() {
  const gridSize = Math.max(280000, 325000) / get(scaleFactor); // in scene units
  const cellSize = 10000 / get(scaleFactor); // 10 km per cell, in scene units
  const gridDivisionsX = Math.floor(280000 / get(scaleFactor) / cellSize);
  const gridDivisionsY = Math.floor(325000 / get(scaleFactor) / cellSize);

  // Create a grid material with opacity
  const gridMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff, // or any color you prefer
    transparent: true,
    opacity: 0.5
  });
  gridHelper = new THREE.GridHelper(gridSize, Math.max(gridDivisionsX, gridDivisionsY), 0xffffff, 0xffffff);

  // Apply the custom material to each line of the gri
  gridHelper.traverse((child) => {
    if (child instanceof THREE.LineSegments) {
      child.material = gridMaterial;
    }
  });

  gridHelper.position.set(0, 0, 0.01); // Adjusted for scaled scene
  gridHelper.rotation.x = -Math.PI / 2;

  gridHelper.visible = get(showGrid);
  return gridHelper;
}



let cube: THREE.Mesh;
function addExampleCube(scene) {
  // Create a cube
  const cubeGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.1);
  const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

  const fragmentShader = `uniform float uTransparency;
                               void main() {
                                   gl_FragColor = vec4(1.0, 0.5, 0.0, uTransparency); // Example: Orange color
                               }`;

  const shaderMaterial = new THREE.ShaderMaterial({
    // vertexShader,
    fragmentShader,
    uniforms: {
      uTransparency: { value: get(cloudLayer).opacity / 100 }
    },
    transparent: true
  });

  cube = new THREE.Mesh(cubeGeometry, shaderMaterial);
  cube.position.set(-0.1, 0, 0.1); // Set the position of the cube


  cloudLayer.subscribe($cloudLayer => {
    // console.log('🎹 changed ranged', $cloudLayer);
    cube.material.uniforms.uTransparency.value = $cloudLayer.opacity / 100;

    // remove the cube from the scene if the opacity is 0
    if ($cloudLayer.enabled) {
      scene.add(cube);
    } else {
      scene.remove(cube);
    }
  })

  return cube; // Add the cube to the scene
}

export async function create3DScene({ canvas, camera, cameraNear, cameraFar, cameraFovDegrees }): Promise<THREE.Scene> {
  // Set up the Three.js scene
  console.log('🎹 3DDDDDD');

  const scene = new THREE.Scene();
  renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas }); // Create a WebGLRenderer and specify the canvas to use

  camera = new THREE.PerspectiveCamera(
    cameraFovDegrees,
    window.innerWidth / window.innerHeight,
    cameraNear,
    cameraFar
  );
  // camera.position.z = 5; // Adjust as needed
  // camera.position.set(0, -2, 1.7);
  // x: 0, y: -0.935916216369971, z: 0.9359162163699711
  camera.position.set(0, -10, 10); // Adjusted for scaled scene
  camera.lookAt(new THREE.Vector3(0, 0, 0));

  cameraControls = new CameraControls(camera, canvas);

  //
  // Add a plane with the Map to the scene
  //
  scene.add(createPlaneMesh());

  //
  // Add a grid to the scene to help visualize camera movement.
  //
  scene.add(createGridHelper());

  // Add exmample cube
  scene.add(addExampleCube(scene));


  //
  // Lights, to be used both during rendering the volume, and rendering the optional surface.
  //
  // Add the sun light to the scene
  // scene.add(sunLight);
  // Add the hemisphere light to the scene
  // scene.add(hemisphereLight);

  //
  // Render loop
  //
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    cameraControls.update(delta);
    renderer.render(scene, camera);
  }
  animate();

  function resize() {
    // Get the dimensions of the parent element
    const parent = canvas.parentElement;
    const width = parent.clientWidth;
    const height = parent.clientHeight;

    // Update the renderer and camera with the new sizes
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  // function resize() {
  // 	renderer.setSize(window.innerWidth, 400);
  // 	camera.aspect = window.innerWidth / 400;
  // 	camera.updateProjectionMatrix();
  // }
  window.addEventListener('resize', resize);
  resize();
  animate();

  return scene;
  // console.log('🔋 3d scene created');
}