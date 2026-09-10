import { VariableInfo, type VariableStore } from './multiVariableStore';
import { BufferMemoryStore } from './bufferMemoryStore';
import type { SpatialRegion } from './spatialRegion';

// Crops a VariableInfo's x/y extent down to one tile's cell-index region, keeping
// the full z (vertical) extent since tiling only happens in the horizontal plane.
export function createTileVariableInfo(base: VariableInfo, region: SpatialRegion): VariableInfo {
  const voxelSizes = base.getVoxelSizes();
  const tileInfo = new VariableInfo({});
  tileInfo.numTimes = base.numTimes;
  tileInfo.timeRange = base.timeRange;
  tileInfo.numCellsXYZ = [region.xEnd - region.xStart, region.yEnd - region.yStart, base.numCellsXYZ[2]];
  tileInfo.lowerBoundXYZ = [
    base.lowerBoundXYZ[0] + region.xStart * voxelSizes[0],
    base.lowerBoundXYZ[1] + region.yStart * voxelSizes[1],
    base.lowerBoundXYZ[2],
  ];
  tileInfo.upperBoundXYZ = [
    base.lowerBoundXYZ[0] + (region.xEnd - 1) * voxelSizes[0],
    base.lowerBoundXYZ[1] + (region.yEnd - 1) * voxelSizes[1],
    base.upperBoundXYZ[2],
  ];
  return tileInfo;
}

// Builds a VariableStore scoped to one tile's spatial region, with its own
// double-buffered BufferMemoryStore, reusing the base store's already-open RemoteStore.
export function createTileVariableStore(base: VariableStore, region: SpatialRegion, bufferSlices: number, variable: string): VariableStore {
  const variableInfo = createTileVariableInfo(base.variableInfo, region);
  const bufferSize = bufferSlices * variableInfo.numCellsXYZ[0] * variableInfo.numCellsXYZ[1] * Math.max(1, variableInfo.numCellsXYZ[2]);
  const dimensions = variableInfo.numCellsXYZ[2] === 0 ? 3 : 4;
  const bufferStore = new BufferMemoryStore(bufferSize, bufferSlices, variableInfo.numTimes, variable, dimensions, region);
  return { variableInfo, remoteStore: base.remoteStore, bufferStore };
}
