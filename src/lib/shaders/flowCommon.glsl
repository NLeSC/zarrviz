precision highp float;
precision highp int;
precision highp sampler2D;
precision highp sampler3D;

in vec2 vUv;

// Volumes are stored as 2D atlases: the z-slices of a volume laid out row by row in a grid of
// `columns` tiles, each of dims.x by dims.y texels. These describe the grid being rendered to.
uniform ivec3 dims;
uniform int columns;

ivec2 atlasTexel(ivec3 c, ivec3 volumeDims, int volumeColumns) {
  return ivec2((c.z % volumeColumns) * volumeDims.x + c.x, (c.z / volumeColumns) * volumeDims.y + c.y);
}

// Voxel fetch with clamped borders.
vec4 fetchVoxel(sampler2D atlas, ivec3 c, ivec3 volumeDims, int volumeColumns) {
  c = clamp(c, ivec3(0), volumeDims - 1);
  return texelFetch(atlas, atlasTexel(c, volumeDims, volumeColumns), 0);
}

// Trilinear lookup at a position in voxel units, where voxel centers are at integer positions.
vec4 sampleVolume(sampler2D atlas, vec3 p, ivec3 volumeDims, int volumeColumns) {
  p = clamp(p, vec3(0.0), vec3(volumeDims - 1));
  ivec3 i0 = ivec3(floor(p));
  vec3 f = p - vec3(i0);
  vec4 c000 = fetchVoxel(atlas, i0, volumeDims, volumeColumns);
  vec4 c100 = fetchVoxel(atlas, i0 + ivec3(1, 0, 0), volumeDims, volumeColumns);
  vec4 c010 = fetchVoxel(atlas, i0 + ivec3(0, 1, 0), volumeDims, volumeColumns);
  vec4 c110 = fetchVoxel(atlas, i0 + ivec3(1, 1, 0), volumeDims, volumeColumns);
  vec4 c001 = fetchVoxel(atlas, i0 + ivec3(0, 0, 1), volumeDims, volumeColumns);
  vec4 c101 = fetchVoxel(atlas, i0 + ivec3(1, 0, 1), volumeDims, volumeColumns);
  vec4 c011 = fetchVoxel(atlas, i0 + ivec3(0, 1, 1), volumeDims, volumeColumns);
  vec4 c111 = fetchVoxel(atlas, i0 + ivec3(1, 1, 1), volumeDims, volumeColumns);
  return mix(mix(mix(c000, c100, f.x), mix(c010, c110, f.x), f.y),
             mix(mix(c001, c101, f.x), mix(c011, c111, f.x), f.y), f.z);
}

// The voxel that this fragment of the atlas belongs to; false for the unused tiles at the end.
bool currentVoxel(out ivec3 c) {
  ivec2 texel = ivec2(gl_FragCoord.xy);
  ivec2 tile = texel / dims.xy;
  c = ivec3(texel - tile * dims.xy, tile.y * columns + tile.x);
  return c.z < dims.z;
}
