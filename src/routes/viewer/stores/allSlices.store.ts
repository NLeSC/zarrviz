import { BufferMemoryStore } from "./bufferMemoryStore";
import type { RemoteStore } from "./remoteStore";

export const spatialDimensions = ['x', 'y', 'z'];

export class VariableInfo {
  numCellsXYZ: number[] = [];
  lowerBoundXYZ: number[] = [];
  upperBoundXYZ: number[] = [];
  numTimes: number = 0;
  timeRange: number[] = [];

  constructor(metaData: object) {
    this.numCellsXYZ = [1, 1, 0];
    this.lowerBoundXYZ = [0, 0, 0];
    this.upperBoundXYZ = [0, 0, 0];
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

export interface VariableStore {
  variableInfo: VariableInfo;
  remoteStore: RemoteStore;
  bufferStore: BufferMemoryStore;
}

export class MultiVariableStore {
  //  Internal data structure
  private stores: RemoteStore[] = [];
  private variables: { [variable: string]: Map<number, VariableStore> } = {};
  numTimes: number = undefined;
  timeRange: number[] = undefined;

  addRemoteStore(remoteStore: RemoteStore): void {
    for (const store of this.stores) {
      if (store.getURL() === remoteStore.getURL()) {
        throw new Error('Remote store with URL ' + remoteStore.getURL() + ' already added');
      }
    }
    this.stores.push(remoteStore);
  }

  async addVariableStore(variable: string, bufferSlices: number, coarseningLevel: number, remoteStoreOrURL: RemoteStore|string): Promise<VariableStore> {
    if (!(variable in this.variables)) {
      this.variables[variable] = new Map<number, VariableStore>();
    }
    let remoteStore: RemoteStore = null;
    if (typeof remoteStoreOrURL === 'string') {
      for (const store of this.stores) {
        if (store.getURL() === remoteStoreOrURL) {
          remoteStore = store;
          break;
        }
      }
      if (!remoteStore) {
        throw new Error('Remote store with URL ' + remoteStoreOrURL + ' not found');
      }
    }
    else {
      remoteStore = remoteStoreOrURL;
      if(!this.stores.includes(remoteStoreOrURL)) {
        this.addRemoteStore(remoteStore);
      }
    }
    const variableInfo = new VariableInfo(await remoteStore.getMetaData(variable));
    this.validateMetaData(variableInfo);
    const bufferSize = bufferSlices * Math.max(1, variableInfo.numCellsXYZ[0]) * Math.max(1, variableInfo.numCellsXYZ[1]) * Math.max(1, variableInfo.numCellsXYZ[2]);
    const dimensions = variableInfo.numCellsXYZ[2] === 0 ? 3 : 4;
    const memoryStore = new BufferMemoryStore(bufferSize, bufferSlices, variableInfo.numTimes, variable, dimensions);
    const value: VariableStore = { variableInfo: variableInfo, remoteStore: remoteStore, bufferStore: memoryStore };
    this.variables[variable][coarseningLevel] = value;
    return value;
  }

  getVariableStore(variable: string, coarseningLevel: number): VariableStore {
    if (variable in this.variables) {
      if (coarseningLevel == -1) {
        return [...this.variables[variable].entries()].reduce((a, e) => e[0] > a[0] ? e : a)[1];
      }
      if (coarseningLevel in this.variables[variable].keys()) {
        return this.variables[variable][coarseningLevel];
      }
      else {
        throw new Error(`Coarsening level ${coarseningLevel} not found for variable ${variable}`);
      }
    }
    throw new Error(`Variable ${variable} not found`);  
  }

  async getVariableData(variable: string, timeIndex: number, coarseningLevel: number = 0): Promise<{ data: ArrayBufferView<ArrayBufferLike>, shape: number[] }> {
    const store = this.getVariableStore(variable, coarseningLevel);
    return { data: await store.bufferStore.setCurrentSliceIndex(timeIndex, store.remoteStore), shape: store.variableInfo.numCellsXYZ };
  }

  getVariableInfo(variable: string, coarseningLevel: number = 0): VariableInfo {
    return this.getVariableStore(variable, coarseningLevel).variableInfo;
  }

  validateMetaData(metaData: VariableInfo): void {
    if (this.numTimes === undefined) {
      this.numTimes = metaData.numTimes;
      this.timeRange = metaData.timeRange;
    }
    else {
      if (this.numTimes !== metaData.numTimes) {
        throw new Error('Number of times does not match');
      }
      if (this.timeRange[0] !== metaData.timeRange[0] || this.timeRange[1] !== metaData.timeRange[1]) {
        throw new Error('Time range does not match');
      }
    }
  }

  clear(): void {
    this.stores = [];
    this.variables = {};
    this.numTimes = undefined;
    this.timeRange = undefined;
  }
}
