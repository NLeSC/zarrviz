#include ./flowCommon.glsl

// [1 2 1] / 4 smoothing along every axis, applied before taking gradients.
uniform sampler2D source;

void main(void) {
  ivec3 c;
  if(!currentVoxel(c)) {
    gl_FragColor = vec4(0.0);
    return;
  }
  vec4 sum = vec4(0.0);
  for(int k = -1; k <= 1; k++) {
    float wz = k == 0 ? 0.5 : 0.25;
    for(int j = -1; j <= 1; j++) {
      float wy = j == 0 ? 0.5 : 0.25;
      for(int i = -1; i <= 1; i++) {
        float wx = i == 0 ? 0.5 : 0.25;
        sum += wx * wy * wz * fetchVoxel(source, c + ivec3(i, j, k), dims, columns);
      }
    }
  }
  gl_FragColor = sum;
}
