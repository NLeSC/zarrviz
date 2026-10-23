#include ./flowCommon.glsl

// Carries the flow of the previous (coarser) level over to this level, converting it to voxels of this level.
uniform sampler2D source;
uniform ivec3 sourceDims;
uniform int sourceColumns;

void main(void) {
  ivec3 c;
  if(!currentVoxel(c)) {
    gl_FragColor = vec4(0.0);
    return;
  }
  vec3 p = (vec3(c) + 0.5) * vec3(sourceDims) / vec3(dims) - 0.5;
  vec3 flow = sampleVolume(source, p, sourceDims, sourceColumns).xyz * vec3(dims) / vec3(sourceDims);
  gl_FragColor = vec4(flow, 1.0);
}
