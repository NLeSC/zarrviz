import { RemoteDataLayer } from './remoteDataLayer';
import vertexShaderVolume from '$lib/shaders/volume.vert';
import fragmentShaderVolumeClouds from '$lib/shaders/volumeClouds.frag'; // ql
import type { VariableStore } from '../stores/multiVariableStore';
import { makeDataConversionTex } from '$lib/utils/makeDataConversionTex';
import * as THREE from 'three';
import { LightVolume } from './lightVolume';
import { renderer, renderScene } from './create3DScene';
import { noonWhiteBalance, sunDirection, sunLightingAt, type SunLighting } from './timeOfDay';
import { get } from 'svelte/store';
import { timeOfDay } from '../stores/viewer.store';

export class CloudLayer extends RemoteDataLayer {
    dataScaleValue: number;
    private static readonly DATA_EPSILON = 1e-11;
    private static readonly BASE_DT_SCALE = 0.9;
    // Per-LOD-level values (index 0 = finest); levels beyond the table reuse the last entry.
    // Smaller dtScale limits step banding; smaller extinctionScale offsets density inflated by max-coarsening.
    private static readonly LOD_DT_SCALE = [0.9, 0.6, 0.45, 0.3];
    private static readonly LOD_EXTINCTION_SCALE = [1.0, 0.7, 0.5, 0.35];
    // Smaller steps so the sub-voxel noise is not undersampled.
    private static readonly DETAIL_DT_SCALE = 0.5;
    private lodDtScale = CloudLayer.BASE_DT_SCALE;
    private readonly lightVolume = new LightVolume();
    constructor(variable: string, variableStore: VariableStore, geometry: THREE.BufferGeometry) {
        super(variable, variableStore, geometry, vertexShaderVolume, fragmentShaderVolumeClouds);
        this.dataScaleValue = 0.00446; // Default value, adjust as needed
    }

    setLodLevel(level: number) {
        const pick = (table: number[]) => table[Math.min(level, table.length - 1)];
        this.lodDtScale = pick(CloudLayer.LOD_DT_SCALE);
        this.updateUniforms({
            dtScale: this.lodDtScale,
            extinctionScale: pick(CloudLayer.LOD_EXTINCTION_SCALE),
        });
    }

    // recomputeLight: only needed for the layer that is currently rendered; others recompute on their next update().
    setSunLighting(lighting: SunLighting, recomputeLight: boolean) {
        this.updateUniforms({
            sunLightDir: sunDirection(lighting.azimuthDeg, lighting.elevationDeg),
            sunLightColor: lighting.sunColor,
            solarFactor: lighting.solarFactor,
            ambientLightColorTop: lighting.ambientTop,
            ambientLightColorBot: lighting.ambientBottom
        });
        if (recomputeLight) this.updateLightVolume();
    }

    async update(timestep: number, interimTexture: THREE.Texture = null) {
        await super.update(timestep, interimTexture);
        this.updateLightVolume();
    }

    disposeTexture() {
        super.disposeTexture();
        this.lightVolume.dispose();
        this.updateUniforms({ lightTex: this.lightVolume.texture });
    }

    // Recomputes the per-voxel sunlight transmittance; it depends only on the data and the sun.
    private updateLightVolume() {
        if (!renderer) return;
        this.lightVolume.compute(renderer, this.getMaterial().uniforms);
        this.updateUniforms({ lightTex: this.lightVolume.texture });
        // The ground shadow is only refreshed when the scene is rendered, and this can finish after the last render.
        renderScene();
    }

    // amount in [0, 1]: strength of the procedural erosion noise (finest level only).
    setDetailAmount(amount: number) {
        const detailDt = Math.min(this.lodDtScale, CloudLayer.DETAIL_DT_SCALE);
        this.updateUniforms({
            noiseStrength: amount,
            dtScale: THREE.MathUtils.lerp(this.lodDtScale, detailDt, amount),
        });
    }

    configureUniforms(uniforms: { [uniform: string]: THREE.IUniform<any>; }): void {
        super.configureUniforms(uniforms);
        const lighting = sunLightingAt(get(timeOfDay));
        uniforms.dataScale = new THREE.Uniform(this.dataScaleValue);
        uniforms.dataEpsilon = new THREE.Uniform(CloudLayer.DATA_EPSILON);
        uniforms.dataConversionTex = new THREE.Uniform(makeDataConversionTex(this.dataScaleValue, CloudLayer.DATA_EPSILON));
        uniforms.lightTex = new THREE.Uniform(this.lightVolume.texture);
        uniforms.dtScale = new THREE.Uniform(CloudLayer.BASE_DT_SCALE);
        uniforms.extinctionScale = new THREE.Uniform(1.0);
        uniforms.noiseStrength = new THREE.Uniform(0.0);
        uniforms.ambientFactor = new THREE.Uniform(0.08);
        uniforms.sunLightDir = new THREE.Uniform(sunDirection(lighting.azimuthDeg, lighting.elevationDeg));
        uniforms.solarFactor = new THREE.Uniform(lighting.solarFactor);
        uniforms.ambientLightColorTop = new THREE.Uniform(lighting.ambientTop);
        uniforms.ambientLightColorBot = new THREE.Uniform(lighting.ambientBottom);
        uniforms.sunLightColor = new THREE.Uniform(lighting.sunColor);
        uniforms.whiteBalance = new THREE.Uniform(noonWhiteBalance());
        uniforms.gHG = new THREE.Uniform(0.6);
        uniforms.bottomHeight = new THREE.Uniform(675.0); // TODO: calculate this value from the data
        uniforms.finalGamma = new THREE.Uniform(6.0);        
    }
}
