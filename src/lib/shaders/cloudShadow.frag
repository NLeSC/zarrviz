precision highp float;
precision highp sampler3D;

in vec2 vUv;

// Sunlight transmittance volume, in the same texture space as the cloud data.
uniform sampler3D lightTex;
uniform vec3 boxSize;
uniform vec3 displacement;
uniform vec3 sunLightDir;
// World-space footprint (xy) of the shadow texture and the ground height in the volume's object space.
uniform vec2 footprintSize;
uniform float groundZ;

void main(void) {
  vec3 lightDir = normalize(sunLightDir);
  lightDir.z = max(lightDir.z, 0.05);
  vec3 p = vec3((vUv - 0.5) * footprintSize, groundZ);

  float bottom = -0.5 * boxSize.z;
  float top = 0.5 * boxSize.z;
  if(p.z > top) {
    gl_FragColor = vec4(1.0);
    return;
  }
  // Below the volume nothing attenuates the light, so just move up along the sun ray to its bottom face.
  if(p.z < bottom) {
    p += lightDir * ((bottom - p.z) / lightDir.z);
  }

  vec3 pTex = p / boxSize + vec3(0.5) - displacement;
  if(any(lessThan(pTex.xy, vec2(0.0))) || any(greaterThan(pTex.xy, vec2(1.0)))) {
    gl_FragColor = vec4(1.0);
    return;
  }
  pTex.z = clamp(pTex.z, 0.0, 1.0);
  gl_FragColor = vec4(vec3(texture(lightTex, pTex).r), 1.0);
}
