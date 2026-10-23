#include ./flowCommon.glsl

// Writes one z-slab of the final flow to a 3D texture, as the residual with respect to the
// global displacement and in normalized texture coordinates (a fraction of the box). Only the
// z-component is non-zero, and it is not negative.
uniform sampler2D flow;
uniform int slab;
uniform vec3 initialFlow;
// Limit of the residual, in voxels.
uniform float maxResidual;

void main(void) {
  ivec3 c = ivec3(ivec2(gl_FragCoord.xy), slab);
  float residual = fetchVoxel(flow, c, dims, columns).z / float(dims.z) - initialFlow.z;
  gl_FragColor = vec4(0.0, 0.0, clamp(residual, 0.0, maxResidual / float(dims.z)), 1.0);
}
