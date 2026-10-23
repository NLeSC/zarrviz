import * as THREE from 'three';
import vertexShader from '$lib/shaders/cloudShadow.vert';
import sampleShader from '$lib/shaders/flowSample.frag';
import downsampleShader from '$lib/shaders/flowDownsample.frag';
import blurShader from '$lib/shaders/flowBlur.frag';
import initShader from '$lib/shaders/flowInit.frag';
import upsampleShader from '$lib/shaders/flowUpsample.frag';
import warpShader from '$lib/shaders/flowWarp.frag';
import gradientShader from '$lib/shaders/flowGradient.frag';
import iterateShader from '$lib/shaders/flowIterate.frag';
import outputShader from '$lib/shaders/flowOutput.frag';

type Dims = [number, number, number];

// The finest analysed level has at most this many voxels along any axis; axes are not halved below MIN_DIM.
const MAX_DIM = 96;
const MIN_DIM = 12;
const MAX_LEVELS = 4;
const WARPS = 2;
// Jacobi iterations on the finest level; every coarser level doubles this, capped at MAX_ITERATIONS.
const ITERATIONS = 20;
const MAX_ITERATIONS = 100;
// Weight of the smoothness term, relative to the intensity gradients (which are in [0, 1] per voxel).
const SMOOTHNESS = 0.2;
// The residual flow is clamped to this many v3oxels of the finest analysed level.
const MAX_RESIDUAL_VOXELS = 12;

interface Level {
  dims: Dims;
  columns: number;
  // Voxels of the previous (finer) level that are averaged into one voxel of this level.
  factor: Dims;
  // r: current frame, g: next frame; unfiltered and smoothed.
  raw: THREE.WebGLRenderTarget;
  image: THREE.WebGLRenderTarget;
  warped: THREE.WebGLRenderTarget;
  // Spatial gradient and temporal difference.
  derivatives: THREE.WebGLRenderTarget;
  flows: THREE.WebGLRenderTarget[];
}

const vec3 = (d: Dims) => new THREE.Vector3(d[0], d[1], d[2]);

/*
 * Vertical optical flow between two volume textures, computed on the GPU: multiscale Horn-Schunck
 * with warping, restricted to the positive z-direction. The next frame is first translated back by a
 * global (wind) displacement, which is horizontal, so that only the residual vertical motion remains
 * to be estimated. Volumes are processed as 2D atlases of their z-slices, so that one Jacobi
 * iteration is a single draw call.
 *
 * The flow that carries the first volume onto the second is returned as a 3D texture (valid until the
 * next call) in normalized texture coordinates, with only a non-negative z-component:
 * second(x + initialFlow + residual) ~ first(x).
 */
export class GpuOpticalFlow {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 1);
  private readonly quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  private readonly materials: { [name: string]: THREE.ShaderMaterial };
  private levels: Level[] = [];
  private levelsFor = '';
  private output: THREE.WebGL3DRenderTarget | null = null;

  constructor() {
    const make = (fragmentShader: string, uniforms: string[]) => {
      const values: { [name: string]: THREE.IUniform } = { dims: { value: new THREE.Vector3() }, columns: { value: 1 } };
      for (const name of uniforms) values[name] = { value: null };
      return new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms: values, depthTest: false, depthWrite: false });
    };
    this.materials = {
      sample: make(sampleShader, ['volumeA', 'volumeB', 'blockSize', 'dataScale', 'dataEpsilon']),
      downsample: make(downsampleShader, ['source', 'sourceDims', 'sourceColumns', 'factor']),
      blur: make(blurShader, ['source']),
      init: make(initShader, ['initialFlow']),
      upsample: make(upsampleShader, ['source', 'sourceDims', 'sourceColumns']),
      warp: make(warpShader, ['image', 'flow']),
      gradient: make(gradientShader, ['image', 'warped']),
      iterate: make(iterateShader, ['flow', 'startFlow', 'derivatives', 'smoothness2', 'initialFlow']),
      output: make(outputShader, ['flow', 'slab', 'initialFlow', 'maxResidual'])
    };
    this.scene.add(this.quad);
  }

  private static levelLayout(sourceDims: Dims): { dims: Dims; factor: Dims }[] {
    const first = sourceDims.map((n) => Math.max(1, Math.ceil(n / MAX_DIM))) as Dims;
    let dims = sourceDims.map((n, i) => Math.ceil(n / first[i])) as Dims;
    const layout = [{ dims, factor: first }];
    while (layout.length < MAX_LEVELS) {
      const factor = dims.map((n) => (n >= 2 * MIN_DIM ? 2 : 1)) as Dims;
      if (factor.every((f) => f === 1)) break;
      dims = dims.map((n, i) => Math.ceil(n / factor[i])) as Dims;
      layout.push({ dims, factor });
    }
    return layout;
  }

  private static makeAtlas(dims: Dims, columns: number): THREE.WebGLRenderTarget {
    const rows = Math.ceil(dims[2] / columns);
    return new THREE.WebGLRenderTarget(columns * dims[0], rows * dims[1], {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: false
    });
  }

  private ensureLevels(sourceDims: Dims) {
    const key = sourceDims.join('x');
    if (key === this.levelsFor) return;
    this.disposeTargets();
    this.levelsFor = key;
    this.levels = GpuOpticalFlow.levelLayout(sourceDims).map(({ dims, factor }) => {
      const columns = Math.ceil(Math.sqrt(dims[2]));
      const atlas = () => GpuOpticalFlow.makeAtlas(dims, columns);
      return { dims, columns, factor, raw: atlas(), image: atlas(), warped: atlas(), derivatives: atlas(), flows: [atlas(), atlas(), atlas()] };
    });
    const [nx, ny, nz] = this.levels[0].dims;
    this.output = new THREE.WebGL3DRenderTarget(nx, ny, nz, {
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false
    });
  }

  private draw(
    renderer: THREE.WebGLRenderer,
    name: string,
    target: THREE.WebGLRenderTarget,
    grid: { dims: Dims; columns: number },
    uniforms: { [name: string]: unknown } = {},
    layer = 0
  ) {
    const material = this.materials[name];
    material.uniforms.dims.value.set(...grid.dims);
    material.uniforms.columns.value = grid.columns;
    for (const [uniform, value] of Object.entries(uniforms)) {
      material.uniforms[uniform].value = value;
    }
    this.quad.material = material;
    renderer.setRenderTarget(target, layer);
    renderer.render(this.scene, this.camera);
  }

  compute(
    renderer: THREE.WebGLRenderer,
    volumeA: THREE.Texture,
    volumeB: THREE.Texture,
    sourceDims: Dims,
    initialFlow: [number, number, number],
    dataScale: number,
    dataEpsilon: number
  ): THREE.Texture {
    this.ensureLevels(sourceDims);
    const previousTarget = renderer.getRenderTarget();
    const previousAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    const initial = new THREE.Vector3(...initialFlow);

    // Image pyramid.
    this.levels.forEach((level, l) => {
      if (l === 0) {
        const blockSize = new THREE.Vector3(sourceDims[0] / level.dims[0], sourceDims[1] / level.dims[1], sourceDims[2] / level.dims[2]);
        this.draw(renderer, 'sample', level.raw, level, { volumeA, volumeB, blockSize, dataScale, dataEpsilon });
      } else {
        const finer = this.levels[l - 1];
        this.draw(renderer, 'downsample', level.raw, level, {
          source: finer.raw.texture,
          sourceDims: vec3(finer.dims),
          sourceColumns: finer.columns,
          factor: vec3(level.factor)
        });
      }
      this.draw(renderer, 'blur', level.image, level, { source: level.raw.texture });
    });

    // Flow, from the coarsest level to the finest.
    let flow: THREE.WebGLRenderTarget | null = null;
    for (let l = this.levels.length - 1; l >= 0; l--) {
      const level = this.levels[l];
      let start = level.flows[0];
      if (!flow) {
        this.draw(renderer, 'init', start, level, { initialFlow: initial });
      } else {
        const coarser = this.levels[l + 1];
        this.draw(renderer, 'upsample', start, level, {
          source: flow.texture,
          sourceDims: vec3(coarser.dims),
          sourceColumns: coarser.columns
        });
      }
      const iterations = Math.min(MAX_ITERATIONS, ITERATIONS * 2 ** l);
      for (let warp = 0; warp < WARPS; warp++) {
        this.draw(renderer, 'warp', level.warped, level, { image: level.image.texture, flow: start.texture });
        this.draw(renderer, 'gradient', level.derivatives, level, { image: level.image.texture, warped: level.warped.texture });
        // Iterations alternate between the two targets that do not hold the flow the warp started from.
        const free = level.flows.filter((target) => target !== start);
        let current = start;
        for (let i = 0; i < iterations; i++) {
          const next = current === free[0] ? free[1] : free[0];
          this.draw(renderer, 'iterate', next, level, {
            flow: current.texture,
            startFlow: start.texture,
            derivatives: level.derivatives.texture,
            smoothness2: SMOOTHNESS * SMOOTHNESS,
            initialFlow: initial
          });
          current = next;
        }
        start = current;
      }
      flow = start;
    }

    const finest = this.levels[0];
    for (let slab = 0; slab < finest.dims[2]; slab++) {
      this.draw(
        renderer,
        'output',
        this.output as unknown as THREE.WebGLRenderTarget,
        finest,
        { flow: flow!.texture, slab, initialFlow: initial, maxResidual: MAX_RESIDUAL_VOXELS },
        slab
      );
    }

    renderer.autoClear = previousAutoClear;
    renderer.setRenderTarget(previousTarget);
    return this.output!.texture;
  }

  private disposeTargets() {
    for (const level of this.levels) {
      [level.raw, level.image, level.warped, level.derivatives, ...level.flows].forEach((target) => target.dispose());
    }
    this.levels = [];
    this.levelsFor = '';
    this.output?.dispose();
    this.output = null;
  }

  dispose() {
    this.disposeTargets();
  }
}

// A 1x1x1 flow texture of zeros, for when no flow is available.
export function makeEmptyFlowTexture(): THREE.Data3DTexture {
  const texture = new THREE.Data3DTexture(new Uint16Array(4), 1, 1, 1);
  texture.format = THREE.RGBAFormat;
  texture.type = THREE.HalfFloatType;
  texture.needsUpdate = true;
  return texture;
}

// A 1x1x1 volume of zeros, for when there is no next frame.
export function makeEmptyVolumeTexture(): THREE.Data3DTexture {
  const texture = new THREE.Data3DTexture(new Uint8Array(1), 1, 1, 1);
  texture.format = THREE.RedFormat;
  texture.type = THREE.UnsignedByteType;
  texture.needsUpdate = true;
  return texture;
}
