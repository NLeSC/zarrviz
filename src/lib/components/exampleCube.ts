import * as THREE from 'three';

export function addExampleCube() {
  // Create a cube
  const cubeGeometry = new THREE.BoxGeometry(33, 33, 1);
  const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
  cube.position.set(-1, 0, 0); // Set the position of the cube
  return cube; // Add the cube to the scene
}