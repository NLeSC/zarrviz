import { RemoteDataLayer } from './remoteDataLayer';
import vertexShaderSurface from '$lib/shaders/surface.vert';
import fragmentShaderSurfaceHeatMap from '$lib/shaders/surfaceHeatmap.frag';  // heat map
import * as THREE from 'three';

export class HeatMapLayer extends RemoteDataLayer {
    constructor(variableStore, geometry) {
        super(variableStore, geometry, vertexShaderSurface, fragmentShaderSurfaceHeatMap);
    }

    configureUniforms(uniforms, coarseningLevel = 0) {
        super.configureUniforms(uniforms, coarseningLevel);
        uniforms.uScaleFactor = new THREE.Uniform(200.0);
    }
}