#include ./flowCommon.glsl

// Vertical gradient (z) and temporal difference (w) of the mean of the frame and the warped next frame.
uniform sampler2D image;
uniform sampler2D warped;

float meanFrame(ivec3 c) {
  return 0.5 * (fetchVoxel(image, c, dims, columns).r + fetchVoxel(warped, c, dims, columns).r);
}

void main(void) {
  ivec3 c;
  if(!currentVoxel(c)) {
    gl_FragColor = vec4(0.0);
    return;
  }
  // Central differences, one-sided at the borders.
  ivec3 lo = max(c - 1, ivec3(0));
  ivec3 hi = min(c + 1, dims - 1);
  float span = float(max(hi.z - lo.z, 1));
  float gradient = (meanFrame(ivec3(c.x, c.y, hi.z)) - meanFrame(ivec3(c.x, c.y, lo.z))) / span;
  float dt = fetchVoxel(warped, c, dims, columns).r - fetchVoxel(image, c, dims, columns).r;
  gl_FragColor = vec4(0.0, 0.0, gradient, dt);
}
