import * as THREE from 'three';
import vertexShaderVolume from '$lib/shaders/volume.vert';
import fragmentShaderVolumeCloudsRelay from '$lib/shaders/volumeCloudsRelay.frag';
import { RemoteDataLayer } from './remoteDataLayer';
import { CloudLayer } from './cloudLayer';
import { camera } from './create3DScene';
import type { VariableStore } from '../stores/multiVariableStore';
import { createTileVariableStore } from '../stores/tileVariableStore';
import type { SpatialRegion } from '../stores/spatialRegion';

const TILE_BUFFER_SLICES = 4;

interface CloudTile {
  layer: CloudLayer;
  mesh: THREE.Mesh;
  boundingSphere: THREE.Sphere;
  loaded: boolean;
}

export interface RelayPassUniforms {
  isFirstPass: boolean;
  isLastPass: boolean;
  viewportSize: THREE.Vector2;
  relayStateTex: THREE.Texture;
  relayTTex: THREE.Texture;
}

/*
 * Manages the finest LOD level of the cloud layer as a tilesX x tilesY grid of
 * independently fetched tiles. Only tiles currently intersecting the camera
 * frustum have their data fetched and their GPU texture kept resident; tiles that
 * scroll out of view are hidden and have their texture disposed.
 *
 * Rendering uses a multi-pass GPU "ray relay": each tile only ray-marches within
 * its own horizontal footprint (it can't see other tiles' data), and hands off its
 * accumulated state to whichever tile owns the next leg of the ray via an off-screen
 * ping-pong buffer (see tileRelayRenderer.ts). Because of this, the render object
 * returned by getRenderObject() is just an empty placeholder used for THREE.LOD
 * level-switch bookkeeping; the actual tile meshes are rendered separately by the
 * relay renderer (see getTileGroup()), not through the normal scene graph.
 */
export class TiledCloudLayer extends RemoteDataLayer {
  private tiles: CloudTile[] = [];
  private group: THREE.Group;
  private placeholder: THREE.Object3D;
  private readonly tilesX: number;
  private readonly tilesY: number;
  private pendingUpdate: Promise<void> = Promise.resolve();
  private transparency = 1.0;

  constructor(variable: string, baseVariableStore: VariableStore, tilesX: number, tilesY: number, boxZ: number) {
    super(variable, baseVariableStore, new THREE.BoxGeometry(1, 1, boxZ), vertexShaderVolume, fragmentShaderVolumeCloudsRelay);
    this.tilesX = tilesX;
    this.tilesY = tilesY;
  }

  initialize(): THREE.Object3D {
    const baseInfo = this.variableStore.variableInfo;
    const nx = baseInfo.numCellsXYZ[0];
    const ny = baseInfo.numCellsXYZ[1];
    // Ray/box intersection math (intersectBox/pSized in volumeCloudsRelay.frag) is
    // defined relative to the FULL domain, centered at the origin - every tile
    // must keep using the full domain's boxSize, not its own (cropped) one.
    const fullBoxSize = baseInfo.getBoxSizes();
    this.geometry.computeBoundingBox();
    const bb = this.geometry.boundingBox;
    const tileWidth = (bb.max.x - bb.min.x) / this.tilesX;
    const tileHeight = (bb.max.y - bb.min.y) / this.tilesY;
    const sizeZ = bb.max.z - bb.min.z;
    const centerZ = (bb.min.z + bb.max.z) / 2;
    // Adjacent tiles are separate (non-watertight) meshes, so rasterization can leave
    // a hairline gap with no fragment at all along their shared edge. Pad the actual
    // geometry slightly larger than its logical footprint so neighbors overlap a bit;
    // the analytical ownership test (uvOffset/uvScale, set below) stays exact, so the
    // overlap only affects which tile's fragment gets *considered*, not who wins.
    const skirt = 1.02;

    this.group = new THREE.Group();
    for (let iy = 0; iy < this.tilesY; iy++) {
      for (let ix = 0; ix < this.tilesX; ix++) {
        const region: SpatialRegion = {
          xStart: Math.floor((ix / this.tilesX) * nx),
          xEnd: Math.floor(((ix + 1) / this.tilesX) * nx),
          yStart: Math.floor((iy / this.tilesY) * ny),
          yEnd: Math.floor(((iy + 1) / this.tilesY) * ny),
        };
        const tileVariableStore = createTileVariableStore(this.variableStore, region, TILE_BUFFER_SLICES, this.variable);
        const tileGeometry = new THREE.BoxGeometry(tileWidth * skirt, tileHeight * skirt, sizeZ);
        tileGeometry.translate(
          bb.min.x + (ix + 0.5) * tileWidth,
          bb.min.y + (iy + 0.5) * tileHeight,
          centerZ
        );
        tileGeometry.computeBoundingSphere();

        const tileLayer = new CloudLayer(this.variable, tileVariableStore, tileGeometry, fragmentShaderVolumeCloudsRelay);
        const mesh = tileLayer.initialize();
        const material = tileLayer.getMaterial();
        // Explicit MRT (layout(location=N) out ...) requires real GLSL3, or three.js
        // still injects its own gl_FragColor shim at location 0 and conflicts with it.
        material.glslVersion = THREE.GLSL3;
        // Relay passes overwrite ping-pong state directly via explicit discard-based
        // ownership, not GPU blending/depth testing.
        material.blending = THREE.NoBlending;
        material.depthWrite = false;
        tileLayer.updateUniforms({ boxSize: new THREE.Vector3(...fullBoxSize) });
        tileLayer.setTileRegion(
          new THREE.Vector3(region.xStart / nx, region.yStart / ny, 0),
          new THREE.Vector3((region.xEnd - region.xStart) / nx, (region.yEnd - region.yStart) / ny, 1)
        );
        mesh.visible = false;
        this.group.add(mesh);
        this.tiles.push({ layer: tileLayer, mesh, boundingSphere: tileGeometry.boundingSphere.clone(), loaded: false });
      }
    }

    this.placeholder = new THREE.Object3D();
    this.placeholder.visible = false;
    return this.placeholder;
  }

  getRenderObject(): THREE.Object3D {
    return this.placeholder;
  }

  // The actual tile meshes, rendered by TileRelayRenderer via multiple off-screen
  // passes rather than through the normal single-pass scene graph.
  getTileGroup(): THREE.Group {
    return this.group;
  }

  isFinestLevelActive(): boolean {
    return this.placeholder.visible;
  }

  // Worst case a ray needs one relay hop per tile boundary it crosses.
  getMaxRelayPasses(): number {
    return this.tilesX + this.tilesY - 1;
  }

  getTransparency(): number {
    return this.transparency;
  }

  setRelayPassUniforms(uniforms: RelayPassUniforms) {
    for (const tile of this.tiles) {
      tile.layer.updateUniforms(uniforms);
    }
  }

  getDataTexture(): THREE.Texture {
    // Only used as an interim texture source while switching LOD levels; any
    // currently-loaded tile is a fine approximation for that one transient frame.
    const loadedTile = this.tiles.find((tile) => tile.loaded);
    return loadedTile ? loadedTile.layer.getDataTexture() : null;
  }

  // interimTexture is accepted for interface compatibility with RemoteDataLayer but
  // unused: visibility-driven per-tile fetching already handles newly-shown tiles.
  async update(timestep: number, _interimTexture: THREE.Texture = null): Promise<void> {
    this.pendingUpdate = this.pendingUpdate.then(() => this.refreshTiles(timestep));
    return this.pendingUpdate;
  }

  private async refreshTiles(timestep: number): Promise<void> {
    const frustum = this.computeFrustum();
    await Promise.all(this.tiles.map((tile) => this.refreshTile(tile, timestep, frustum)));
  }

  private async refreshTile(tile: CloudTile, timestep: number, frustum: THREE.Frustum): Promise<void> {
    const visible = frustum.intersectsSphere(tile.boundingSphere);
    if (visible) {
      tile.loaded = true;
      tile.mesh.visible = true;
      await tile.layer.update(timestep);
    } else if (tile.loaded) {
      tile.loaded = false;
      tile.mesh.visible = false;
      tile.layer.getDataTexture()?.dispose();
    }
  }

  displace(subStep: number, subStepsPerStep: number, wind: number[]) {
    for (const tile of this.tiles) {
      if (tile.loaded) {
        tile.layer.displace(subStep, subStepsPerStep, wind);
      }
    }
  }

  updateUniforms(uniforms: { [uniform: string]: any }) {
    if ('uTransparency' in uniforms) {
      this.transparency = uniforms.uTransparency;
    }
    for (const tile of this.tiles) {
      tile.layer.updateUniforms(uniforms);
    }
  }

  private computeFrustum(): THREE.Frustum {
    camera.updateMatrixWorld();
    const matrix = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    return new THREE.Frustum().setFromProjectionMatrix(matrix);
  }
}
