import * as THREE from 'three';
import vertexShaderShadow from '$lib/shaders/cloudShadow.vert';
import fragmentShaderSlab from '$lib/shaders/lightSlab.frag';
import fragmentShaderCopy from '$lib/shaders/slabCopy.frag';

// The light volume has this many times more z-slabs than the data, capped at MAX_LIGHT_DEPTH.
const Z_SUPERSAMPLING = 3;
const MAX_LIGHT_DEPTH = 192;

// Uniforms of the cloud volume material that the slab pass reuses.
const COPIED_UNIFORMS = ['volumeTex', 'dataConversionTex', 'boxSize', 'voxelSize', 'sunLightDir', 'bottomHeight', 'extinctionScale'];

/*
 * Sunlight transmittance for every voxel of a cloud volume, stored in a 3D texture with the same
 * layout as the data texture. It is built slab by slab from the top down: each slab takes the
 * slab above it, looked up at an xy offset along the sun direction, and attenuates it.
 * It only depends on the cloud data and the sun, not on the camera.
 */
export class LightVolume {
  private target: THREE.WebGL3DRenderTarget | null = null;
  private pingPong: THREE.WebGLRenderTarget[] = [];
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 1);
  private readonly quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  private readonly slabMaterial: THREE.ShaderMaterial;
  private readonly copyMaterial: THREE.ShaderMaterial;
  private readonly fallback: THREE.Data3DTexture;

  constructor() {
    this.slabMaterial = new THREE.ShaderMaterial({
      vertexShader: vertexShaderShadow,
      fragmentShader: fragmentShaderSlab,
      depthTest: false,
      depthWrite: false,
      uniforms: { prevSlab: { value: null }, slab: { value: 0 }, lightDepth: { value: 1 } }
    });
    this.copyMaterial = new THREE.ShaderMaterial({
      vertexShader: vertexShaderShadow,
      fragmentShader: fragmentShaderCopy,
      depthTest: false,
      depthWrite: false,
      uniforms: { source: { value: null } }
    });
    this.scene.add(this.quad);
    // Fully lit, used until the first volume has been computed.
    this.fallback = new THREE.Data3DTexture(new Uint8Array([255]), 1, 1, 1);
    this.fallback.format = THREE.RedFormat;
    this.fallback.type = THREE.UnsignedByteType;
    this.fallback.needsUpdate = true;
  }

  get texture(): THREE.Texture {
    return this.target ? this.target.texture : this.fallback;
  }

  compute(renderer: THREE.WebGLRenderer, cloudUniforms: { [uniform: string]: THREE.IUniform }) {
    const image = (cloudUniforms.volumeTex.value as THREE.Data3DTexture).image;
    const { width, height } = image;
    if (!width || !height || !image.depth) return;
    const depth = Math.min(image.depth * Z_SUPERSAMPLING, Math.max(MAX_LIGHT_DEPTH, image.depth));
    this.ensureTargets(width, height, depth);
    this.slabMaterial.uniforms.lightDepth.value = depth;

    for (const name of COPIED_UNIFORMS) {
      this.slabMaterial.uniforms[name] = cloudUniforms[name];
    }

    const previousTarget = renderer.getRenderTarget();
    const previousAutoClear = renderer.autoClear;
    renderer.autoClear = false;

    let previous = 0;
    for (let slab = depth - 1; slab >= 0; slab--) {
      const current = 1 - previous;
      this.slabMaterial.uniforms.slab.value = slab;
      this.slabMaterial.uniforms.prevSlab.value = this.pingPong[previous].texture;
      this.draw(renderer, this.slabMaterial, this.pingPong[current]);

      this.copyMaterial.uniforms.source.value = this.pingPong[current].texture;
      this.draw(renderer, this.copyMaterial, this.target!, slab);
      previous = current;
    }

    renderer.autoClear = previousAutoClear;
    renderer.setRenderTarget(previousTarget);
  }

  private draw(renderer: THREE.WebGLRenderer, material: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget, layer = 0) {
    this.quad.material = material;
    renderer.setRenderTarget(target, layer);
    renderer.render(this.scene, this.camera);
  }

  private ensureTargets(width: number, height: number, depth: number) {
    if (this.target && this.target.width === width && this.target.height === height && this.target.depth === depth) {
      return;
    }
    this.disposeTargets();
    this.target = new THREE.WebGL3DRenderTarget(width, height, depth, {
      format: THREE.RedFormat,
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false
    });
    // Half float keeps repeated per-slab attenuation from being rounded away.
    this.pingPong = [0, 1].map(
      () =>
        new THREE.WebGLRenderTarget(width, height, {
          format: THREE.RedFormat,
          type: THREE.HalfFloatType,
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          depthBuffer: false
        })
    );
  }

  private disposeTargets() {
    this.target?.dispose();
    this.pingPong.forEach((t) => t.dispose());
    this.target = null;
    this.pingPong = [];
  }

  dispose() {
    this.disposeTargets();
  }
}
