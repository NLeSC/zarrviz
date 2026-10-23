#include ./flowCommon.glsl

// One Jacobi iteration of Horn-Schunck restricted to the z-component of the total flow: the
// neighbour average of the current z-flow, corrected for the brightness constancy linearised around
// the flow that the warp started from. The horizontal components stay at the global displacement,
// and the z-flow cannot become smaller than its initial value (no downward residual).
uniform sampler2D flow;
uniform sampler2D startFlow;
uniform sampler2D derivatives;
uniform float smoothness2;
uniform vec3 initialFlow;

void main(void) {
  ivec3 c;
  if(!currentVoxel(c)) {
    gl_FragColor = vec4(0.0);
    return;
  }
  float average = (fetchVoxel(flow, c + ivec3(-1, 0, 0), dims, columns).z + fetchVoxel(flow, c + ivec3(1, 0, 0), dims, columns).z +
                   fetchVoxel(flow, c + ivec3(0, -1, 0), dims, columns).z + fetchVoxel(flow, c + ivec3(0, 1, 0), dims, columns).z +
                   fetchVoxel(flow, c + ivec3(0, 0, -1), dims, columns).z + fetchVoxel(flow, c + ivec3(0, 0, 1), dims, columns).z) / 6.0;
  vec4 d = fetchVoxel(derivatives, c, dims, columns);
  float start = fetchVoxel(startFlow, c, dims, columns).z;
  float r = (d.z * (average - start) + d.w) / (smoothness2 + d.z * d.z);
  vec3 initial = initialFlow * vec3(dims);
  gl_FragColor = vec4(initial.xy, max(average - d.z * r, initial.z), 1.0);
}
