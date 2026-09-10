// A horizontal (x/y) sub-region of a variable's index space, in cell indices.
// yEnd/xEnd are exclusive, matching zarr.js's slice() convention.
export interface SpatialRegion {
  xStart: number;
  xEnd: number;
  yStart: number;
  yEnd: number;
}
