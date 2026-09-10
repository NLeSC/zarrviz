import type { TypedArray } from "three";
import type { SpatialRegion } from "./spatialRegion";

export interface VariableData {
  data: ArrayBuffer;
  shape: number[];
}

export interface RemoteStore {
  getURL(): string;
  getMetaData(variable: string): Promise<object>;
  getTimeRange(variable: string, dimensions: number, currentTimeIndex: number, endTimeIndex: number, region?: SpatialRegion): Promise<TypedArray>;
  copyTimeRange(variable: string, dimensions: number, currentTimeIndex: number, endTimeIndex: number, destination: TypedArray, region?: SpatialRegion): Promise<void>;
}

