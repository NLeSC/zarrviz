// A component to do 3D direct volume rendering of `Uint8Array` data volume.
// Also supports depth-based compositing within the volume of an opaque 3D surface,
// specied as a Three.js `Mesh`.
// Includes props for controlling the details of the rendering, but no user interface
// controls.

import React, { useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import * as THREE from 'three';
import OrbitUnlimitedControls from '@janelia/three-orbit-unlimited-controls';
import { getBoxSize } from '../utils/Utils';

// import { vertexShaderVolume, fragmentShaderVolume } from './Shaders';
import vertexShaderVolume from '../shaders/volume.vert';
import fragmentShaderVolume from '../shaders/volume.frag';


export default function Vol3dViewer(props) {
  const {
    volumeDataUint8,
    volumeSize,
    voxelSize,
    dtScale,
    inScatFactor,
    qLScale,
    gHG,
    dataEpsilon,
    bottomColor,
    transferFunctionTex,
    finalGamma,
    interactionSpeedup,
    cameraPosition,
    cameraUp,
    // Vertical field of view
    cameraFovDegrees,
    orbitZoomSpeed,
    onCameraChange,
    onWebGLRender,
  } = props;

  // For mounting the Three.js renderer image in the appropriate place in the DOM.
  const mountRef = useRef(null);

  // Some Three.js values that need to be referenced after initialization.
  // According to https://reactjs.org/docs/hooks-reference.html#useref,
  // `useRef` "is handy for keeping any mutable value around similar to how you’d use
  // instance fields in classes."  Note that trying to store these particular values
  // with `useState` seems to cause repeated updates and a crash.
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const sceneRef = useRef(null);
  const boxRef = useRef(null);
  const boxMaterialRef = useRef(null);
  const trackballRef = useRef(null);
  const onCameraChangeRef = useRef(null);
  const prevHeightRef = useRef(null);

  const cameraNear = 0.01;
  const cameraFar = 10.0;
  // Different props affect different parts of the Three.js state, and a change to only
  // one prop should not causes all the Three.js state to be reinitialized.  It is not clear
  // that the Three.js state could be split between multiple React components, each having
  // only the appropriate subset of the props.  So this component makes significant use of
  // the `useEffect` hook, with a different hook for each part of the Three.js state
  // that needs to be initialized based on particular props.  Those particular props, and
  // any other data dependent on them, are listed in the array that is the second argument
  // to `useEffect`, and the code that is first argument is executed only the when
  // those props change.



    function initRenderer  () {
      console.log('initRenderer');

      // Three.js now uses WebGL 2 by default, so no special canvas context is needed.
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      //renderer.setClearColor("#000000");
      renderer.setClearAlpha(0);

      // For a shader using `gl_FragCoord`, as in this code (Shaders.js), the following
      // use of `setPixelRatio` is not recommended in this guide:
      // https://threejs.org/manual/#en/responsive
      // On the other hand, the Three.js authors say the following use is correct:
      // https://github.com/mrdoob/three.js/issues/12770

      // Eliminates some artifacts on MacBook Pros with Retina displays.
      // renderer.setPixelRatio(window.devicePixelRatio);

      // Must be called after setPixelRatio().
      const width = window.innerWidth || mountRef.current.clientWidth;
      const height = window.innerWidth || 100 || mountRef.current.clientHeight;
      renderer.setSize(width, height);

      // The `clientHeight` does not seem to change when resizing to a shorter height.
      // So keep track of the `innerHeight`, which does change, and use it for a correction.
      prevHeightRef.current = window.innerHeight;

      mountRef.current.appendChild(renderer.domElement);

       // Initialize the camera with aspect ratio and position.
       console.log('initCamera');
       const size = new THREE.Vector2();
       renderer.getSize(size);
       const camera = new THREE.PerspectiveCamera(
         cameraFovDegrees,
         size.x / size.y,
         cameraNear,
         cameraFar
       );
       camera.position.set(...cameraPosition);
       camera.up.set(...cameraUp);

       // Set up camera controls with custom settings.
       const trackball = new OrbitUnlimitedControls(camera, renderer.domElement);
       trackball.zoomSpeed = orbitZoomSpeed;
       trackball.usePanModAlt = true;
       trackball.usePanModCtrl = true;
       trackball.usePanModMeta = true;

       // Store references to the camera and trackball for access outside the effect.
       cameraRef.current = camera;
       trackballRef.current = trackball;
      return renderer;
    }
    // window.innerWidth = 800; // sets the window width to 800 pixels


    function initScene () {
      console.log('initScene');

      const scene = new THREE.Scene();

      // A box in which the 3D volume texture will be rendered.  The box will be
      // centered at the origin, with X in [-0.5, 0.5] so the width is 1, and
      // Y (height) and Z (depth) scaled to match.

      const [boxWidth, boxHeight, boxDepth] = getBoxSize(volumeSize, voxelSize);
      const boxSize = new THREE.Vector3(boxWidth, boxHeight, boxDepth);
      console.log(`Voxel size ${voxelSize[0]}, ${voxelSize[1]}, ${voxelSize[2]}`);
      console.log(`Box size ${boxWidth}, ${boxHeight}, ${boxDepth}`);

      const boxGeometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
      const box = new THREE.Mesh(boxGeometry);
      scene.add(box);

      // Lights, to be used both during rendering the volume, and rendering the optional surface.

      const sunLightDir = new THREE.Vector3(0.0, 0.5, 0.5);
      const sunLightColor = new THREE.Color(0.99, 0.83, 0.62);
      const sunLight = new THREE.DirectionalLight(sunLightColor.getHex(), 1.0);
      sunLight.position.copy(sunLightDir);
      scene.add(sunLight);
      const seaLightColor = new THREE.Color(0.0, 0.0005, 0.0033);
      const toaLightColor = new THREE.Color(0.0, 0.0002, 0.033);
      const hemisphereLight = new THREE.HemisphereLight(seaLightColor.getHex(), toaLightColor.getHex(), 1.0);
      scene.add(hemisphereLight);


      // Add an axes helper to the scene to help with debugging.
      const axesHelper = new THREE.AxesHelper(5);
      scene.add(axesHelper);
      //
      // Adding the plane mesh to the scene to hold the Map texture
      //
      const textureLoader = new THREE.TextureLoader();
      const texture = textureLoader.load('/maps/nl-map.webp');
      // Create a plane geometry and mesh
      const planeGeometry = new THREE.PlaneGeometry(boxWidth * 4, boxHeight * 4);
      const planeMaterial = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
      const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);


      // Position the plane underneath the box
      planeMesh.position.set(-boxWidth / 1000, -boxHeight / 1000, boxDepth * -3);  // Adjust position as needed

      // Rotate the plane to be horizontal
      // planeMesh.rotation.x = -Math.PI / 2;


      // Add the plane mesh to the scene
      // scene.add(planeMesh);

      return ([scene, box, boxSize, sunLight, hemisphereLight]);
    }

  function initMaterial({ box, boxSize, sunLight, hemisphereLight }) {
      const volumeTexture = new THREE.Data3DTexture(volumeDataUint8, volumeSize[0], volumeSize[1], volumeSize[2]);
      volumeTexture.format = THREE.RedFormat
      volumeTexture.type = THREE.UnsignedByteType
      // Disabling mimpaps saves memory.
      volumeTexture.generateMipmaps = false;
      // Linear filtering disables LODs, which do not help with volume rendering.
      volumeTexture.minFilter = THREE.LinearFilter;
      volumeTexture.magFilter = THREE.LinearFilter;
      volumeTexture.needsUpdate = true

      const lightColor = sunLight.color;
      const lightColorV = new THREE.Vector3(lightColor.r, lightColor.g, lightColor.b);
      const ambientLightColorV = new THREE.Vector3(hemisphereLight.color.r, hemisphereLight.color.g, hemisphereLight.color.b);
      //      const ambientLightColorV = new THREE.Vector3(0.3, 0.7, 0.98);

      const boxMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShaderVolume,
        fragmentShader: fragmentShaderVolume,
        side: THREE.BackSide,
        transparent: true,
        opacity: 1.0,
        uniforms: {
          boxSize: new THREE.Uniform(boxSize),
          volumeTex: new THREE.Uniform(volumeTexture),
          voxelSize: new THREE.Uniform(voxelSize),
          sunLightDir: new THREE.Uniform(sunLight.position),
          sunLightColor: new THREE.Uniform(lightColorV),
          ambientLightColor: new THREE.Uniform(ambientLightColorV),
          near: new THREE.Uniform(cameraNear),
          far: new THREE.Uniform(cameraFar),
          // The following are set separately, since they are based on `props` values that can
          // change often, and should not trigger complete re-initialization.
          transferTex: new THREE.Uniform(null),
          dtScale: new THREE.Uniform(0),
          inScatFactor: new THREE.Uniform(0),
          qLScale: new THREE.Uniform(0),
          gHG: new THREE.Uniform(0),
          dataEpsilon: new THREE.Uniform(0),
          bottomColor: new THREE.Uniform(new THREE.Vector3(0.0, 0.0005, 0.0033)),
          finalGamma: new THREE.Uniform(0)
        }
      });

      /* eslint no-param-reassign: ["error", { "props": false }] */
      box.material = boxMaterial;

      return boxMaterial
    }
// Render the scene. This function can be reused in other effects or callbacks.
    function renderScene() {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }

    useEffect(() => {
  // Initialize the Three.js renderer and scene components.
  const renderer = initRenderer();
  const [scene, box, boxSize, sunLight, hemisphereLight] = initScene();
  const boxMaterial = initMaterial({ box, boxSize, sunLight, hemisphereLight });

  // Store references to the renderer, scene, and box for access outside the effect.
  rendererRef.current = renderer;
  sceneRef.current = scene;
  boxRef.current = box;

  // Dispose of the old texture to free up memory.
  boxMaterial.uniforms.volumeTex.value.dispose();

  // Create a new 3D texture for the volume data.
  const volumeTexture = new THREE.Data3DTexture(volumeDataUint8, volumeSize[0], volumeSize[1], volumeSize[2]);
  volumeTexture.format = THREE.RedFormat;
  volumeTexture.type = THREE.UnsignedByteType;
  volumeTexture.generateMipmaps = false; // Saves memory.
  volumeTexture.minFilter = THREE.LinearFilter; // Better for volume rendering.
  volumeTexture.magFilter = THREE.LinearFilter;
  volumeTexture.needsUpdate = true;

  // Update material uniforms with new texture and parameters.
 boxMaterial.uniforms.volumeTex.value = volumeTexture;
 boxMaterial.uniforms.transferTex.value = transferFunctionTex;
 boxMaterial.uniforms.dtScale.value = dtScale;
 boxMaterial.uniforms.inScatFactor.value = inScatFactor;
 boxMaterial.uniforms.qLScale.value = qLScale;
 boxMaterial.uniforms.gHG.value = gHG;
 boxMaterial.uniforms.dataEpsilon.value = dataEpsilon;
 boxMaterial.uniforms.bottomColor.value = bottomColor;
 boxMaterial.uniforms.finalGamma.value = finalGamma;

  // Initial render to display the scene.
  renderScene();

  // Define cleanup function if needed.
  return () => {
    // Any necessary cleanup would go here.
  };
}, []); // Runs only on component mount.





  // The `ref` here sets up the mounting of the Three.js renderer image in the
  // appropriate place in the DOM.
  return (
    <div className="h-full w-screen">

      <div className="Vol3dViewer"
        ref={mountRef}
      />


      <div>
        <div className="Vol3dViewer" ref={mountRef} />
        <div className="camera-control">
          {/* ...existing sliders... */}
          <button className="btn" id="viewAbove">View from Side</button>
          <button className="btn" id="viewFront">View from Front</button>
        </div>
      </div>
      {/* <pre>{JSON.stringify(cameraRef, null, 2)}</pre> */}
    </div>
  );
}

Vol3dViewer.propTypes = {
  // A JavaScript `Uint8Array`
  volumeDataUint8: PropTypes.shape({
    buffer: PropTypes.shape({ byteLength: PropTypes.number }),
  }).isRequired,
  volumeSize: PropTypes.arrayOf(PropTypes.number).isRequired,
  voxelSize: PropTypes.arrayOf(PropTypes.number).isRequired,
  dtScale: PropTypes.number,
  inScatFactor: PropTypes.number,
  qLScale: PropTypes.number,
  gHG: PropTypes.number,
  dataEpsilon: PropTypes.number,
  bottomColor: PropTypes.arrayOf(PropTypes.number),
  // A Three.js `DataTexture` (https://threejs.org/docs/#api/en/textures/DataTexture)
  transferFunctionTex: PropTypes.shape({ type: PropTypes.number }).isRequired,
  finalGamma: PropTypes.number,
  interactionSpeedup: PropTypes.number,
  cameraPosition: PropTypes.arrayOf(PropTypes.number),
  cameraUp: PropTypes.arrayOf(PropTypes.number),
  cameraFovDegrees: PropTypes.number,
  orbitZoomSpeed: PropTypes.number,
  onCameraChange: PropTypes.func,
  onWebGLRender: PropTypes.func,
};

Vol3dViewer.defaultProps = {
  dtScale: 1.0,
  inScatFactor: 0.06,
  qLScale: 0.00446,
  gHG: 0.8,
  dataEpsilon: 1.e-5,
  bottomColor: [0.0, 0.0005, 0.0033],
  finalGamma: 4.5,
  interactionSpeedup: 1,
  cameraPosition: [0, 0, 2],
  // Gives the correct orientation for Janelia FlyLight datasets.
  cameraUp: [0, 1, 0],
  cameraFovDegrees: 45.0,
  orbitZoomSpeed: 0.15,
  onCameraChange: null,
  onWebGLRender: null
};

