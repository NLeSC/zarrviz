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

const int BLUR_TAPS = 32;
const float BLUR_RADIUS_VOXELS = 3.0;

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

  // Blur over a disc of a few voxels (golden-angle spiral) to hide the layered structure of the light volume.
  ivec3 size = textureSize(lightTex, 0);
  vec2 radius = BLUR_RADIUS_VOXELS * boxSize.xy / vec2(size.xy);
  float sum = 0.0;
  float weightSum = 0.0;
  for(int i = 0; i < BLUR_TAPS; i++) {
    float r = sqrt((float(i) + 0.5) / float(BLUR_TAPS));
    float angle = float(i) * 2.399963;
    vec2 offset = r * vec2(cos(angle), sin(angle)) * radius;
    vec3 pTex = (p + vec3(offset, 0.0)) / boxSize + vec3(0.5) - displacement;
    float lit = 1.0;
    if(all(greaterThanEqual(pTex.xy, vec2(0.0))) && all(lessThanEqual(pTex.xy, vec2(1.0)))) {
      pTex.z = clamp(pTex.z, 0.0, 1.0);
      lit = texture(lightTex, pTex).r;
    }
    float w = 1.0 - 0.5 * r * r;
    sum += w * lit;
    weightSum += w;
  }
  gl_FragColor = vec4(vec3(sum / weightSum), 1.0);
}
