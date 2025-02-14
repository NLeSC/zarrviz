import { RemoteDataLayer } from "./remoteDataLayer";
import vertexShaderVolume from "$lib/shaders/volume.vert";
import fragmentShaderVolumeTransfer from "$lib/shaders/volumeTransfer.frag";
import fragmentShaderVolumeTransferSlow from "$lib/shaders/volumeTransferSlow.frag";
import type { VariableStore } from "../stores/allSlices.store";
import * as THREE from "three";

export class TransferFunctionVolumeLayer extends RemoteDataLayer {

    protected readonly coarseVariableStore: VariableStore;

    constructor(variableStore: VariableStore, geometry: THREE.BufferGeometry, coarseVariableStore: VariableStore = null) {
        const fragmentShader = coarseVariableStore ? fragmentShaderVolumeTransfer : fragmentShaderVolumeTransferSlow;
        super(variableStore, geometry, vertexShaderVolume, fragmentShader);
        this.coarseVariableStore = coarseVariableStore;
    }

    async update(timestep: number) {
        super.update(timestep);
        this.getCoarseDataTexture().dispose();
        const coarseRemoteStore = this.coarseVariableStore.getZarrStore(2);
        const coarseDataSlice = await this.coarseVariableStore.getBufferStore(2).setCurrentSliceIndex(timestep, coarseRemoteStore);
        (this.renderObject.material as THREE.ShaderMaterial).uniforms.coarseVolumeTex.value = this.createCoarseDataTexture(coarseDataSlice);
        this.getCoarseDataTexture().needsUpdate = true;
    }

    configureUniforms(uniforms: { [uniform: string]: THREE.IUniform<any>; }): void {
        super.configureUniforms(uniforms);
        if (this.coarseVariableStore) {
            uniforms.coarseVolumeTex = new THREE.Uniform(this.createCoarseDataTexture(this.coarseVariableStore.getBufferStore(2).allocateBuffer(1)));
        }
        uniforms.dataScale = new THREE.Uniform(0.0035);
        uniforms.dtScale = new THREE.Uniform(0.8);
        uniforms.ambientFactor = new THREE.Uniform(0.0);
        uniforms.alphaNorm = new THREE.Uniform(2.0);
        uniforms.finalGamma = new THREE.Uniform(6.0);
        uniforms.transferTex = new THREE.Uniform(this.createTransferTexture());
    }

    getCoarseDataTexture(): THREE.Texture {
        return (this.renderObject.material as THREE.ShaderMaterial).uniforms.coarseVolumeTex.value;
    }

    createDataTexture(dataSlice: Uint8Array): THREE.Texture {
        const texture = super.createDataTexture(dataSlice);
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        return texture;
    }

    createCoarseDataTexture(dataSlice: Uint8Array): THREE.Texture {
        const shape = this.coarseVariableStore.getVariableInfo(2).getOrignalDataShape();
        const texture = new THREE.Data3DTexture(dataSlice, shape[1], shape[2], shape[3]);
        texture.format = THREE.RedFormat;
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.type = THREE.UnsignedByteType;
        texture.generateMipmaps = false; // Saves memory.
        texture.needsUpdate = true;
        return texture;
    }

    createTransferTexture(): THREE.DataTexture {
        const width = 64;
        const height = 1;
        const size = width * height;
        const data = new Uint8Array(4 * size);

        const rstart = 2;
        const rend = 60;
        const bstart = 16;
        const bend = 60;
        const astart = 0;
        const aend = 64;
        const imid = 32;
        const amid = 32;

        for (let i = 0; i < width; i += 1) {
            const r = rstart + (i * (rend - rstart)) / (width - 1);
            const b = bstart + (i * (bend - bstart)) / (width - 1);
            let alpha = 0;
            if (i < imid) {
                alpha = astart + (i * (amid - astart)) / (imid - 1);
            } else {
                alpha = amid + ((i - imid) * (aend - amid)) / (width - imid);
            }

            data[4 * i] = r;
            data[4 * i + 1] = 0;
            data[4 * i + 2] = b;
            data[4 * i + 3] = alpha;
        }

        const transferTexture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
        transferTexture.wrapS = THREE.ClampToEdgeWrapping;
        transferTexture.wrapT = THREE.ClampToEdgeWrapping;
        transferTexture.needsUpdate = true;

        return transferTexture;
    }
}