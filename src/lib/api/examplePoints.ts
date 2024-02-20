import * as THREE from 'three';

export default function getExamplePoints() {
  //
  // EXAMPLE POINTS
  //
  // Create a buffer to store positions of points.
  const numberOfPoints = 50000;
  const positions = new Float32Array(numberOfPoints * 3);
  const dataUint8 = new Uint8Array(numberOfPoints);

  // Populate the position buffer and dataUint8 with random data.
  for (let i = 0; i < numberOfPoints; i++) {
    positions[i * 3] = Math.random() * 2 - 1; // x
    positions[i * 3 + 1] = Math.random() * 2 - 1; // y
    positions[i * 3 + 2] = Math.random() * 2 - 1; // z

    // Fill dataUint8 with random values.
    dataUint8[i] = Math.floor(Math.random() * 255);
  }

  // Create an instance of THREE.BufferGeometry and set the random positions as its attribute.
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // Use THREE.PointsMaterial to create a material for the points. The color can be set as needed.
  const material = new THREE.PointsMaterial({ size: 0.02, vertexColors: false });

  // Create a points object with the geometry and material.
  const points = new THREE.Points(geometry, material);
  return points;
}