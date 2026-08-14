precision highp float;
uniform sampler2D volumeTex;
uniform float uTransparency; // Global transparency
uniform float uScaleFactor; // Scaling factor to adjust color sensitivity
varying vec2 vUv;

void main() {
  float value = texture2D(volumeTex, vUv).r;

// Multi-stop gradient: blue -> cyan -> green -> yellow -> orange -> red
  vec3 c0 = vec3(0.0, 0.0, 1.0);   // blue
  vec3 c1 = vec3(0.0, 1.0, 1.0);   // cyan
  vec3 c2 = vec3(0.0, 1.0, 0.0);   // green
  vec3 c3 = vec3(1.0, 1.0, 0.0);   // yellow
  vec3 c4 = vec3(0.5, 0.0, 0.5);   // purple

  vec3 color;
  if (value < 0.2)       color = mix(c0, c1, value / 0.2);
  else if (value < 0.4)  color = mix(c1, c2, (value - 0.2) / 0.2);
  else if (value < 0.6)  color = mix(c2, c3, (value - 0.4) / 0.2);
  else                   color = mix(c3, c4, (value - 0.6) / 0.2);

  gl_FragColor = vec4(color, uTransparency); // Set the color with the new alpha
}