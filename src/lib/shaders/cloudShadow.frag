precision highp float;
precision highp sampler3D;

in vec2 vUv;

uniform sampler3D volumeTex;
uniform sampler2D dataConversionTex;
uniform vec3 boxSize;
uniform ivec3 voxelSize;
uniform vec3 displacement;
uniform vec3 sunLightDir;
uniform float bottomHeight;
uniform float extinctionScale;
// World-space footprint (xy) of the shadow texture and the ground height in the volume's object space.
uniform vec2 footprintSize;
uniform float groundZ;

vec2 intersectBox(vec3 orig, vec3 dir) {
  vec3 boxMin = vec3(-.5) * boxSize;
  vec3 boxMax = vec3(.5) * boxSize;
  vec3 invDir = 1. / dir;
  vec3 tmin0 = (boxMin - orig) * invDir;
  vec3 tmax0 = (boxMax - orig) * invDir;
  vec3 tmin = min(tmin0, tmax0);
  vec3 tmax = max(tmin0, tmax0);
  float t0 = max(tmin.x, max(tmin.y, tmin.z));
  float t1 = min(tmax.x, min(tmax.y, tmax.z));
  return vec2(t0, t1);
}

// Same extinction model as volumeClouds.frag.
float extinction(float ql, float h) {
  float rho0 = 1.2250;
  float frac = 0.000118558 * h;
  float LWC = ql == 0.0 ? 0.0 : ql * rho0 * (1.0 - frac + 0.5 * frac * frac - frac * frac * frac / 6.0);
  return ql == 0.0 ? 0.000042 : 3.0 * LWC / (2.0 * 6.0e-3);
}

void main(void) {
  vec3 lightDir = normalize(sunLightDir);
  vec3 origin = vec3((vUv - 0.5) * footprintSize, groundZ);

  vec2 tBox = intersectBox(origin, lightDir);
  tBox.x = max(tBox.x, 0.0);
  if(tBox.x >= tBox.y) {
    gl_FragColor = vec4(1.0);
    return;
  }

  ivec3 volumeTexSize = textureSize(volumeTex, 0);
  float dt = min(1.0 / float(volumeTexSize.x), min(1.0 / float(volumeTexSize.y), 1.0 / float(volumeTexSize.z)));
  vec3 distvec = vec3(volumeTexSize) * vec3(voxelSize);

  vec3 pTex = (origin + tBox.x * lightDir) / boxSize + vec3(0.5);
  vec3 dPTex = (lightDir * dt) / boxSize;
  float stepLengthM = length(distvec * dPTex);

  float transmittance = 1.0;
  float n = 1.0;
  for(float t = tBox.x; t < tBox.y; t += n * dt) {
    pTex += n * dPTex;
    float v = texture(volumeTex, pTex - displacement).r;
    float ql = texture(dataConversionTex, vec2(v, 0.5)).r;
    if(ql > 0.0) {
      float height = bottomHeight + (0.5 - pTex.z) * distvec.z;
      // 0.1 matches the extinction used when ray-marching the visible clouds.
      transmittance *= exp(-0.1 * extinction(ql, height) * extinctionScale * n * stepLengthM);
      if(transmittance < 0.02) {
        break;
      }
    }
    n = min(n * 1.25, 4.0);
  }
  gl_FragColor = vec4(vec3(transmittance), 1.0);
}
