// Based on the blog post by Will Usher:
// https://www.willusher.io/webgl/2019/01/13/volume-rendering-with-webgl
// The code here adds lighting, depth-based compositing of a solid surface, 
// mirroring, and little tweaks like dithering to reduce aliasing.

export const vertexShaderVolume =
`
out vec3 rayDirUnnorm;
out vec3 lightDir;

uniform vec3 sunLightDir;


// Three.js adds built-in uniforms and attributes:
// https://threejs.org/docs/#api/en/renderers/webgl/WebGLProgram
// attribute vec3 position;
// // = object.matrixWorld
// uniform mat4 modelMatrix;
// // = camera.matrixWorldInverse * object.matrixWorld
// uniform mat4 modelViewMatrix;
// // = camera.projectionMatrix
// uniform mat4 projectionMatrix;
// // = camera position in world space
// uniform vec3 cameraPosition;

void main()
{
  rayDirUnnorm = position - cameraPosition;
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewPosition;
  //lightDir = normalize((viewMatrix * vec4(sunLightDir, 1.0)).xyz - viewPosition.xyz);
  lightDir = normalize(sunLightDir);
}
`

export const fragmentShaderVolume = 
`
precision mediump float;
in vec3 rayDirUnnorm;
in vec3 lightDir;

uniform sampler2D transferTex;
uniform lowp sampler3D volumeTex;
uniform float dtScale;
uniform float ambientFactor;
uniform float solarFactor;
uniform float finalGamma;
uniform vec3 ambientLightColorTop;
uniform vec3 ambientLightColorBot;
uniform vec3 sunLightColor;
uniform highp vec3 boxSize;
uniform ivec3 voxelSize;
uniform float qLScale;
uniform float gHG1;
uniform float gHG2;
uniform float wHG;
uniform float dataEpsilon;
uniform vec3 bottomColor;
uniform float bottomHeight;

// Optional parameters, for when a solid surface is being drawn along with
// the volume data.
uniform float near;
uniform float far;

// Three.js adds built-in uniforms and attributes:
// https://threejs.org/docs/#api/en/renderers/webgl/WebGLProgram
// uniform vec3 cameraPosition;

vec2 intersectBox(vec3 orig, vec3 dir) {
  vec3 boxMin = vec3(-0.5) * boxSize;
  vec3 boxMax = vec3( 0.5) * boxSize;
  vec3 invDir = 1.0 / dir;
  vec3 tmin0 = (boxMin - orig) * invDir;
  vec3 tmax0 = (boxMax - orig) * invDir;
  vec3 tmin = min(tmin0, tmax0);
  vec3 tmax = max(tmin0, tmax0);
  float t0 = max(tmin.x, max(tmin.y, tmin.z));
  float t1 = min(tmax.x, min(tmax.y, tmax.z));
  return vec2(t0, t1);
}

float getQl(vec3 coords) {
  vec3 mirroredZcoords = vec3(coords.x, coords.y, 1.0 - coords.z);
  float v = texture(volumeTex, mirroredZcoords).r;
  float ql = v == 0.0 ? 0.0 : (qLScale * pow(dataEpsilon / qLScale, 1.0 - v / 255.0) - dataEpsilon);
  // For testing purposes
  /*if ((coords.x - 0.5) * (coords - 0.5) + (coords - 0.5) * (coords - 0.5) < 0.1)
  {
    v = 150.0 / 255.0;
    ql = 0.000001;
  }
  else
  {
    v = 0.0;
    ql = 0.0;
  }*/
  // Uncomment to show logarithmic lwc
  //ql = ql_scale * v / 255.0;
  return ql;
}

float phaseHG(float cosTheta, float g) {
  float PI = 3.14159265358979323846;
  float denom = 1.0 + g * g + 2.0 * g * cosTheta;
  return (1.0 - g * g) / (4.0 * PI * denom * sqrt(denom));
}

float extinction(float ql, float h) {
  float rho0 = 1.2250;
  float frac = 0.000118558 * h;
  float LWC = ql == 0.0 ? 0.0 : ql * rho0 * (1.0 - frac + 0.5 * frac * frac - frac * frac * frac / 6.0);
  return ql == 0.0 ? 0.000042 : 3.0 * LWC / (2.0 * 6.0e-3);
}

float getShadow(vec3 pos, vec3 step, vec2 tbounds, float tstep, float stepLengthm, float distz) {
  float transmittance = 1.0;
  vec3 samplePos = pos;
  float t = tbounds.x;
  float n = 1.0;
  while(t < tbounds.y){
    t += (n * tstep);
    samplePos += (n * step);
    float ql = getQl(samplePos);
    float h = bottomHeight + (samplePos.z - 0.5) * distz;
    float beer = exp(-extinction(ql, h) * (n * stepLengthm));
    transmittance *= beer;
    if (transmittance < 0.05){
      break;
    }
    n *= 1.5;
  }
  return clamp(transmittance, 0.0, 1.0);
}


float expint(float a){
  float gamma = 0.5772156649;
  return exp( a ) - a * (1.0 + gamma + log(1.0e-4 + abs(a)) + a * (1.0 + 0.2 * a));
}


/**
This tab contains all the necessary noise functions required to model a cloud shape.
*/

// Hash by David_Hoskins
#define UI0 1597334673U
#define UI1 3812015801U
#define UI2 uvec2(UI0, UI1)
#define UI3 uvec3(UI0, UI1, 2798796415U)
#define UIF (1.0 / float(0xffffffffU))

vec3 hash33(vec3 p){
	uvec3 q = uvec3(ivec3(p)) * UI3;
	q = (q.x ^ q.y ^ q.z)*UI3;
	return -1. + 2. * vec3(q) * UIF;
}

float remap(float x, float a, float b, float c, float d){
  return (((x - a) / (b - a)) * (d - c)) + c;
}

// Gradient noise by iq (modified to be tileable)
float gradientNoise(vec3 x, float freq){
  // grid
  vec3 p = floor(x);
  vec3 w = fract(x);
  
  // quintic interpolant
  vec3 u = w * w * w * (w * (w * 6. - 15.) + 10.);
 
  // gradients
  vec3 ga = hash33(mod(p + vec3(0., 0., 0.), freq));
  vec3 gb = hash33(mod(p + vec3(1., 0., 0.), freq));
  vec3 gc = hash33(mod(p + vec3(0., 1., 0.), freq));
  vec3 gd = hash33(mod(p + vec3(1., 1., 0.), freq));
  vec3 ge = hash33(mod(p + vec3(0., 0., 1.), freq));
  vec3 gf = hash33(mod(p + vec3(1., 0., 1.), freq));
  vec3 gg = hash33(mod(p + vec3(0., 1., 1.), freq));
  vec3 gh = hash33(mod(p + vec3(1., 1., 1.), freq));
  
  // projections
  float va = dot(ga, w - vec3(0., 0., 0.));
  float vb = dot(gb, w - vec3(1., 0., 0.));
  float vc = dot(gc, w - vec3(0., 1., 0.));
  float vd = dot(gd, w - vec3(1., 1., 0.));
  float ve = dot(ge, w - vec3(0., 0., 1.));
  float vf = dot(gf, w - vec3(1., 0., 1.));
  float vg = dot(gg, w - vec3(0., 1., 1.));
  float vh = dot(gh, w - vec3(1., 1., 1.));
	 // interpolation
  return va + 
         u.x * (vb - va) + 
         u.y * (vc - va) + 
         u.z * (ve - va) + 
         u.x * u.y * (va - vb - vc + vd) + 
         u.y * u.z * (va - vc - ve + vg) + 
         u.z * u.x * (va - vb - ve + vf) + 
         u.x * u.y * u.z * (-va + vb + vc - vd + ve - vf - vg + vh);
}

// Tileable 3D worley noise
float worleyNoise(vec3 uv, float freq)
{    
    vec3 id = floor(uv);
    vec3 p = fract(uv);
    float minDist = 10000.;
    for (float x = -1.; x <= 1.; ++x){
      for(float y = -1.; y <= 1.; ++y){
        for(float z = -1.; z <= 1.; ++z){
          vec3 offset = vec3(x, y, z);
          vec3 h = hash33(mod(id + offset, vec3(freq))) * .5 + .5;
    			h += offset;
          vec3 d = p - h;
          minDist = min(minDist, dot(d, d));
        }
      }
    }
  // inverted worley noise
  return 1. - minDist;
}

// Fbm for Perlin noise based on iq's blog
float perlinfbm(vec3 p, float freq, int octaves)
{
    float G = exp2(-.85);
    float amp = 1.;
    float noise = 0.;
    for (int i = 0; i < octaves; ++i){
      noise += amp * gradientNoise(p * freq, freq);
      freq *= 2.;
      amp *= G;
    }
    return noise;
}

// Tileable Worley fbm inspired by Andrew Schneider's Real-Time Volumetric Cloudscapes
// chapter in GPU Pro 7.
float worleyFbm(vec3 p, float freq)
{
    return worleyNoise(p*freq, freq) * .625 +
        	 worleyNoise(p*freq*2., freq*2.) * .25 +
        	 worleyNoise(p*freq*4., freq*4.) * .125;
}

void main(void) {
  vec3 rayDir = normalize(rayDirUnnorm);

  // Reflect z-axis to make the top level face the viewer
  //rayDir.z = -rayDir.z;
  vec3 cameraPositionAdjusted = cameraPosition;
  //cameraPositionAdjusted.z = -cameraPosition.z;

  // Find the part of the ray that intersects the box, where this part is
  // expressed as a range of "t" values (with "t" being the traditional
  // parameter for a how far a point is along a ray).
  vec2 tBox = intersectBox(cameraPositionAdjusted, rayDir);
  vec2 tBoxShadow = intersectBox(vec3(0.0), lightDir);

  if (tBox.x >= tBox.y) {
    discard;
  }

  tBox.x = max(tBox.x, 0.0);
  tBoxShadow.x = max(tBoxShadow.x, 0.0);

  ivec3 volumeTexSize = textureSize(volumeTex, 0);
//  vec3 dt0 = 1.0 / (vec3(volumeTexSize) * abs(rayDir));
  vec3 dt0 = 1.0 / (vec3(volumeTexSize));
  float dt1 = min(dt0.x, min(dt0.y, dt0.z));
  float slabThickness = float(volumeTexSize.z * voxelSize.z);
  float topHeight = bottomHeight + slabThickness;

  float dtScaleShadow = 1.0;
  float dt = dtScale * dt1;
  float dtS = dtScaleShadow * dt1;

  // Prevents a lost WebGL context.
  if (dt < 0.00001) {
    gl_FragColor = vec4(0.0);
    return;
  }

  // Ray starting point, in the "real" space where the box may not be a cube.
  vec3 p = cameraPositionAdjusted + tBox.x * rayDir;

  // Dither to reduce banding (aliasing).
  // https://www.marcusbannerman.co.uk/articles/VolumeRendering.html
  float random = fract(sin(gl_FragCoord.x * 12.9898 + gl_FragCoord.y * 78.233) * 43758.5453);
  random *= 5.0;
  p += random * dt * rayDir;

  // Ray starting point, and change in ray point with each step, for the space where
  // the box has been warped to a cube, for accessing the cubical data texture.
  // The vec3(0.5) is necessary because rays are defined in the space where the box is
  // centered at the origin, but texture look-ups have the origin at a box corner.
  vec3 pSized = p / boxSize + vec3(0.5);
  vec3 dPSized = (rayDir * dt) / boxSize;
  vec3 dPShadow = (lightDir * dtS) / boxSize;

  // Most browsers do not need this initialization, but add it to be safe.
  gl_FragColor = vec4(0.0);
  //gl_FragColor.rgb = vec3(0.0, 0.0, 128.0);

  vec3 illumination = vec3(0.0, 0.0, 0.0);
  float transmittance = 1.0;
  float nvx = float(volumeTexSize.x);
  float nvy = float(volumeTexSize.y);
  float nvz = float(volumeTexSize.z);
  float vsx = float(voxelSize.x);
  float vsy = float(voxelSize.y);
  float vsz = float(voxelSize.z);
  vec3 distvec = vec3(nvx * vsx, nvy * vsy, nvz * vsz);
  float dx = length(distvec * dPSized);
  float dz = length(distvec * dPShadow);
  float transmittance_threshold = 0.05;
  for (float t = tBox.x; t < tBox.y; t += dt) {
    float ql = getQl(pSized);
    float height = bottomHeight + (0.5 - pSized.z) * distvec.z;

    // extinction parameter
    float ext = extinction(ql, height);

    // Henyey-Greenstein phase function
    float cosTheta = dot(rayDir, -lightDir);
    float phase = wHG * phaseHG(cosTheta, gHG1) + (1.0 - wHG) * phaseHG(cosTheta, gHG2);
//    float phase = 1.0;

    // Shadowing
    float shadow = ql > 0.0 ? getShadow(pSized, dPSized, tBoxShadow, dt, dx, distvec.z) : 1.0;
//    illumination += 0.001 * shadow;
//    float shadow = 1.0;

    // Ambient Lighting: linear approx
    float hfrac = (topHeight - height)/(topHeight - bottomHeight);
    vec3 ambientLight = mix(ambientLightColorTop, ambientLightColorBot, hfrac);
//    vec3 ambientLight = vec3(0.0);

    vec3 inScattering = ql > 0.0 ? (ambientFactor * ambientLight + solarFactor * sunLightColor * phase * shadow) : vec3(0.0, 0.0, 0.0);
    
    // Out-scattering: Beer's law
    float beer = ql > 0.0 ? exp(-ext * dx) : 1.0;
    float outScattering = (1.0 - beer) / ext;
    transmittance *= beer;

    if(transmittance < transmittance_threshold) {
      break;
    }

    // Surface
    if(t > tBox.y - dt)
    {
      illumination += transmittance * bottomColor;
      break;
    }

    // Full illumination
    illumination += transmittance * clamp(inScattering * outScattering, 0.0, 1.0);

    // Move to the next point along the ray.
    pSized += dPSized;
  }
  
  float g = 1.0 / finalGamma;
  gl_FragColor = pow(vec4(illumination, transmittance), vec4(g, g, g, 1));

  // A few browsers show some artifacts if the final alpha value is not 1.0,
  // probably a version of the issues discussed here:
  // https://webglfundamentals.org/webgl/lessons/webgl-and-alpha.html
  gl_FragColor.a = 1.0;
}
`
