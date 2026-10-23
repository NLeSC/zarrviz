#include ./flowCommon.glsl

// Flow of the first iteration: the global displacement, in voxels of this level.
uniform vec3 initialFlow;

void main(void) {
  gl_FragColor = vec4(initialFlow * vec3(dims), 1.0);
}
