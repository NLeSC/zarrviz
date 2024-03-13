uniform sampler2D volumeTex; // Your volume texture
precision highp float;

uniform vec3 colorLow;
uniform vec3 colorMid;
uniform vec3 colorHigh;
varying float hValue; // Assumed to be set correctly in the vertex shader
uniform float uTransparency;

vec3 fromRedToGreen( float interpolant )
{
    if( interpolant < 0.5 )
    {
        return vec3(1.0, 2.0 * interpolant, 0.0);
    }
    else
    {
        return vec3(2.0 - 2.0 * interpolant, 1.0, 0.0 );
    }
}

vec3 fromGreenToBlue( float interpolant )
{
    if( interpolant < 0.5 )
    {
        return vec3(0.0, 1.0, 2.0 * interpolant);
    }
    else
    {
        return vec3(0.0, 2.0 - 2.0 * interpolant, 1.0 );
    }
}

vec3 heat5( float interpolant )
{
    float invertedInterpolant = 1.0 - interpolant; // Ensure this inversion is what you want
    if( invertedInterpolant < 0.5 )
    {
        float remappedFirstHalf = 2.0 * invertedInterpolant;
        return fromGreenToBlue( remappedFirstHalf );
    }
    else
    {
        float remappedSecondHalf = 2.0 * (invertedInterpolant - 0.5);
        return fromRedToGreen( remappedSecondHalf );
    }
}

void main() {
    float value = texture2D(volumeTex, vec2(hValue, 0.5)).r; // Assuming hValue is used to sample the texture
    vec3 col = heat5(value); // Use the value from the texture to determine the color
    // gl_FragColor = vec4(col, uTransparency); // Use the calculated color and transparency
    gl_FragColor = vec4(1., 1., 1., uTransparency); // Use the calculated color and transparency
}
