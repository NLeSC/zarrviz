import * as THREE from 'three';

// Light greyish blue at the horizon, dark blue at high altitude.
const HORIZON_COLOR = new THREE.Color(0.74, 0.8, 0.86);
const ZENITH_COLOR = new THREE.Color(0.05, 0.14, 0.45);
// How strongly the time-of-day sky colour (orange in the evening) tints the horizon haze.
const HORIZON_TINT = 0.5;

export class SkyDome {
	readonly mesh: THREE.Mesh;
	private readonly material: THREE.ShaderMaterial;

	constructor(radius: number) {
		this.material = new THREE.ShaderMaterial({
			side: THREE.BackSide,
			depthWrite: false,
			depthTest: false,
			fog: false,
			uniforms: {
				uHorizon: { value: HORIZON_COLOR.clone() },
				uZenith: { value: ZENITH_COLOR.clone() }
			},
			vertexShader: /* glsl */ `
				varying vec3 vDir;
				void main() {
					// World z is the altitude axis; the dome is only translated, never rotated.
					vDir = normalize(position);
					vec4 p = modelViewMatrix * vec4(position, 1.0);
					gl_Position = projectionMatrix * p;
				}
			`,
			fragmentShader: /* glsl */ `
				uniform vec3 uHorizon;
				uniform vec3 uZenith;
				varying vec3 vDir;
				void main() {
					float h = vDir.z;
					// Blurred horizon: haze band straddling the horizon, then a gradual climb to dark blue.
					float t = smoothstep(-0.02, 0.6, h);
					t = pow(t, 0.7);
					vec3 col = mix(uHorizon, uZenith, t);
					gl_FragColor = vec4(col, 1.0);
					#include <colorspace_fragment>
				}
			`
		});
		this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), this.material);
		this.mesh.scale.setScalar(radius);
		this.mesh.renderOrder = -1000;
		this.mesh.frustumCulled = false;
	}

	setTimeOfDaySky(skyColor: THREE.Color) {
		const base = HORIZON_COLOR.clone().lerp(skyColor, HORIZON_TINT * THREE.MathUtils.clamp(skyColor.r - skyColor.b, 0, 1));
		this.material.uniforms.uHorizon.value.copy(base);
	}

	// Current colour of the sky at the horizon; the ground fades into this colour in the distance.
	get horizonColor(): THREE.Color {
		return this.material.uniforms.uHorizon.value;
	}

	followCamera(camera: THREE.Camera) {
		this.mesh.position.copy(camera.position);
	}
}
