precision mediump float;
in vec3 rayDirUnnorm;
in vec3 lightDir;

uniform sampler2D transferTex;
uniform lowp sampler3D volumeTex;
uniform float dtScale;
uniform float inScatFactor;
uniform float finalGamma;
uniform vec3 ambientLightColor;
uniform vec3 sunLightColor;
uniform highp vec3 boxSize;
uniform ivec3 voxelSize;
uniform float qLScale;
uniform float gHG;
uniform float dataEpsilon;
uniform vec3 bottomColor;

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

float phaseHG(float cosTheta,float g){
  float PI=3.14159265358979323846;
  float denom=1.+g*g+2.*g*cosTheta;
  return(1.-g*g)/(4.*PI*denom*sqrt(denom));
}

void main(void){
  vec3 rayDir=normalize(rayDirUnnorm);
  
  // Reflect z-axis to make the top level face the viewer
  rayDir.z=-rayDir.z;
  vec3 cameraPositionAdjusted=cameraPosition;
  cameraPositionAdjusted.z=-cameraPosition.z;
  
  // Find the part of the ray that intersects the box, where this part is
  // expressed as a range of "t" values (with "t" being the traditional
  // parameter for a how far a point is along a ray).
  vec2 tBox=intersectBox(cameraPositionAdjusted,rayDir);
  
  if(tBox.x>=tBox.y){
    discard;
  }
  
  tBox.x=max(tBox.x,0.);
  
  ivec3 volumeTexSize=textureSize(volumeTex,0);
  //  vec3 dt0 = 1.0 / (vec3(volumeTexSize) * abs(rayDir));
  vec3 dt0=1./(vec3(volumeTexSize));
  float dt=min(dt0.x,min(dt0.y,dt0.z));
  
  dt*=dtScale;
  
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
  
  // This renderer matches VVD_Viewer when looking along the smallest axis of the volume,
  // but looks too bright on the other axes.  So normalize alpha to reduce it on these
  // other axes.
  float l=length(rayDir*boxSize);
  float lMin=min(boxSize.x,min(boxSize.y,boxSize.z));
  
  // A step of one voxel, for computing the gradient by a central difference.
  vec3 dg=vec3(1)/vec3(volumeTexSize);
  
  // Most browsers do not need this initialization, but add it to be safe.
  gl_FragColor=vec4(0.);
  //gl_FragColor.rgb = vec3(0.0, 0.0, 128.0);
  
  vec3 illumination=vec3(0.,0.,0.);
  float transmittance=1.;
  float vsx=float(voxelSize.x);
  float vsy=float(voxelSize.y);
  float vsz=float(voxelSize.z);
  float dx=length(vec3(vsx,vsy,vsz)*dPSized);
  float transmittance_threshold=.01;
  
  for(float t=tBox.x;t<tBox.y;t+=dt){
    float v=texture(volumeTex,pSized).r;
    float currentDensity=v==0.?0.:(qLScale*pow(dataEpsilon/qLScale,1.-v/255.)-dataEpsilon);
    
    // For testing purposes
    /*if ((pSized.x - 0.5) * (pSized.x - 0.5) + (pSized.y - 0.5) * (pSized.y - 0.5) < 0.1)
    {
      v = 150.0 / 255.0;
      currentDensity = 0.000001;
    }
    else
    {
      v = 0.0;
      currentDensity = 0.0;
    }*/
    
    // Uncomment to show logarithmic lwc
    //currentDensity = ql_scale * v / 255.0;
    
    // Barometric formula to compute lwc from ql and the extinction parameter
    float h=(tBox.y-t)*dPSized.z*35.;
    float rho0=1.2041;
    float H=7400.;
    float LWC=v==0.?0.:currentDensity*rho0*exp(-h/H);// Needed for extinction
    float extinction=currentDensity>0.?3.*LWC/(2.*6.e-6):.000042;
    
    // Henyey-Greenstein phase function
    float cosTheta=dot(rayDir,-lightDir);
    float phase=phaseHG(cosTheta,gHG);
    
    // Total in-scattering
    vec3 inScattering=currentDensity>0.?(inScatFactor*clamp(ambientLightColor+sunLightColor*phase,0.,1.)):vec3(0.,0.,0.);
    
    // Out-scattering: Beer's law
    float beer=currentDensity>0.?exp(-extinction*dx):1.;
    float outScattering=(1.-beer)/extinction;
    transmittance*=beer;
    
    // Full illumination
    illumination+=transmittance*(inScattering*outScattering);
    
    if(transmittance<transmittance_threshold){
      break;
    }
    
    // Move to the next point along the ray.
    pSized+=dPSized;
  }
  
  // Surface
  if(transmittance>=(1.-transmittance_threshold))
  {
    //inScattering = bottomColor;
    //outScattering = 1.0;
    //illumination = vec3(0.0, 0.0, 0.0);
    transmittance=0.;
  }
  
  float g=1./finalGamma;
  gl_FragColor=pow(vec4(illumination,transmittance),vec4(g,g,g,1));
}
// A few browsers show some artifacts if the final alpha value is not 1.0,
// probably a version of the issues discussed here:
// https://webglfundamentals.org/webgl/lessons/webgl-and-alpha.html
//gl_FragColor.a = 1.0;