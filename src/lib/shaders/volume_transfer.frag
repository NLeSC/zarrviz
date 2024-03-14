// This code is based upon Janelia's web-vol-viewer
// https://github.com/JaneliaSciComp/web-vol-viewer

precision mediump float;
in vec3 rayDirUnnorm;
in vec3 lightDir;

uniform sampler2D transferTex;
uniform lowp sampler3D volumeTex;
uniform lowp sampler3D coarseVolumeTex;
uniform float dtScale;
uniform float finalGamma;
uniform vec3 sunLightColor;
uniform highp vec3 boxSize;
uniform float dataScale;
uniform float alphaNorm;
uniform bool useLighting;

// Optional parameters, for when a solid surface is being drawn along with
// the volume data.
uniform float near;
uniform float far;

uniform float uTransparency;

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

  if(tBox.x>=tBox.y){
    discard;
  }

  tBox.x=max(tBox.x,0.);

  ivec3 volumeTexSize=textureSize(coarseVolumeTex,0);
  //  vec3 dt0 = 1.0 / (vec3(volumeTexSize) * abs(rayDir));
  vec3 dt0=1./(vec3(volumeTexSize)*abs(rayDir));
  float dt=min(dt0.x,min(dt0.y,dt0.z)) * 0.5;

  // Prevents a lost WebGL context.
  if(dt<.00001){
    gl_FragColor=vec4(0.);
    return;
  }

  // Ray starting point, in the "real" space where the box may not be a cube.
  vec3 p=cameraPositionAdjusted+tBox.x*rayDir;

  // Dither to reduce banding (aliasing).
  // https://www.marcusbannerman.co.uk/articles/VolumeRendering.html

  // Ray starting point, and change in ray point with each step, for the space where
  // the box has been warped to a cube, for accessing the cubical data texture.
  // The vec3(0.5) is necessary because rays are defined in the space where the box is
  // centered at the origin, but texture look-ups have the origin at a box corner.
  vec3 pSized=p/boxSize+vec3(.5);
  vec3 dPSized=(rayDir*dt)/boxSize;
  vec3 dPSmall = dPSized/8.0;

  // Most browsers do not need this initialization, but add it to be safe.
  gl_FragColor=vec4(0.);
  //gl_FragColor.rgb = vec3(0.0, 0.0, 128.0);

  vec3 illumination=vec3(0.,0.,0.);
  float transmittance=1.;
  float transmittance_threshold=0.05;
  vec3 random=fract(sin(gl_FragCoord.x*12.9898+gl_FragCoord.y*78.233)*43758.5453)*dt*rayDir/8.0;
  for(float t=tBox.x;t<tBox.y;t+=dt){

    float value=texture(coarseVolumeTex, pSized).r;
    if(value != 100.0){
      #pragma unroll_loop_start
      for(int i = 0; i < 8; ++i)
      {
        float fineValue = texture(volumeTex, pSized + random).r;
        vec4 vColor = fineValue == 0.0 ? vec4(0.0) : texture(transferTex, vec2(fineValue, 0.5));
        vColor.a *= alphaNorm;
        illumination.rgb += transmittance*clamp(vColor.a,0.0,1.0)*vColor.rgb;
        transmittance *= ( 1.0 - clamp(vColor.a,0.0,1.0));
        pSized += dPSmall;
      }
      #pragma unroll_loop_end
    }
    else{
      pSized += dPSized;
    }

    // Break on opacity
    if(transmittance<transmittance_threshold){
      break;
    }
  }

  // Surface
  if(transmittance>=(1.-transmittance_threshold))
  {
    transmittance=0.0;
  }
  else
  {
    // float g=1./finalGamma;
    // gl_FragColor=pow(vec4(illumination,1.0-transmittance),vec4(g,g,g,1));
    float g=1./finalGamma;
    vec4 finalColor = pow(vec4(illumination,1.0-transmittance),vec4(g,g,g,1));
    // Apply uTransparency to the alpha component
    finalColor.a *= uTransparency;
    gl_FragColor = finalColor;
  }
}
// A few browsers show some artifacts if the final alpha value is not 1.0,
// probably a version of the issues discussed here:
// https://webglfundamentals.org/webgl/lessons/webgl-and-alpha.html
//gl_FragColor.a = 1.0;