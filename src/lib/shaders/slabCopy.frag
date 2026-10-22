precision highp float;

in vec2 vUv;

uniform sampler2D source;

void main(void) {
  gl_FragColor = vec4(texture(source, vUv).r, 0.0, 0.0, 1.0);
}
