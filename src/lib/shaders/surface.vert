uniform sampler2D volumeTex;
uniform float heightRatio;
uniform float heightBias;
varying vec2 vUv;
varying float hValue;

void main() {
    vUv = uv;
    vec3 pos = position;
    hValue = texture2D(volumeTex, vUv).r;
    pos.y = (1. - hValue) * heightRatio + heightBias;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

    gl_PointSize = 2. * (1. / - mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
}