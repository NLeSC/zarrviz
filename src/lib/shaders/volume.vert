out vec3 rayDirUnnorm;
out vec3 rayOrigin;
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
  // Object space, so the box the fragment shader marches follows the mesh transform.
  rayOrigin=(inverse(modelMatrix)*vec4(cameraPosition,1.)).xyz;
  rayDirUnnorm=position-rayOrigin;
  vec4 viewPosition=modelViewMatrix*vec4(position,1.);
  gl_Position=projectionMatrix*viewPosition;
  lightDir=normalize(sunLightDir);
}