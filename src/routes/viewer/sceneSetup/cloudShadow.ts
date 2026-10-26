import * as THREE from 'three';
import vertexShaderShadow from '$lib/shaders/cloudShadow.vert';
import fragmentShaderShadow from '$lib/shaders/cloudShadow.frag';
import type { RemoteDataLayer } from './remoteDataLayer';

const SHADOW_MAP_WIDTH = 1024;
const SHADOW_STRENGTH = 0.4;

// Uniforms of the cloud volume material that the shadow pass reuses.
const COPIED_UNIFORMS = ['lightTex', 'displacement', 'sunLightDir'];

/*
 * Renders the cloud volume's shadow onto a top-down texture: every texel looks up the sunlight
 * transmittance (see LightVolume) at the point where its sun ray enters the volume.
 * Materials passed to applyToMaterial() sample that texture by world xy and darken accordingly.
 */
export class CloudShadow {
	private readonly renderTarget: THREE.WebGLRenderTarget;
	private readonly passScene = new THREE.Scene();
	private readonly passCamera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 1);
	private readonly passMaterial: THREE.ShaderMaterial;
	private readonly sampleUniforms = {
		uCloudShadowMap: { value: null as THREE.Texture | null },
		uCloudShadowSize: { value: new THREE.Vector2(1, 1) },
		uCloudShadowStrength: { value: 0.0 },
		uGroundTint: { value: new THREE.Color(1, 1, 1) }
	};

	constructor() {
		this.renderTarget = new THREE.WebGLRenderTarget(SHADOW_MAP_WIDTH, SHADOW_MAP_WIDTH, {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			depthBuffer: false
		});
		this.sampleUniforms.uCloudShadowMap.value = this.renderTarget.texture;
		this.passMaterial = new THREE.ShaderMaterial({
			vertexShader: vertexShaderShadow,
			fragmentShader: fragmentShaderShadow,
			depthTest: false,
			depthWrite: false,
			uniforms: {
				boxSize: { value: new THREE.Vector3(1, 1, 1) },
				footprintSize: { value: new THREE.Vector2(1, 1) },
				groundZ: { value: 0 }
			}
		});
		this.passScene.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.passMaterial));
	}

	// Re-renders the shadow texture from the given cloud layer; with no layer the shadows are switched off.
	update(renderer: THREE.WebGLRenderer, layer: RemoteDataLayer | null) {
		const object = layer?.getRenderObject();
		if (!layer || !object) {
			this.sampleUniforms.uCloudShadowStrength.value = 0;
			return;
		}
		const sourceUniforms = layer.getMaterial().uniforms;
		const uniforms = this.passMaterial.uniforms;
		for (const name of COPIED_UNIFORMS) {
			uniforms[name] = sourceUniforms[name];
		}
		const boxSize = layer.variableStore.variableInfo.getBoxSizes();
		uniforms.boxSize.value.set(boxSize[0], boxSize[1], boxSize[2] ?? 1);
		uniforms.footprintSize.value.set(boxSize[0], boxSize[1]);
		// Ground (world z = 0) expressed in the volume's object space
		uniforms.groundZ.value = -object.position.z;
		this.sampleUniforms.uCloudShadowSize.value.set(boxSize[0], boxSize[1]);
		this.sampleUniforms.uCloudShadowStrength.value = SHADOW_STRENGTH;

		const previousTarget = renderer.getRenderTarget();
		renderer.setRenderTarget(this.renderTarget);
		renderer.render(this.passScene, this.passCamera);
		renderer.setRenderTarget(previousTarget);
	}

	// Colour that the surface materials patched by applyToMaterial() are multiplied with (time-of-day lighting).
	setGroundTint(color: THREE.Color) {
		this.sampleUniforms.uGroundTint.value.copy(color);
	}

	// Patches a (surface) material so it is darkened where the shadow texture says so.
	applyToMaterial(material: THREE.Material) {
		const previousOnBeforeCompile = material.onBeforeCompile;
		const previousCacheKey = material.customProgramCacheKey;
		material.onBeforeCompile = (shader, rendererArg) => {
			previousOnBeforeCompile.call(material, shader, rendererArg);
			Object.assign(shader.uniforms, this.sampleUniforms);
			shader.vertexShader = shader.vertexShader
				.replace('void main()', 'varying vec3 vCloudShadowWorld;\nvoid main()')
				.replace(
					'#include <project_vertex>',
					'#include <project_vertex>\n  vCloudShadowWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;'
				);
			shader.fragmentShader = shader.fragmentShader
				.replace(
					'void main()',
					`varying vec3 vCloudShadowWorld;
uniform sampler2D uCloudShadowMap;
uniform vec2 uCloudShadowSize;
uniform float uCloudShadowStrength;
uniform vec3 uGroundTint;
void main()`
				)
				.replace(
					'#include <dithering_fragment>',
					`#include <dithering_fragment>
  gl_FragColor.rgb *= uGroundTint;
  vec2 cloudShadowUv = vCloudShadowWorld.xy / uCloudShadowSize + 0.5;
  if (all(greaterThanEqual(cloudShadowUv, vec2(0.0))) && all(lessThanEqual(cloudShadowUv, vec2(1.0)))) {
    gl_FragColor.rgb *= mix(1.0 - uCloudShadowStrength, 1.0, texture2D(uCloudShadowMap, cloudShadowUv).r);
  }`
				);
		};
		material.customProgramCacheKey = () => previousCacheKey.call(material) + '|cloudShadow';
		material.needsUpdate = true;
	}
}
