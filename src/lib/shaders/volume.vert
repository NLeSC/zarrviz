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
  rayDirUnnorm=position-cameraPosition;
  vec4 viewPosition=modelViewMatrix*vec4(position,1.);
  gl_Position=projectionMatrix*viewPosition;
  lightDir=normalize((viewMatrix*vec4(sunLightDir,1.)).xyz-viewPosition.xyz);
}