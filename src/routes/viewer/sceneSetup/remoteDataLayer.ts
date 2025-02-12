import * as THREE from 'three';
import { VariableStore, VariableInfo } from '../stores/allSlices.store';

export abstract class RemoteDataLayer {
    public readonly variableStore: VariableStore;
    public readonly geometry: THREE.BufferGeometry;
    public readonly vertexShader: string;
    public readonly fragmentShader: string;

    protected dataSlice: Uint8Array;
    protected renderObject: THREE.Mesh;

    constructor(variableStore: VariableStore, geometry: THREE.BufferGeometry, vertexShader: string, fragmentShader: string) {
        this.variableStore = variableStore;
        this.geometry = geometry;
        this.vertexShader = vertexShader;
        this.fragmentShader = fragmentShader;
    }

    initialize(): THREE.Mesh {
        //this.dataSlice = this.variableStore.getBufferStore(0).allocateBuffer(1);
        this.renderObject = this.createObject(this.geometry, 0);
        this.renderObject.renderOrder = 0;
        return this.renderObject;
    }

    getDataTexture(): THREE.Texture {
        return (this.renderObject.material as THREE.ShaderMaterial).uniforms.volumeTex.value as THREE.Texture;
    }

    getRenderObject(): THREE.Mesh {
        return this.renderObject;
    }

    async update(timestep: number, coarseningLevel: number = 0) {
        this.getDataTexture().dispose();
        const remoteStore  = this.variableStore.getZarrStore(coarseningLevel);
        this.dataSlice = (await this.variableStore.getBufferStore(coarseningLevel).setCurrentSliceIndex(timestep, remoteStore));
        (this.renderObject.material as THREE.ShaderMaterial).uniforms.volumeTex.value = this.createDataTexture(coarseningLevel);
        this.getDataTexture().needsUpdate = true;        
    }

    displace(subStep: number, subStepsPerStep: number, wind: number[]) {
        const variableInfo = this.getVariableMetaData();
        const dTSnapshot = 10.0; // TODO: get from the variable store
        const xRange = variableInfo.upperBoundXYZ[0] - variableInfo.lowerBoundXYZ[0];
        const deltaX = wind[0] * (subStep / subStepsPerStep) * dTSnapshot / xRange;
        const yRange = variableInfo.upperBoundXYZ[1] - variableInfo.lowerBoundXYZ[1];
        const deltaY = wind[1] * (subStep / subStepsPerStep) * dTSnapshot / yRange;
        (this.renderObject.material as THREE.ShaderMaterial).uniforms.displacement.value = new THREE.Vector3(deltaX, deltaY, 0.0);
        //this.getDataTexture().needsUpdate = true;
    }

    createMaterial(coarseningLevel: number): THREE.ShaderMaterial {
        const shaderMaterial = new THREE.ShaderMaterial({
            vertexShader: this.vertexShader, 
            fragmentShader: this.fragmentShader,
            side: THREE.DoubleSide,
            clipping: true,
            transparent: true,
            depthTest: false,
        });
        this.configureUniforms(shaderMaterial.uniforms, coarseningLevel);
        return shaderMaterial;
    }

    configureUniforms(uniforms: { [uniform: string]: THREE.IUniform<any>; }, coarseningLevel: number = 0) {
        uniforms.volumeTex = new THREE.Uniform(this.createDataTexture(coarseningLevel));
        uniforms.boxSize = new THREE.Uniform(this.variableStore.getVariableInfo(coarseningLevel).getBoxSizes());
        uniforms.voxelSize = new THREE.Uniform(this.variableStore.getVariableInfo(coarseningLevel).getVoxelSizes());
        uniforms.displacement = new THREE.Uniform(new THREE.Vector3(0.0, 0.0, 0.0));
        uniforms.uTransparency = new THREE.Uniform(0.0);
    }

    updateUniforms(uniforms: { [uniform: string]: any; }) {
        for (const key in uniforms) {
            if (key in (this.renderObject.material as THREE.ShaderMaterial).uniforms){
                (this.renderObject.material as THREE.ShaderMaterial).uniforms[key].value = uniforms[key];
            }
            else {
                (this.renderObject.material as THREE.ShaderMaterial).uniforms[key] = new THREE.Uniform(uniforms[key]);
            }
        }
    }

    createObject(geometry: THREE.BufferGeometry, coarseningLevel: number): THREE.Mesh {
        return new THREE.Mesh(geometry, this.createMaterial(coarseningLevel));
    }

    getVariableMetaData(coarseningLevel: number = 0): VariableInfo {
        if (coarseningLevel === -1) {
            coarseningLevel = this.variableStore.getMaxLevel();
            if (coarseningLevel === 0) {
                return null;
            }
        }
        return this.variableStore.getVariableInfo(coarseningLevel);
    }

    createDataTexture(coarseningLevel: number = 0): THREE.Texture {
        const shape = this.variableStore.getVariableInfo(coarseningLevel).getOrignalDataShape();
        let texture = null;
        if(shape.length === 3){
            texture = new THREE.DataTexture(this.dataSlice, shape[1], shape[2]);
        }
        if(shape.length === 4){
            texture = new THREE.Data3DTexture(this.dataSlice, shape[1], shape[2], shape[3]);
        }
        texture.format = THREE.RedFormat;
        texture.type = THREE.UnsignedByteType;
        texture.generateMipmaps = false; // Saves memory.
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
        return texture;
    }
}
