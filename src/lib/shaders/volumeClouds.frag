precision mediump float;
// highp needed for position accumulators to avoid precision issues
in highp vec3 rayDirUnnorm;
in highp vec3 rayOrigin;
in vec3 lightDir;

uniform lowp sampler3D volumeTex;
// Sunlight transmittance per voxel, precomputed in lightVolume.ts
uniform highp sampler3D lightTex;
uniform sampler2D dataConversionTex;
uniform float dtScale;
uniform float finalGamma;
uniform float ambientFactor;
uniform float solarFactor;
uniform vec3 ambientLightColorTop;
uniform vec3 ambientLightColorBot;
uniform vec3 sunLightColor;
// Divides out the colour of the midday sun, so that cloud colours are relative to it (like the eye adapting to daylight).
uniform vec3 whiteBalance;
uniform vec3 boxSize;
uniform ivec3 voxelSize;
uniform float dataScale;
uniform float gHG;
uniform float dataEpsilon;
uniform float extinctionScale;
uniform float bottomHeight;
uniform vec3 displacement;

// Interpolation between two timesteps. volumeTex is the frame at the start of the step and
// volumeTexNext the one at its end. flowTex holds the optical flow, in texture coordinates, relative
// to the global displacement over the whole step (stepDisplacement); frameFraction is the
// position within the step.
uniform lowp sampler3D volumeTexNext;
uniform highp sampler3D flowTex;
uniform float flowBlend;
uniform float frameFraction;
uniform vec3 stepDisplacement;

uniform float uTransparency;

// 0 disables the procedural detail; 1 is full strength.
uniform float noiseStrength;

// Noise feature sizes are expressed in data voxels.
const highp float NOISE_BASE_WAVELENGTH_VOXELS = 1.0;
const float NOISE_EDGE_EROSION = 0.85;
const float NOISE_CORE_EROSION = 0.35;

const float PI = 3.14159265358979323846;

// Radius, in data voxels, of the blur applied to the sunlight lookup; hides the voxel grid in the self-shadowing.
const float LIGHT_BLUR_VOXELS = 2.5;

// Center plus six axis-aligned taps, so shadows are soft in xy and across the z layers.
float sampleLight(vec3 pTex, vec3 radius) {
  float sum = 0.25 * texture(lightTex, pTex).r;
  sum += 0.125 * texture(lightTex, pTex + vec3(radius.x, 0.0, 0.0)).r;
  sum += 0.125 * texture(lightTex, pTex - vec3(radius.x, 0.0, 0.0)).r;
  sum += 0.125 * texture(lightTex, pTex + vec3(0.0, radius.y, 0.0)).r;
  sum += 0.125 * texture(lightTex, pTex - vec3(0.0, radius.y, 0.0)).r;
  sum += 0.125 * texture(lightTex, pTex + vec3(0.0, 0.0, radius.z)).r;
  sum += 0.125 * texture(lightTex, pTex - vec3(0.0, 0.0, radius.z)).r;
  return sum;
}

highp float hashLattice(highp ivec3 c) {
  highp uvec3 v = uvec3(c) * 1664525u + 1013904223u;
  v.x += v.y * v.z;
  v.y += v.z * v.x;
  v.z += v.x * v.y;
  v ^= v >> 16u;
  v.x += v.y * v.z;
  v.y += v.z * v.x;
  v.z += v.x * v.y;
  return float(v.x) * (1.0 / 4294967296.0);
}

highp float valueNoise(highp vec3 p) {
  highp vec3 i = floor(p);
  highp vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  ivec3 ii = ivec3(i);
  float n000 = hashLattice(ii);
  float n100 = hashLattice(ii + ivec3(1, 0, 0));
  float n010 = hashLattice(ii + ivec3(0, 1, 0));
  float n110 = hashLattice(ii + ivec3(1, 1, 0));
  float n001 = hashLattice(ii + ivec3(0, 0, 1));
  float n101 = hashLattice(ii + ivec3(1, 0, 1));
  float n011 = hashLattice(ii + ivec3(0, 1, 1));
  float n111 = hashLattice(ii + ivec3(1, 1, 1));
  return mix(mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
             mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z);
}

// Three-octave fBm, normalized to [0, 1].
highp float fbm(highp vec3 p) {
  float sum = 0.0;
  float amp = 0.5;
  for(int i = 0; i < 3; i++) {
    sum += amp * valueNoise(p);
    p = p * 2.02 + 17.0;
    amp *= 0.5;
  }
  return sum / 0.875;
}

// Only ever lowers ql, so no cloud appears where the data has none.
float erodeCloud(float ql, vec3 pTex, vec3 texSize) {
  float n = fbm(pTex * texSize / NOISE_BASE_WAVELENGTH_VOXELS);
  float core = smoothstep(0.0, 0.2 * dataScale, ql);
  float erosion = noiseStrength * mix(NOISE_EDGE_EROSION, NOISE_CORE_EROSION, core);
  return ql * clamp(1.0 - erosion * (1.0 - n) * 2.0, 0.0, 1.0);
}

// Three.js adds built-in uniforms and attributes:
// https://threejs.org/docs/#api/en/renderers/webgl/WebGLProgram
// uniform vec3 cameraPosition;
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

float phaseHG(float cosTheta, float g) {
  float denom = 1.0 + g * g + 2.0 * g * cosTheta;
  return (1. - g * g) / (4.0 * PI * denom * sqrt(denom));
}

float extinction(float ql, float h) {
  float rho0 = 1.2250;
  float frac = 0.000118558 * h;
  float LWC = ql == 0.0 ? 0.0 : ql * rho0 * (1.0 - frac + 0.5 * frac * frac - frac * frac * frac / 6.0);
  return ql == 0.0 ? 0.000042 : 3.0 * LWC / (2.0 * 6.0e-3);
}

void main(void) {
  highp vec3 rayDir = normalize(rayDirUnnorm);

  // Find the part of the ray that intersects the box, where this part is
  // expressed as a range of "t" values (with "t" being the traditional
  // parameter for a how far a point is along a ray).
  vec2 tBox = intersectBox(rayOrigin, rayDir);

  if(tBox.x >= tBox.y) {
    discard; // Discard the fragment if it does not intersect the volume
  }

  tBox.x = max(tBox.x, 0.);

// Prepare for ray marching
  ivec3 volumeTexSize = textureSize(volumeTex, 0);
  vec3 dt0 = 1. / (vec3(volumeTexSize));
  float dt1 = min(dt0.x, min(dt0.y, dt0.z));
  float slabThickness = float(volumeTexSize.z * voxelSize.z);
  float topHeight = bottomHeight + slabThickness;

  float dt = dtScale * dt1;

  // Prevents a lost WebGL context.
  if(dt < .00001) {
    gl_FragColor = vec4(0.);
    return;
  }

  // Ray starting point, in the "real" space where the box may not be a cube.
  highp vec3 p = rayOrigin + tBox.x * rayDir;

  // Dither to reduce banding (aliasing).
  // https://www.marcusbannerman.co.uk/articles/VolumeRendering.html
  // Interleaved gradient noise (Jimenez 2014): less visible than white noise, jitter limited to one step.
  float random = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  p += random * dt * rayDir;

  // Ray starting point, and change in ray point with each step, for the space where
  // the box has been warped to a cube, for accessing the cubical data texture.
  // The vec3(0.5) is necessary because rays are defined in the space where the box is
  // centered at the origin, but texture look-ups have the origin at a box corner.
  highp vec3 pSized = p / boxSize + vec3(.5);
  highp vec3 dPSized = (rayDir * dt) / boxSize;

  // Most browsers do not need this initialization, but add it to be safe.
  gl_FragColor = vec4(0.);
  //gl_FragColor.rgb = vec3(0.0, 0.0, 128.0);

  vec3 illumination = vec3(0., 0., 0.);
  float transmittance = 1.;
  float nvx = float(volumeTexSize.x);
  float nvy = float(volumeTexSize.y);
  float nvz = float(volumeTexSize.z);
  float vsx = float(voxelSize.x);
  float vsy = float(voxelSize.y);
  float vsz = float(voxelSize.z);
  vec3 distvec = vec3(nvx * vsx, nvy * vsy, nvz * vsz);
  float dx = length(distvec * dPSized);
  float transmittance_threshold = 0.05;

  // Loop-invariant
  float cosTheta = dot(rayDir, -lightDir);
  // Scaled by 4*PI so that an isotropic phase function gives 1 and the sun is comparable to the ambient light.
  float phase = 4.0 * PI * phaseHG(cosTheta, gHG);

  vec3 lightBlurRadius = LIGHT_BLUR_VOXELS / vec3(volumeTexSize);

  // Adaptive step size for empty space skipping
  float stepMultiplier = 1.0;
  bool backedUp = false;

  for(float t = tBox.x; t < tBox.y; t += dt * stepMultiplier) {

    vec3 pTex = pSized - displacement;
    float v;
    if(flowBlend > 0.5) {
      // Both frames are warped to the current time along the flow and cross-faded, so clouds
      // that grow or move are interpolated instead of just translated.
      vec3 flowStep = stepDisplacement + texture(flowTex, pSized).xyz;
      float vStart = texture(volumeTex, pSized - frameFraction * flowStep).r;
      float vEnd = texture(volumeTexNext, pSized + (1.0 - frameFraction) * flowStep).r;
      v = mix(vStart, vEnd, frameFraction);
    } else {
      v = texture(volumeTex, pTex).r;
    }
    // Lookup texture replaces the expensive pow() conversion
    float ql = texture(dataConversionTex, vec2(v, 0.5)).r;
    if(ql > 0.0 && noiseStrength > 0.0) {
      ql = erodeCloud(ql, pTex, vec3(volumeTexSize));
    }
    // Entered a cloud after a double step: go back and resample the skipped point so the
    // cloud boundary is not quantized to the (jittered) double-step grid.
    if(ql > 0.0 && stepMultiplier > 1.5) {
      pSized -= dPSized;
      t -= dt;
      stepMultiplier = 0.0;
      backedUp = true;
      continue;
    }
    if(ql == 0.0) {
      stepMultiplier = backedUp ? 1.0 : 2.0;
      backedUp = false;
      pSized += dPSized * stepMultiplier;
      continue;
    }
    stepMultiplier = 1.0;
    backedUp = false;
    float height = bottomHeight + (0.5 - pSized.z) * distvec.z;

    // extinction parameter
    float ext = 0.1 * extinction(ql, height) * extinctionScale;

    // Always sampled: a single fetch, and skipping it for dense samples made them fully lit
    // depending on where the jittered ray crossed the transmittance cutoff.
    float shadow = clamp(sampleLight(pTex, lightBlurRadius), 0.25, 1.0);

    // Ambient Lighting: linear approx
    float hfrac = (topHeight - height) / (topHeight - bottomHeight);
    vec3 ambientLight = mix(ambientLightColorTop, ambientLightColorBot, hfrac);

    // Total in-scattering
    vec3 inScattering = ql > 0.0 ? (ambientFactor * ambientLight + solarFactor * sunLightColor * phase * shadow) : vec3(0.0, 0.0, 0.0);
    // Beer's law: the fraction of the light that this step absorbs (and scatters towards the camera) is 1 - beer.
    float beer = exp(-ext * dx);

    // Radiance that reaches the camera, attenuated by the cloud in front of this step.
    // Not clamped: clamping each channel would saturate the colour of the light to white.
    illumination += transmittance * (1.0 - beer) * inScattering;
    transmittance *= beer;

    // Break on opacity
    if(transmittance < transmittance_threshold) {
      break;
    }

    // Move to the next point along the ray.
    pSized += dPSized;
  }

  // Surface
  if(transmittance >= (1. - transmittance_threshold)) {
    transmittance = 0.0;
  } else {
    float g = 1. / finalGamma;
    // The gamma is applied to the brightness only: per channel it would push all channels towards 1 and wash out the light colour.
    const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
    float luma = dot(illumination, LUMA);
    vec3 chroma = illumination * whiteBalance / max(luma, 1e-6);
    // Largest channel at 1, so that coloured light keeps its colour instead of clipping to white.
    chroma /= max(max(chroma.r, max(chroma.g, chroma.b)), 1e-6);
    // Modulate the alpha value of the final color by uTransparency
    gl_FragColor = vec4(chroma * pow(min(luma, 1.0), g), (1.0 - transmittance) * uTransparency);
  }
}

// A few browsers show some artifacts if the final alpha value is not 1.0,
// probably a version of the issues discussed here:
// https://webglfundamentals.org/webgl/lessons/webgl-and-alpha.html
//gl_FragColor.a = 1.0;