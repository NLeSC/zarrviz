precision highp float;
uniform sampler2D volumeTex;
uniform float uTransparency; // Global transparency
uniform float uScaleFactor; // Scaling factor to adjust color sensitivity
varying vec2 vUv;

void main() {
  float value = texture2D(volumeTex, vUv).r;
    // Normalize the value to the expected range of your data
  value = value / 255.0;
    // Apply the scaling factor
  value = clamp(value * uScaleFactor, 0.0, 1.0);

    // Define the gradient colors
  vec3 coldColor = vec3(0.0, 0.0, 1.0); // Blue
  vec3 warmColor = vec3(1.0, 0.5, 0.0); // Dark Orange

    // Calculate the color by interpolating between cold and warm colors based on the value
  vec3 color = mix(coldColor, warmColor, value);

    // Calculate the alpha, making red always more transparent than blue
  float baseAlpha = uTransparency * 0.3; // Red's maximum transparency is half of the global transparency
  float alpha = mix(uTransparency, baseAlpha, value); // Interpolate alpha between the global transparency and red's max transparency

  gl_FragColor = vec4(color, alpha); // Set the color with the new alpha
}