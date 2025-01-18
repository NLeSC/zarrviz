import { BufferMemoryStore } from "./bufferMemoryStore";
import type { RemoteStore } from "./remoteStore";

export const remoteStores = {};
export const variableStores: VariableStore[] = [];
export const spatialDimensions = ['x', 'y', 'z'];

export function addRemoteStore(store: RemoteStore, coarseningLevel: number): void {
  remoteStores[coarseningLevel] = store;
}

export class VariableInfo {
  variable: string;
  numCellsXYZ: number[];
  lowerBoundXYZ: number[];
  upperBoundXYZ: number[];
  numTimes: number;
  timeRange: number[];
  coarseCellsXYZ: number[];

  constructor(variable: string, metaData: object, coarseningBlockSizes: number[] = null) {
    this.variable = variable;
    this.numCellsXYZ = [1, 1, 0];
    this.lowerBoundXYZ = [0, 0, 0];
    this.upperBoundXYZ = [0, 0, 0];
    this.numTimes = 0;
    this.timeRange = [0, 0];
    this.coarseCellsXYZ = [1, 1, 0];
    for (const key in metaData) {
      if (key.startsWith('t')) {
        this.numTimes = metaData[key][0];
        this.timeRange = [metaData[key][1], metaData[key][2]];
      }
      for (let i = 0; i < 3; i++) {
        if (key.startsWith(spatialDimensions[i])) {
          this.numCellsXYZ[i] = metaData[key][0];
          this.lowerBoundXYZ[i] = metaData[key][1];
          this.upperBoundXYZ[i] = metaData[key][2];
          if (coarseningBlockSizes !== null) {
            this.coarseCellsXYZ[i] = Math.ceil(this.numCellsXYZ[i] / coarseningBlockSizes[i + 1]);
          }
        }
      }
    }
  }

  getVolumeSize(): number {
    return this.numCellsXYZ[0] * this.numCellsXYZ[1] * Math.max(1, this.numCellsXYZ[2]);
  }

  getBoxSizes(): number[] {
    const voxelSizes = this.getVoxelSizes();
    const s = this.numCellsXYZ[0] * voxelSizes[0];
    const t = this.numCellsXYZ[1] * voxelSizes[1];
    return voxelSizes.length == 2 ? [1.0, t / s] : [1.0, t / s, this.numCellsXYZ[2] * voxelSizes[2] / s];
  }

  getVoxelSizes(): number[] {
    let range = [0, 1, 2];
    if (this.numCellsXYZ[2] < 2) {
      range = [0, 1];
    }
    return range.map((i) => (this.upperBoundXYZ[i] - this.lowerBoundXYZ[i]) / (this.numCellsXYZ[i] - 1));
  }

  getOrignalDataShape(): number[] {
    if (this.numCellsXYZ[2] === 0) {
      return [this.numTimes, this.numCellsXYZ[0], this.numCellsXYZ[1]];
    }
    else {
      return [this.numTimes, this.numCellsXYZ[0], this.numCellsXYZ[1], this.numCellsXYZ[2]];
    }
  }
}

export class VariableStore {
  variable: string;
  private coarseningLevels: number[];
  private variableInfos: VariableInfo[];
  private zarrStores: RemoteStore[];
  private bufferStores: BufferMemoryStore[];

  constructor(variable: string, variableInfo: VariableInfo, remoteStore: RemoteStore, memoryStore: BufferMemoryStore) {
    this.variable = variable;
    this.coarseningLevels = [0];
    this.variableInfos = [variableInfo];
    this.zarrStores = [remoteStore];
    this.bufferStores = [memoryStore];
  }

  addCoarseningLevel(coarseningLevel: number, variableInfo: VariableInfo, remoteStore: RemoteStore, memoryStore: BufferMemoryStore): void {
    const index = this.coarseningLevels.indexOf(coarseningLevel);
    if (index >= 0) {
      this.variableInfos[index] = variableInfo;
      this.zarrStores[index] = remoteStore;
      this.bufferStores[index] = memoryStore;
    }
    else {
      this.coarseningLevels.push(coarseningLevel);
      this.variableInfos.push(variableInfo);
      this.zarrStores.push(remoteStore);
      this.bufferStores.push(memoryStore);
    }
  }

  getVariableInfo(coarseningLevel: number): VariableInfo {
    const index = this.coarseningLevels.indexOf(coarseningLevel);
    if (index >= 0) {
      return this.variableInfos[index];
    }
    throw new Error(`Coarsening level ${coarseningLevel} not found for variable ${this.variable}`);
  }

  getZarrStore(coarseningLevel: number): RemoteStore {
    const index = this.coarseningLevels.indexOf(coarseningLevel);
    if (index >= 0) {
      return this.zarrStores[index];
    }
    throw new Error(`Coarsening level ${coarseningLevel} not found for variable ${this.variable}`);
  }

  getBufferStore(coarseningLevel: number): BufferMemoryStore {
    const index = this.coarseningLevels.indexOf(coarseningLevel);
    if (index >= 0) {
      return this.bufferStores[index];
    }
    throw new Error(`Coarsening level ${coarseningLevel} not found for variable ${this.variable}`);
  }

  getMaxLevel(): number {
    return Math.max(...this.coarseningLevels);
  }
}


export async function addVariableStore(variable: string, bufferSlices: number, coarseningLevel: number = 0): Promise<void> {
  if (coarseningLevel in remoteStores) {
    const remoteStore = remoteStores[coarseningLevel];
    const metaData = await remoteStore.getMetaData(variable);
    const variableInfo = new VariableInfo(variable, metaData);
    const bufferSize = bufferSlices * Math.max(1, variableInfo.numCellsXYZ[0]) * Math.max(1, variableInfo.numCellsXYZ[1]) * Math.max(1, variableInfo.numCellsXYZ[2]);
    const dimensions = variableInfo.numCellsXYZ[2] === 0 ? 3 : 4;
    const memoryStore = new BufferMemoryStore(bufferSize, bufferSlices, variableInfo.numTimes, variable, dimensions);
    for (const variableStore of variableStores) {
      if (variableStore.variable === variable) {
        variableStore.addCoarseningLevel(coarseningLevel, variableInfo, remoteStore, memoryStore);
        return;
      }
    }
    if (coarseningLevel != 0) {
      throw new Error(`Please add the zero-level store first for variable ${variable}`);
    }
    variableStores.push(new VariableStore(variable, variableInfo, remoteStore, memoryStore));
  }
  else {
    console.log(Error(`Coarsening level ${coarseningLevel} not found`));
  }
}


export async function getVariableData(variable: string, timeIndex: number, coarseningLevel: number = 0): Promise<{ data: ArrayBufferView<ArrayBufferLike>, shape: number[] }> {
  for (const store of variableStores) {
    if (store.variable === variable) {
      if (coarseningLevel === -1) {
        coarseningLevel = store.getMaxLevel();
        if (coarseningLevel === 0) {
          return { data: null, shape: [] };
        }
      }
      const shape = store.getVariableInfo(coarseningLevel).numCellsXYZ;
      const memoryStore = store.getBufferStore(coarseningLevel);
      const remoteStore = store.getZarrStore(coarseningLevel);
      return { data: await memoryStore.setCurrentSliceIndex(timeIndex, remoteStore), shape: shape };
    }
  }
  throw new Error(`Variable ${variable} not found`);
}



export function getVariableMetaData(variable: string, coarseningLevel: number = 0): VariableInfo {
  for (const store of variableStores) {
    if (store.variable === variable) {
      if (coarseningLevel === -1) {
        coarseningLevel = store.getMaxLevel();
        if (coarseningLevel === 0) {
          return null;
        }
      }
      return store.getVariableInfo(coarseningLevel);
    }
  }
  throw new Error(`Variable ${variable} not found`);
}


export function getNumTimes(): number {
  if (variableStores.length > 0) {
    return variableStores[0].getVariableInfo(0).numTimes;
  }
  throw new Error('No variables loaded');
}


export function clearVariableStores(): void {
  variableStores.length = 0;
}
