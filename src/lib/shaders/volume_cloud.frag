precision mediump float;
in vec3 rayDirUnnorm;
in vec3 lightDir;

uniform lowp sampler3D volumeTex;
uniform float dtScale;
uniform float inScatFactor;
uniform float finalGamma;
uniform float ambientFactor;
uniform float solarFactor;
uniform vec3 ambientLightColorTop;
uniform vec3 ambientLightColorBot;
uniform vec3 sunLightColor;
uniform highp vec3 boxSize;
uniform ivec3 voxelSize;
uniform float dataScale;
uniform float gHG;
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

vec2 intersectBox(vec3 orig,vec3 dir){
  vec3 boxMin=vec3(-.5)*boxSize;
  vec3 boxMax=vec3(.5)*boxSize;
  vec3 invDir=1./dir;
  vec3 tmin0=(boxMin-orig)*invDir;
  vec3 tmax0=(boxMax-orig)*invDir;
  vec3 tmin=min(tmin0,tmax0);
  vec3 tmax=max(tmin0,tmax0);
  float t0=max(tmin.x,max(tmin.y,tmin.z));
  float t1=min(tmax.x,min(tmax.y,tmax.z));
  return vec2(t0,t1);
}

float cameraDistanceFromDepth(float depth){
  float zN=2.*depth-1.;
  float z=2.*near*far/(far+near-zN*(far-near));
  return near+z;
}

float phaseHG(float cosTheta, float g) {
  float PI=3.14159265358979323846;
  float denom=1.0+g*g+2.0*g*cosTheta;
  return (1.-g*g)/(4.0*PI*denom*sqrt(denom));
}

float extinction(float ql, float h) {
  float rho0 = 1.2250;
  float frac = 0.000118558 * h;
  float LWC = ql == 0.0 ? 0.0 : ql * rho0 * (1.0 - frac + 0.5 * frac * frac - frac * frac * frac / 6.0);
  return ql == 0.0 ? 0.000042 : 3.0 * LWC / (2.0 * 6.0e-3);
}

float getShadow(vec3 pos, vec3 step, vec2 tbounds, float tstep, float stepLengthm, float distz, vec3 delta) {
  float transmittance = 1.0;
  vec3 samplePos = pos;
  float t = tbounds.x;
  float n = 1.0;
  while(t < tbounds.y){
    t += (n * tstep);
    samplePos += (n * step);

    float v=texture(volumeTex,samplePos).r;
    float ql=(v==0.0)?0.:(dataScale*pow(dataEpsilon/dataScale,1.0-v)-dataEpsilon);
    if(ql==0.)
    {
      n*=1.5;
      continue;
    }

    float h = bottomHeight + (samplePos.z - 0.5) * distz;
    float beer = exp(-extinction(ql, h) * (n * stepLengthm));
    transmittance *= beer;
    if (transmittance < 0.05){
      break;
    }
    n *= 1.5;
  }
  return clamp(transmittance, 0.25, 1.0);
}

void main(void){
  vec3 rayDir=normalize(rayDirUnnorm);

  // Reflect z-axis to make the top level face the viewer
  //rayDir.z=-rayDir.z;
  vec3 cameraPositionAdjusted=cameraPosition;
  //cameraPositionAdjusted.z=-cameraPosition.z;

  // Find the part of the ray that intersects the box, where this part is
  // expressed as a range of "t" values (with "t" being the traditional
  // parameter for a how far a point is along a ray).
  vec2 tBox=intersectBox(cameraPositionAdjusted,rayDir);
  vec2 tBoxShadow = intersectBox(vec3(0.0), lightDir);

  if(tBox.x>=tBox.y){
    discard;
  }

  tBox.x=max(tBox.x,0.);
  tBoxShadow.x = max(tBoxShadow.x, 0.0);

  ivec3 volumeTexSize=textureSize(volumeTex,0);
  vec3 dt0=1./(vec3(volumeTexSize));
  float dt1=min(dt0.x,min(dt0.y,dt0.z));
  float slabThickness=float(volumeTexSize.z*voxelSize.z);
  float topHeight=bottomHeight+slabThickness;

  float dtScaleShadow=1.0;
  float dt=dtScale*dt1;
  float dtS=dtScaleShadow*dt1;

  // Prevents a lost WebGL context.
  if(dt<.00001){
    gl_FragColor=vec4(0.);
    return;
  }

  // Ray starting point, in the "real" space where the box may not be a cube.
  vec3 p=cameraPositionAdjusted+tBox.x*rayDir;

  // Dither to reduce banding (aliasing).
  // https://www.marcusbannerman.co.uk/articles/VolumeRendering.html
  float random=fract(sin(gl_FragCoord.x*12.9898+gl_FragCoord.y*78.233)*43758.5453);
  random*=5.;
  p+=random*dt*rayDir;

  // Ray starting point, and change in ray point with each step, for the space where
  // the box has been warped to a cube, for accessing the cubical data texture.
  // The vec3(0.5) is necessary because rays are defined in the space where the box is
  // centered at the origin, but texture look-ups have the origin at a box corner.
  vec3 pSized=p/boxSize+vec3(.5);
  vec3 dPSized=(rayDir*dt)/boxSize;
  vec3 dPShadow=(lightDir*dtS)/boxSize;

  // Most browsers do not need this initialization, but add it to be safe.
  gl_FragColor=vec4(0.);
  //gl_FragColor.rgb = vec3(0.0, 0.0, 128.0);

  vec3 illumination=vec3(0.,0.,0.);
  float transmittance=1.;
  float nvx=float(volumeTexSize.x);
  float nvy=float(volumeTexSize.y);
  float nvz=float(volumeTexSize.z);
  float vsx=float(voxelSize.x);
  float vsy=float(voxelSize.y);
  float vsz=float(voxelSize.z);
  vec3 distvec=vec3(nvx*vsx,nvy*vsy,nvz*vsz);
  float dx=length(distvec*dPSized);
  float dz=length(distvec*dPShadow);
  float transmittance_threshold=0.01;
  vec3 dg=vec3(1)/vec3(volumeTexSize);
  for(float t=tBox.x;t<tBox.y;t+=dt){

    float v=texture(volumeTex,pSized).r;
    float ql=(v==0.0)?0.:(dataScale*pow(dataEpsilon/dataScale,1.0-v)-dataEpsilon);
    if(ql==0.0)
    {
      pSized+=dPSized;
      continue;
    }
    float height=bottomHeight+(0.5-pSized.z)*distvec.z;

    // extinction parameter
    float ext=0.1*extinction(ql,height);

    // Henyey-Greenstein phase function
    float cosTheta=dot(rayDir,-lightDir);
    float phase=phaseHG(cosTheta,gHG);

    // Shadowing
    float shadow=ql>0.?getShadow(pSized,dPShadow,tBoxShadow,dt,dz,distvec.z,dg):1.0;
    //float shadow=1.0;

    // Ambient Lighting: linear approx
    float hfrac=(topHeight-height)/(topHeight-bottomHeight);
    vec3 ambientLight=mix(ambientLightColorTop,ambientLightColorBot,hfrac);

    // Total in-scattering
    vec3 inScattering=ql>0.0?(ambientFactor*ambientLight+solarFactor*sunLightColor*phase*shadow):vec3(0.0,0.0,0.0);
    // Out-scattering: Beer's law
    float beer=exp(-ext*dx);
    float outScattering=((1.0-beer)/ext)+(1.0-beer*beer);
    //float outScattering=1.0;
    //float outScattering=((1.0-beer)/ext);
    
    //transmittance*=(1.0+beer-beer*beer);
    transmittance*=beer;

    // Full illumination
    illumination+=transmittance*clamp(inScattering*outScattering,0.0,1.0);

    // Break on opacity
    if(transmittance<transmittance_threshold){
      break;
    }

    // Move to the next point along the ray.
    pSized+=dPSized;
  }

  // Surface
  if(transmittance>=(1.-transmittance_threshold))
  {
    transmittance=0.0;
  }
  else
  {
    float g=1./finalGamma;
    gl_FragColor=pow(vec4(illumination, (1.0-transmittance)),vec4(g,g,g,1));
  }
}
// A few browsers show some artifacts if the final alpha value is not 1.0,
// probably a version of the issues discussed here:
// https://webglfundamentals.org/webgl/lessons/webgl-and-alpha.html
//gl_FragColor.a = 1.0;