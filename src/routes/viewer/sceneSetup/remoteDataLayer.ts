import * as THREE from 'three';
import { type VariableStore } from '../stores/multiVariableStore';

export abstract class RemoteDataLayer {
    public readonly variable: string;
    public readonly variableStore: VariableStore;
    public readonly geometry: THREE.BufferGeometry;
    public readonly vertexShader: string;
    public readonly fragmentShader: string;

    protected renderObject: THREE.Mesh;

    constructor(variable: string, variableStore: VariableStore, geometry: THREE.BufferGeometry, vertexShader: string, fragmentShader: string) {
        this.variable = variable;
        this.variableStore = variableStore;
        this.geometry = geometry;
        this.vertexShader = vertexShader;
        this.fragmentShader = fragmentShader;
    }

    initialize(): THREE.Mesh {
        this.renderObject = this.createObject(this.geometry);
        this.renderObject.renderOrder = 0;
        return this.renderObject;
    }

    getDataTexture(): THREE.Texture {
        return (this.renderObject.material as THREE.ShaderMaterial).uniforms.volumeTex.value as THREE.Texture;
    }

    getRenderObject(): THREE.Mesh {
        return this.renderObject;
    }

    async update(timestep: number, interimTexture: THREE.Texture = null) {
        if (interimTexture) {
            this.getDataTexture().dispose();
            (this.renderObject.material as THREE.ShaderMaterial).uniforms.volumeTex.value = interimTexture;
            this.getDataTexture().needsUpdate = true;
        }
        const remoteStore  = this.variableStore.remoteStore;
        const dataSlice = await this.variableStore.bufferStore.setCurrentSliceIndex(timestep, remoteStore);
        const newDataTexture = this.createDataTexture(dataSlice);
        if (interimTexture == null) {
            this.getDataTexture().dispose();
        }
        (this.renderObject.material as THREE.ShaderMaterial).uniforms.volumeTex.value = newDataTexture;
        this.getDataTexture().needsUpdate = true;
    }

    displace(subStep: number, subStepsPerStep: number, wind: number[]) {
        const variableInfo = this.variableStore.variableInfo;
        const dTSnapshot = 10.0; // TODO: get from the variable store
        const xRange = variableInfo.upperBoundXYZ[0] - variableInfo.lowerBoundXYZ[0];
        const deltaX = wind[0] * (subStep / subStepsPerStep) * dTSnapshot / xRange;
        const yRange = variableInfo.upperBoundXYZ[1] - variableInfo.lowerBoundXYZ[1];
        const deltaY = wind[1] * (subStep / subStepsPerStep) * dTSnapshot / yRange;
        (this.renderObject.material as THREE.ShaderMaterial).uniforms.displacement.value = new THREE.Vector3(deltaX, deltaY, 0.0);
        //this.getDataTexture().needsUpdate = true;
    }

    createMaterial(): THREE.ShaderMaterial {
        const shaderMaterial = new THREE.ShaderMaterial({
            vertexShader: this.vertexShader, 
            fragmentShader: this.fragmentShader,
            side: THREE.DoubleSide,
            clipping: true,
            transparent: true,
            depthTest: false,
        });
        this.configureUniforms(shaderMaterial.uniforms);
        return shaderMaterial;
    }

    configureUniforms(uniforms: { [uniform: string]: THREE.IUniform<any>; }) {
        const dataSlice = this.variableStore.bufferStore.allocateBuffer(1);
        uniforms.volumeTex = new THREE.Uniform(this.createDataTexture(dataSlice));
        uniforms.boxSize = new THREE.Uniform(this.variableStore.variableInfo.getBoxSizes());
        uniforms.voxelSize = new THREE.Uniform(this.variableStore.variableInfo.getVoxelSizes());
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

    createObject(geometry: THREE.BufferGeometry): THREE.Mesh {
        return new THREE.Mesh(geometry, this.createMaterial());
    }

    createDataTexture(dataSlice: Uint8Array): THREE.Texture {
        const shape = this.variableStore.variableInfo.getOrignalDataShape();
        let texture = null;
        if(shape.length === 3){
            texture = new THREE.DataTexture(dataSlice, shape[1], shape[2]);
        }
        if(shape.length === 4){
            texture = new THREE.Data3DTexture(dataSlice, shape[1], shape[2], shape[3]);
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
