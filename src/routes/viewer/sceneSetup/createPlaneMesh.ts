import * as THREE from 'three';
import { get } from 'svelte/store'
import { scaleFactor } from '../stores/viewer.store';
//
// Create and add  plane mesh to the scene to hold the Map texture
//
export function createPlaneMesh(): THREE.Mesh {
  const textureLoader = new THREE.TextureLoader();
  const texture = textureLoader.load('/maps/nl_map 50m per pixel.webp');
  texture.encoding = THREE.sRGBEncoding;

  // Scale factor: 50 meters per pixel
  const mapWidth = (5600 * 50) / get(scaleFactor); // in scene units
  const mapHeight = (6500 * 50) / get(scaleFactor); // in scene units

  // Create a plane geometry and mesh
  const planeGeometry = new THREE.PlaneGeometry(mapWidth, mapHeight);
  const planeMaterial = new THREE.MeshBasicMaterial({
    map: texture
    //			side: THREE.DoubleSide
  });

  const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);

  // Rotate the plane to align it with the XY plane
  // planeMesh.rotation.x = -Math.PI / 2;

  // Assuming you want the map centered at the origin
  planeMesh.position.set(0, 0, 0);

  return planeMesh;
}