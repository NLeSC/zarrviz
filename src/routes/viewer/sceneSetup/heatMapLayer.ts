import { RemoteDataLayer } from './remoteDataLayer';
import vertexShaderSurface from '$lib/shaders/surface.vert';
import fragmentShaderSurfaceHeatMap from '$lib/shaders/surfaceHeatmap.frag';  // heat map
import * as THREE from 'three';
import type { VariableStore } from '../stores/allSlices.store';

export class HeatMapLayer extends RemoteDataLayer {
    constructor(variable: string, variableStore: VariableStore, geometry: THREE.BufferGeometry) {
        super(variable, variableStore, geometry, vertexShaderSurface, fragmentShaderSurfaceHeatMap);
    }

    configureUniforms(uniforms) {
        super.configureUniforms(uniforms);
        uniforms.uScaleFactor = new THREE.Uniform(200.0);
    }
}