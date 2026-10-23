#include ./flowCommon.glsl

// Resamples the two source volumes (r: frame, g: next frame) onto the analysis grid. The stored
// values are logarithmically encoded, so that a step from empty to barely cloudy is as large as a
// step to the densest cloud; they are converted to a linear intensity (1 at the visible cloud
// core), so that the flow is driven by the visible clouds and not by faint, noisy cloud edges.
uniform sampler3D volumeA;
uniform sampler3D volumeB;
uniform float dataScale;
uniform float dataEpsilon;
// Source voxels per analysis voxel.
uniform vec3 blockSize;

float intensity(float v) {
  float ql = v == 0.0 ? 0.0 : dataScale * pow(dataEpsilon / dataScale, 1.0 - v) - dataEpsilon;
  return clamp(ql / (0.2 * dataScale), 0.0, 1.0);
}

vec2 sampleFrames(vec3 p) {
  return vec2(intensity(texture(volumeA, p).r), intensity(texture(volumeB, p).r));
}

void main(void) {
  ivec3 c;
  if(!currentVoxel(c)) {
    gl_FragColor = vec4(0.0);
    return;
  }
  vec3 center = (vec3(c) + 0.5) / vec3(dims);
  vec2 value;
  if(all(lessThanEqual(blockSize, vec3(1.01)))) {
    value = sampleFrames(center);
  } else {
    // Several linear taps over the analysis voxel approximate its box average.
    value = vec2(0.0);
    for(int k = -1; k <= 1; k++) {
      for(int j = -1; j <= 1; j++) {
        for(int i = -1; i <= 1; i++) {
          value += sampleFrames(center + vec3(float(i), float(j), float(k)) / (3.0 * vec3(dims)));
        }
      }
    }
    value /= 27.0;
  }
  gl_FragColor = vec4(value, 0.0, 1.0);
}
