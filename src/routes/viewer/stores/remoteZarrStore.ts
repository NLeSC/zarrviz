import { openArray, ZarrArray, HTTPStore, slice } from 'zarr';
import type { RemoteStore } from './remoteStore';
import type { TypedArray } from 'three';

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
    return result;
  }

  async getTimeRange(variable: string, dimensions: number, currentTimeIndex: number, endTimeIndex: number): Promise<TypedArray> {
    const valArray = await this.getValArray(variable);
    const slicing = slice(currentTimeIndex, endTimeIndex);
    const { data, } = dimensions === 4
      ? await valArray.getRaw([slicing, null, null, null])
      : await valArray.getRaw([slicing, null, null]);
    return data;
  }

  async copyTimeRange(variable: string, dimensions: number, currentTimeIndex: number, endTimeIndex: number, destination: TypedArray): Promise<void> {
    const valArray = await this.getValArray(variable);
    const slicing = slice(currentTimeIndex, endTimeIndex);
    let { data, } = dimensions === 4
      ? await valArray.getRaw([slicing, null, null, null])
      : await valArray.getRaw([slicing, null, null]);
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
