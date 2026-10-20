import { RemoteDataLayer } from './remoteDataLayer';
import vertexShaderVolume from '$lib/shaders/volume.vert';
import fragmentShaderVolumeClouds from '$lib/shaders/volumeClouds.frag'; // ql
import type { VariableStore } from '../stores/multiVariableStore';
import { makeDataConversionTex } from '$lib/utils/makeDataConversionTex';
import * as THREE from 'three';

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
    // Azimuth in the box's xy plane from +x; elevation above that plane (box z is up).
    private static readonly SUN_AZIMUTH_DEG = 90;
    private static readonly SUN_ELEVATION_DEG = 45;

    private static sunDirection(azimuthDeg: number, elevationDeg: number): THREE.Vector3 {
        const az = THREE.MathUtils.degToRad(azimuthDeg);
        const el = THREE.MathUtils.degToRad(elevationDeg);
        return new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el));
    }

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

    setSunAngles(azimuthDeg: number, elevationDeg: number) {
        this.updateUniforms({ sunLightDir: CloudLayer.sunDirection(azimuthDeg, elevationDeg) });
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
        const sunLightColor = new THREE.Color(0.99, 0.83, 0.62);
        uniforms.dataScale = new THREE.Uniform(this.dataScaleValue);
        uniforms.dataEpsilon = new THREE.Uniform(CloudLayer.DATA_EPSILON);
        uniforms.dataConversionTex = new THREE.Uniform(makeDataConversionTex(this.dataScaleValue, CloudLayer.DATA_EPSILON));
        uniforms.dtScale = new THREE.Uniform(CloudLayer.BASE_DT_SCALE);
        uniforms.extinctionScale = new THREE.Uniform(1.0);
        uniforms.noiseStrength = new THREE.Uniform(0.0);
        uniforms.ambientFactor = new THREE.Uniform(0.0);
        uniforms.sunLightDir = new THREE.Uniform(CloudLayer.sunDirection(CloudLayer.SUN_AZIMUTH_DEG, CloudLayer.SUN_ELEVATION_DEG));
        uniforms.solarFactor = new THREE.Uniform(0.8);
        uniforms.ambientLightColorTop = new THREE.Uniform(new THREE.Color().setRGB(0.529, 0.808, 0.922));
        uniforms.ambientLightColorBot = new THREE.Uniform(new THREE.Color(0.3036, 0.4026, 0.2937));
        uniforms.sunLightColor = new THREE.Uniform(sunLightColor);
        uniforms.gHG = new THREE.Uniform(0.6);
        uniforms.bottomHeight = new THREE.Uniform(675.0); // TODO: calculate this value from the data
        uniforms.finalGamma = new THREE.Uniform(6.0);        
    }
}
