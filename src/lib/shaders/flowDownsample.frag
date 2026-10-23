#include ./flowCommon.glsl

// Box average of the previous (finer) pyramid level.
uniform sampler2D source;
uniform ivec3 sourceDims;
uniform int sourceColumns;
uniform ivec3 factor;

void main(void) {
  ivec3 c;
  if(!currentVoxel(c)) {
    gl_FragColor = vec4(0.0);
    return;
  }
  vec4 sum = vec4(0.0);
  float n = 0.0;
  for(int k = 0; k < 2; k++) {
    for(int j = 0; j < 2; j++) {
      for(int i = 0; i < 2; i++) {
        ivec3 offset = ivec3(i, j, k);
        ivec3 s = c * factor + offset;
        if(all(lessThan(offset, factor)) && all(lessThan(s, sourceDims))) {
          sum += fetchVoxel(source, s, sourceDims, sourceColumns);
          n += 1.0;
        }
      }
    }
  }
  gl_FragColor = sum / n;
}
