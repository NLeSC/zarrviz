import { openArray, ZarrArray, HTTPStore, slice } from 'zarr';
import type { RemoteStore } from './remoteStore';
import type { TypedArray } from 'three';
import type { SpatialRegion } from './spatialRegion';

export class RemoteZarrStore implements RemoteStore {
  zarrStore: HTTPStore;
  valArrays: {[key: string]: ZarrArray};

  constructor(datasetUrl: string) {
    this.zarrStore = new HTTPStore(datasetUrl, { fetchOptions: { redirect: 'follow', mode: 'cors', credentials: 'include' } });
    this.valArrays = {};
  }

  getURL(): string {
    return this.zarrStore.url;
  }

  private async getValArray(variable: string): ZarrArray {
    if (!this.valArrays[variable]) {
      this.valArrays[variable] = await openArray({ store: this.zarrStore, path: variable, mode: 'r' });
    }
    return this.valArrays[variable];
  }

  async getMetaData(variable: string) {
    const zarrArray = await this.getValArray(variable);
    const shape = zarrArray.meta['shape'];
    //TODO: Make this more general
    const dims = ['time', 'z_' + variable, 'yt', 'xt'];
    const result = {'t': [shape[0], 0, shape[0] - 1]};
    for (let i = 5 - shape.length; i < dims.length; i++) {
      const coordinateArray = await openArray({ store: this.zarrStore, path: dims[i], mode: 'r' });
      const n = coordinateArray.shape[0];
      const first = await coordinateArray.get([0]);
      const last = await coordinateArray.get([n - 1]);
      result[dims[i]] = [shape.length > 3 ? shape[i]: shape[i-1], first, last];
    }
    console.log(result, 'for', variable);
    return result;
  }

  async getTimeRange(variable: string, dimensions: number, currentTimeIndex: number, endTimeIndex: number, region?: SpatialRegion): Promise<TypedArray> {
    const valArray = await this.getValArray(variable);
    const timeSlicing = slice(currentTimeIndex, endTimeIndex);
    const ySlicing = region ? slice(region.yStart, region.yEnd) : null;
    const xSlicing = region ? slice(region.xStart, region.xEnd) : null;
    const { data, } = dimensions === 4
      ? await valArray.getRaw([timeSlicing, null, ySlicing, xSlicing])
      : await valArray.getRaw([timeSlicing, ySlicing, xSlicing]);
    return data;
  }

  async copyTimeRange(variable: string, dimensions: number, currentTimeIndex: number, endTimeIndex: number, destination: TypedArray, region?: SpatialRegion): Promise<void> {
    const valArray = await this.getValArray(variable);
    console.log(this.getURL());
    console.log('copyTimeRange', variable, dimensions, currentTimeIndex, endTimeIndex, destination.length);
    const timeSlicing = slice(currentTimeIndex, endTimeIndex);
    const ySlicing = region ? slice(region.yStart, region.yEnd) : null;
    const xSlicing = region ? slice(region.xStart, region.xEnd) : null;
    let { data, } = dimensions === 4
      ? await valArray.getRaw([timeSlicing, null, ySlicing, xSlicing])
      : await valArray.getRaw([timeSlicing, ySlicing, xSlicing]);
    destination.set(data);
    data = null;
  }
}

export function getArrayInterval(array: number[]): number {
  const n = array.length;
  if (n < 2) {
    throw new Error("Array must have at least two elements");
  }
  return (array[n - 1] - array[0]) / (n - 1);
}
