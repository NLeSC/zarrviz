import * as THREE from 'three';
import { get } from "svelte/store";
import { volumeSizes } from "../stores/allSlices.store";
import { cloudLayerSettings, rainLayerSettings, scaleFactor, temperatureLayerSettings } from '../stores/viewer.store';
import { initMaterial } from './initMaterial';
import { updateMaterial } from './updateMaterial';


// TODO:
// TODO:
// TODO:
// TODO: CONTINUE HERE
// TODO: add and remove the layers from the scene and materials as needed
// TODO:  CONTINUE VERY CAREFULLY LINE BY LINE, I AM TESTING AND THINGS I COMMENTED OUT SHOULD BE PUT BACK
// TODO:
// TODO:
//
// Rendering containers and materials for the volume rendering layers
//
export const boxes: {
  ql?: THREE.Mesh;
  qr?: THREE.Mesh;
  thetavmix?: THREE.Points | THREE.Mesh;
  // thetavmix?: THREE.Mesh;
} = {
  ql: undefined,
  qr: undefined,
  thetavmix: undefined,
};

//
// Layers to be fetch and rendered in the scene programatically
// Add and remove for debugging and testing
// They should be all enabled by default
//
export const data_layers = [
  // 'qr', // rain
  // 'ql', // clouds
  'thetavmix', // temperature
];


/*
 * A box in which the 3D volume texture will be rendered.
 * The box will be centered at the origin, with X in [-0.5, 0.5] so the width is 1, and
 * Y (height) and Z (depth) scaled to match.
 */
export function createVolumetricRenderingBox({ scene, variable, dataUint8 }) {
  //const boxGeometry = new THREE.BoxGeometry(get(volumeSize)[0], get(volumeSize)[1], get(volumeSize)[2]);
  // const boxSizeInKm = 33.8; // 33.8 km
  // const boxScale = boxSizeInKm; // / scaleFactor; // Convert to meters and then apply scale factor to scene units

  const boxZ = get(volumeSizes)[variable][2] / get(volumeSizes)[variable][1];
  // const boxScale = 33800 / scaleFactor; //  33.8 km in meters in scene units
  const boxGeometry = new THREE.BoxGeometry(1, 1, boxZ);
  const planeGeometry = new THREE.PlaneGeometry(1, 1);

  switch (variable) {
    // Clouds Layer
    case 'ql': {
      boxes.ql = new THREE.Mesh(boxGeometry);
      boxes.ql.position.z = 0.25 + 2000 / get(scaleFactor); // 570 meters above the map TODO: calculate this value from the data
      boxes.ql.renderOrder = 0;
      boxes.ql.material = initMaterial({ variable });

      updateMaterial({ variable, dataUint8 });
      get(cloudLayerSettings).enabled && scene.add(boxes.ql);
      break;
    }

    // Rain Layer
    case 'qr': {
      boxes.qr = new THREE.Mesh(boxGeometry);
      boxes.qr.position.z = 0.25 + 2000 / get(scaleFactor); // 570 meters above the map TODO: calculate this value from the data
      boxes.qr.renderOrder = 0;
      boxes.qr.material = initMaterial({ variable });

      updateMaterial({ variable, dataUint8 });
      get(rainLayerSettings).enabled && scene.add(boxes.qr);
      break;
    }
    // Temperature Layer
    case 'thetavmix': {
      //!
      //!
      //! CHAGE PLANE GEOMETRY TO TEXTURE GEOMETRY????? 1000 * 1000 generates 1 million vertices
      //!
      // TODO:  CONTINUE HERE
      // TODO:  CONTINUE HERE
      // TODO:  CONTINUE HERE
      // TODO:  CONTINUE HERE
      // TODO:  CONTINUE HERE
      // TODO:  CONTINUE HERE
      // TODO:  CONTINUE HERE
      // TODO:  CONTINUE HERE
      // TODO:  CONTINUE HERE
      // TODO:  CONTINUE HERE   WORK IN PROGRESS WITH THE HEATMAP MATERIAL
      // TODO:  CONTINUE HERE
      // TODO:  CONTINUE HERE
      // TODO:  CONTINUE HERE
      // TODO:  CONTINUE HERE
      // TODO:  CONTINUE HERE
      // TODO:  CONTINUE HERE
      // TODO:  CONTINUE HERE
      // TODO:  CONTINUE HERE
      // TODO:  CONTINUE HERE
      //!


      boxes.thetavmix = new THREE.Mesh(
        planeGeometry,
        // initMaterial({ variable })
        // TODO calculate here the material with the vertex shader, then fix it in the update material function
        // heatmapExampleMaterial()
        uint8HeatmapExampleMaterial(dataUint8)
      );

      get(temperatureLayerSettings).enabled && scene.add(boxes.thetavmix);
      // renderScene();
      break;

    }
  }

  // renderScene(); // no need to render the scene
}
function uint8HeatmapExampleMaterial(dataUint8 = undefined) {
  const data = dataUint8 || new Uint8Array(1024 * 1024); // Your heatmap data here

  if (!dataUint8) {
    // Fill data with example values between 0 and 250
    for (let i = 0; i < 1024 * 1024; i++) {
      data[i] = Math.floor(Math.random() * 250);
      // data[i] = (i % 255);
    }
  }

  // Assuming `data` is your Uint8Array with 1024x1024 data
  const size = 1024; // Texture size
  const dataTexture = new THREE.DataTexture(data, size, size, THREE.RedFormat, THREE.UnsignedByteType);
  dataTexture.needsUpdate = true;


  const grayFragmentShader = `
  precision highp float;
      uniform sampler2D heatmapTexture;
      varying vec2 vUv;
      uniform float uTransparency;

      void main() {
        float value = texture2D(heatmapTexture, vUv).r;
        gl_FragColor = vec4(value, value, value, uTransparency); // Should display grayscale based on your data

        // gl_FragColor = vec4(vUv, 0.0, 1.0); // Should display a gradient from black to blue to magenta across the plane

        // float value = texture2D(heatmapTexture, vUv).r; // Sample the texture
        // value = value / 255.0; // Normalize the value (assuming your data is in the range 0-255)

        // vec3 lowColor = vec3(0.0, 0.0, 1.0); // Blue
        // vec3 highColor = vec3(1.0, 0.0, 0.0); // Red
        // vec3 color = mix(lowColor, highColor, value); // Mix based on the sampled value

        // gl_FragColor = vec4(color, uTransparency); // Output color
      }
  `
  const colorFragmentShader = `
  precision highp float;
  uniform sampler2D heatmapTexture;
  uniform float uTransparency; // Global transparency
  uniform float uScaleFactor; // Scaling factor to adjust color sensitivity
  varying vec2 vUv;

  void main() {
    float value = texture2D(heatmapTexture, vUv).r;
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
`

  const shaderMaterial = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      heatmapTexture: { value: dataTexture },
      uTransparency: { value: get(temperatureLayerSettings).opacity / 100 },
      uScaleFactor: { value: 200.0 }
    },
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv; // Pass the UV coordinates to the fragment shader
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    // fragmentShader: grayFragmentShader
    fragmentShader: colorFragmentShader
  });
  return shaderMaterial;
}