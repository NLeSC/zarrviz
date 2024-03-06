
import * as THREE from 'three';
import { get } from "svelte/store";
import { scaleFactor, showGrid } from "../stores/viewer.store";

//
// Create and add a grid helper to the scene
// 10km grid, 280km x 325km
//
export function createGridHelper(): THREE.GridHelper {
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

  const gridHelper: THREE.GridHelper = new THREE.GridHelper(gridSize, Math.max(gridDivisionsX, gridDivisionsY), 0xffffff, 0xffffff);

  // Apply the custom material to each line of the grid
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
