import { BufferMemoryStore } from "./bufferMemoryStore";
import { CoarseDataMemoryStore } from "./coarseDataMemoryStore";
import type { RemoteStore } from "./remoteStore";

export let variableStores = [];
export const spatialDimensions = ['x', 'y', 'z'];

export let remoteStore = null;

export function setRemoteStore(store: RemoteStore): void {
  remoteStore = store;
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

export async function addVariableStore(variable: string, bufferSlices: number, coarseningBlockSizes: number[], coarsener: string): Promise<void> {
  const metaData = await remoteStore.getMetaData(variable);
  const variableInfo = new VariableInfo(variable, metaData, coarseningBlockSizes);
  const bufferSize = bufferSlices * Math.max(1, variableInfo.numCellsXYZ[0]) * Math.max(1, variableInfo.numCellsXYZ[1]) * Math.max(1, variableInfo.numCellsXYZ[2]);
  const dimensions = variableInfo.numCellsXYZ[2] === 0 ? 3 : 4;
  let memoryStore = null;
  if (coarsener !== null && coarseningBlockSizes !== null) {
    memoryStore = new CoarseDataMemoryStore(bufferSize, bufferSlices, variable, variableInfo.getOrignalDataShape(), coarseningBlockSizes, coarsener);
  }
  else {
    memoryStore = new BufferMemoryStore(bufferSize, bufferSlices, variableInfo.numTimes, variable, dimensions);
  }

  const newStore = new VariableStore(variable);
  newStore.variableInfo = variableInfo;
  newStore.zarrStore = remoteStore;
  newStore.bufferStore = memoryStore;
  variableStores.push(newStore);
}

export function clearVariableStores(): void {
  variableStores = [];
}

export async function getVariableData(variable: string, timeIndex: number): Promise<{data: Uint8Array, shape: number[]}> {
  for (const store of variableStores) {
    if (store.variable === variable) {
      const shape = store.variableInfo.numCellsXYZ;
      return {data: await store.bufferStore.setCurrentSliceIndex(timeIndex, remoteStore), shape: shape};
    }
  }
  throw new Error(`Variable ${variable} not found`);
}

export function getVariableCoarsenedData(variable: string): {coarseData: Uint8Array, coarseShape: number[]} {
  for (const store of variableStores) {
    if (store.variable === variable) {
      const shape = store.variableInfo.coarseCellsXYZ;
      if (store.bufferStore instanceof CoarseDataMemoryStore) {
        return {coarseData: (store.bufferStore as CoarseDataMemoryStore).getCurrentCoarseBuffer(), coarseShape: shape};
      }
      else {
        return {coarseData: null, coarseShape: shape};
      }
    }
  }
  throw new Error(`Variable ${variable} not found`);
}


export function getVariableMetaData(variable: string): VariableInfo {
  for (const store of variableStores) {
    if (store.variable === variable) {
      return store.variableInfo;
    }
  }
  throw new Error(`Variable ${variable} not found`);
}

export function getNumTimes(): number {
  if (variableStores.length > 0) {
    return variableStores[0].variableInfo.numTimes;
  }
  throw new Error('No variables loaded');
}

export class VariableStore {
  variable: string;
  variableInfo: VariableInfo;
  zarrStore: RemoteStore;
  bufferStore: BufferMemoryStore;

  constructor(variable: string) {
    this.variable = variable;
    this.zarrStore = null;
    this.bufferStore = null;
  }
}
