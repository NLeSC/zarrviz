precision highp float;
precision highp sampler3D;

in vec2 vUv;

uniform sampler3D volumeTex;
uniform sampler2D dataConversionTex;
// Sunlight transmittance of the slab above the one being computed (unused for the top slab).
uniform sampler2D prevSlab;
uniform int slab;
// Number of slabs in the light volume; finer than the data so interpolation stays smooth.
uniform int lightDepth;
uniform vec3 boxSize;
uniform ivec3 voxelSize;
uniform vec3 sunLightDir;
uniform float bottomHeight;
uniform float extinctionScale;

// Same extinction model as volumeClouds.frag.
float extinction(float ql, float h) {
  float rho0 = 1.2250;
  float frac = 0.000118558 * h;
  float LWC = ql == 0.0 ? 0.0 : ql * rho0 * (1.0 - frac + 0.5 * frac * frac - frac * frac * frac / 6.0);
  return ql == 0.0 ? 0.000042 : 3.0 * LWC / (2.0 * 6.0e-3);
}

float extinctionAt(vec3 pTex, vec3 distvec) {
  if(any(lessThan(pTex, vec3(0.0))) || any(greaterThan(pTex, vec3(1.0)))) {
    return 0.0;
  }
  float v = texture(volumeTex, pTex).r;
  float ql = texture(dataConversionTex, vec2(v, 0.5)).r;
  float h = bottomHeight + (pTex.z - 0.5) * distvec.z;
  // 0.1 matches the extinction used when ray-marching the visible clouds, which keeps
  // the shadow gradient spread over several slabs instead of a hard step at the cloud top.
  return 0.1 * extinction(ql, h) * extinctionScale;
}

void main(void) {
  ivec3 size = textureSize(volumeTex, 0);
  float nz = float(lightDepth);
  vec3 distvec = vec3(size) * vec3(voxelSize);
  vec3 lightDir = normalize(sunLightDir);
  lightDir.z = max(lightDir.z, 0.05);

  // Step from the center of this slab to the center of the slab above it, along the sun direction.
  vec3 dPTex = (lightDir / lightDir.z) * (boxSize.z / nz) / boxSize;
  float stepLengthM = length(distvec * dPTex);

  vec3 pTex = vec3(vUv, (float(slab) + 0.5) / nz);
  vec3 pUp = pTex + dPTex;
  bool isTop = slab == lightDepth - 1;

  float extHere = extinctionAt(pTex, distvec);
  float extUp = isTop ? 0.0 : extinctionAt(pUp, distvec);

  float lightAbove = 1.0;
  if(!isTop && all(greaterThanEqual(pUp.xy, vec2(0.0))) && all(lessThanEqual(pUp.xy, vec2(1.0)))) {
    lightAbove = texture(prevSlab, pUp.xy).r;
  }
  float T = lightAbove * exp(-0.5 * (extHere + extUp) * stepLengthM);
  gl_FragColor = vec4(T, 0.0, 0.0, 1.0);
}
