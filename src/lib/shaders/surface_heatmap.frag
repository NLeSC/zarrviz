// Taken from https://codepen.io/prisoner849/pen/BaNvBgw

//uniform sampler2D gradientTexture;
uniform vec3 colorLow;
uniform vec3 colorMid;
uniform vec3 colorHigh;
varying float hValue;
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
    float invertedInterpolant = interpolant;
 	if( invertedInterpolant < 0.5 )
    {
        float remappedFirstHalf = 1.0 - 2.0 * invertedInterpolant;
        return fromGreenToBlue( remappedFirstHalf );
    }
    else
    {
     	float remappedSecondHalf = 2.0 - 2.0 * invertedInterpolant;
        return fromRedToGreen( remappedSecondHalf );
    }
}

void main() {
    float v = hValue;
    //float v = clamp(hValue, 0., 1.);
 //   vec3 col = texture2D(gradientMap, vec2(0, v)).rgb;
    vec3 col = heat5(v);
//    vec3 col = v < 0.5 ? mix(colorLow, colorMid, 2.0 * v) : mix(colorMid, colorHigh, 2.0 * (v - 0.5));
    //vec3 col = mix(colorMid, colorHigh, hValue);
    gl_FragColor = vec4(col * 0.6, 0.5 * uTransparency);
//    gl_FragColor = vec4(1., 1., 1., 1.);
}