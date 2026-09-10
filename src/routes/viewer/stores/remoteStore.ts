import type { TypedArray } from "three";

export interface VariableData {
  data: ArrayBuffer;
  shape: number[];
}

export interface RemoteStore {
  getURL(): string;
  getMetaData(variable: string): Promise<object>;
  getTimeRange(variable: string, dimensions: number, currentTimeIndex: number, endTimeIndex: number): Promise<TypedArray>;
  copyTimeRange(variable: string, dimensions: number, currentTimeIndex: number, endTimeIndex: number, destination: TypedArray): Promise<void>;
}
