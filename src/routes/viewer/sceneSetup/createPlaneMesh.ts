import * as THREE from 'three';
import { get } from 'svelte/store'
import { scaleFactor } from '../stores/viewer.store';
//
// Create and add  plane mesh to the scene to hold the Map texture
//
export function createPlaneMesh(): THREE.Mesh {
  const textureLoader = new THREE.TextureLoader();
  const texture = textureLoader.load('/maps/nl_map 50m per pixel.webp');
  // texture.encoding = THREE.sRGBEncoding;
  // TODO Replace with the following line when the texture is in sRGB
  texture.colorSpace = THREE.SRGBColorSpace;

  // Scale factor: 50 meters per pixel
  const mapWidth = (5600 * 50) / get(scaleFactor); // in scene units
  const mapHeight = (6500 * 50) / get(scaleFactor); // in scene units

  // Create a plane geometry and mesh
  const geometry = new THREE.PlaneGeometry(mapWidth, mapHeight);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geometry, material);

  // Rotate the plane to align it with the XY plane
  // mesh.rotation.x = -Math.PI / 2;

  // Position the plane 1 meter below the scene origin
  mesh.position.set(0, 0, -0.02);

  return mesh;
}