// shader.frag
uniform float uTransparency;

void main() {
    gl_FragColor = vec4(1.0, 0.5, 0.0, uTransparency); // Example: Orange color, transparency controlled by uniform
}