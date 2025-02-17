import { RemoteDataLayer } from './remoteDataLayer';
import vertexShaderVolume from '$lib/shaders/volume.vert';
import fragmentShaderVolumeClouds from '$lib/shaders/volumeClouds.frag'; // ql
import type { VariableStore } from '../stores/allSlices.store';
import * as THREE from 'three';

export class CloudLayer extends RemoteDataLayer {
    constructor(variable: string, variableStore: VariableStore, geometry: THREE.BufferGeometry) {
        super(variable, variableStore, geometry, vertexShaderVolume, fragmentShaderVolumeClouds);
    }

    configureUniforms(uniforms: { [uniform: string]: THREE.IUniform<any>; }): void {
        super.configureUniforms(uniforms);
        const sunLightDir = new THREE.Vector3(0.0, 0.5, 0.5);
        const sunLightColor = new THREE.Color(0.99, 0.83, 0.62);
        const sunLight = new THREE.DirectionalLight(sunLightColor.getHex(), 1.0);
        sunLight.position.copy(sunLightDir);
        uniforms.dataScale = new THREE.Uniform(0.00446);
        uniforms.dataEpsilon = new THREE.Uniform(1e-10);
        uniforms.dtScale = new THREE.Uniform(0.5);
        uniforms.ambientFactor = new THREE.Uniform(0.0);
        uniforms.sunLightDir = new THREE.Uniform(sunLight.position);
        uniforms.solarFactor = new THREE.Uniform(0.8);
        uniforms.ambientLightColorTop = new THREE.Uniform(new THREE.Color().setRGB(0.529, 0.808, 0.922));
        uniforms.ambientLightColorBot = new THREE.Uniform(new THREE.Color(0.3036, 0.4026, 0.2937));
        uniforms.sunLightColor = new THREE.Uniform(sunLightColor);
        uniforms.gHG = new THREE.Uniform(0.6);
        uniforms.bottomHeight = new THREE.Uniform(675.0); // TODO: calculate this value from the data
        uniforms.finalGamma = new THREE.Uniform(6.0);        
    }
}
