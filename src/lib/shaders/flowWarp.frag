#include ./flowCommon.glsl

// The next frame (image.g), looked up where the current flow points to.
uniform sampler2D image;
uniform sampler2D flow;

void main(void) {
  ivec3 c;
  if(!currentVoxel(c)) {
    gl_FragColor = vec4(0.0);
    return;
  }
  vec3 f = fetchVoxel(flow, c, dims, columns).xyz;
  gl_FragColor = vec4(sampleVolume(image, vec3(c) + f, dims, columns).g, 0.0, 0.0, 1.0);
}
