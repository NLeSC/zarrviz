import * as THREE from 'three';
import { get } from 'svelte/store';
import { TilesRenderer } from '3d-tiles-renderer';
// GeneratedSurfacePlugin is exported at runtime but missing from the package typings
// @ts-expect-error missing type declaration
import { GeneratedSurfacePlugin, XYZTilesOverlay } from '3d-tiles-renderer/plugins';
import { scaleFactor } from '../stores/viewer.store';
import type { CloudShadow } from './cloudShadow';

const EARTH_CIRCUMFERENCE = 40075016.686; // Web Mercator world width in meters
// Geographic center of the data domain (center of the Netherlands)
const CENTER_LON = 5.17;
const CENTER_LAT = 52.13;

// Normalized Web Mercator coordinates ([0, 1], v pointing north)
function toMercatorNormalized(lon: number, lat: number): [number, number] {
  const u = (lon + 180) / 360;
  const v = 0.5 + Math.log(Math.tan(Math.PI / 4 + THREE.MathUtils.degToRad(lat) / 2)) / (2 * Math.PI);
  return [u, v];
}

//
// Create a 3DTilesRendererJS tile set (satellite tiles on a flat surface) that replaces the static map plane.
// The tiles are scaled so that 1 scene unit equals `scaleFactor` ground meters, with the center of the
// Netherlands at the scene origin.
//
export function createMapTiles(
  camera: THREE.Camera,
  renderer: THREE.WebGLRenderer,
  onChange: () => void,
  cloudShadow: CloudShadow
): TilesRenderer {
  const tiles = new TilesRenderer();
  tiles.registerPlugin(
    new GeneratedSurfacePlugin({
      projection: 'source',
      applyOverlayTexture: true,
      overlay: new XYZTilesOverlay({
        // Sentinel-2 cloudless 2021 by EOX (10 m, CC BY-NC-SA 4.0, attribution: Sentinel-2 cloudless by EOX)
        url: 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2021_3857/default/g/{z}/{y}/{x}.jpg',
        levels: 15
      })
    })
  );

  // Mercator stretches distances by 1/cos(lat); compensate at the center latitude
  const scale =
    (EARTH_CIRCUMFERENCE * Math.cos(THREE.MathUtils.degToRad(CENTER_LAT))) / get(scaleFactor);
  const [u, v] = toMercatorNormalized(CENTER_LON, CENTER_LAT);
  tiles.group.scale.setScalar(scale);
  tiles.group.position.set(-(u - 0.5) * scale, -(v - 0.5) * scale, 0);
  tiles.group.updateMatrixWorld(true);

  tiles.setCamera(camera);
  tiles.setResolutionFromRenderer(camera, renderer);
  tiles.addEventListener('needs-update', onChange);
  const shadowedMaterials = new WeakSet<THREE.Material>();
  tiles.addEventListener('load-model', ({ scene }: { scene: THREE.Object3D }) => {
    scene.traverse((object) => {
      const material = (object as THREE.Mesh).material as THREE.Material | undefined;
      if (material && !shadowedMaterials.has(material)) {
        shadowedMaterials.add(material);
        cloudShadow.applyToMaterial(material);
      }
    });
    onChange();
  });
  return tiles;
}
