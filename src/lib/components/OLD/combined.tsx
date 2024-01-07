
import { openArray, HTTPStore, slice } from 'zarr'
import React, { useEffect, useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Queue } from 'async-await-queue';

import { makeCloudTransferTex } from '../../utils/makeCloudTransferTex';
// import Vol3dViewer from './Vol3dViewer';

import * as THREE from 'three';
import OrbitUnlimitedControls from '@janelia/three-orbit-unlimited-controls';
import { getBoxSize } from '../../utils/Utils';

// import { vertexShaderVolume, fragmentShaderVolume } from './Shaders';
import vertexShaderVolume from '../shaders/volume.vert';
import fragmentShaderVolume from '../shaders/volume.frag';

export default function LoadZarrData() {
  // const [zarrUrl, setZarrUrl] = useState('https://surfdrive.surf.nl/files/remote.php/nonshib-webdav/Ruisdael-viz/ql.zarr');
  const [zarrUrl, setZarrUrl] = useState('http://localhost:3000/data/ql.zarr');
  const [dataUint8, setDataUint8] = useState(null);
  const dataShape = useRef([]);
  const dataCellSize = useRef([]);
  /**
   * Ref to an array containing all time slices.
   */
  const allTimeSlices = useRef([]);  // 10 is the number of time slices TODO: make this dynamic
  const currentTimeIndex = useRef(0);           // the current time index default 0


  const fetchSubset = async (url, path, timeIndex) => {
    const z = await openArray({ store: url, path, mode: "r" });
    // Suppose you have a 2D array and you want to select a subset
    const subset = await z.get([slice(0, 10), slice(0, 10), slice(0, 10), slice(0, 10)]);

    console.log("sub", subset);
    return subset;
  }

  /**
   * Fetches data from a given URL and path for a specific time index.
   * @param {string} url - The URL to fetch data from.
   * @param {string} path - The path to the data to fetch.
   * @param {number} timeIndex - The time index of the data to fetch.
   * @returns {Promise<void>} - A Promise that resolves when the data has been fetched.
   */
  const fetchData = async (url, path, timeIndex) => {
    // If the data has already been fetched, return.
    if (allTimeSlices.current[timeIndex]) {
      return;
    }

    // Create a new Zarr HTTPStore with the given URL
    const fetchOptions = { redirect: 'follow', mode: 'no-cors', credentials: 'include' };
    const supportedMethods = ['GET', 'HEAD'];
    const store = new HTTPStore(url, { fetchOptions, supportedMethods });

    const zarrdata = await openArray({ store, path, mode: "r" });
    console.log('downloading time slice', timeIndex, '...');
    const { data, strides, shape } = await zarrdata.getRaw([timeIndex, null, null, null]);
    console.log('...done.');

    allTimeSlices.current[timeIndex] = data;

    if (timeIndex === 0) {
      const zarrxvals = await openArray({ store, path: 'xt', mode: "r" });
      const zarryvals = await openArray({ store, path: 'yt', mode: "r" });
      const zarrzvals = await openArray({ store, path: 'zt', mode: "r" });
      const xvals = await zarrxvals.getRaw([null]);
      const yvals = await zarryvals.getRaw([null]);
      const zvals = await zarrzvals.getRaw([null]);

      const xvalues = xvals.data;
      const dx = xvalues[1] - xvalues[0];
      const yvalues = yvals.data;
      const dy = yvalues[1] - yvalues[0];
      const zvalues = zvals.data;
      let sumDifferences = 0;

      for (let i = 1; i < zvalues.length; i++) {
        sumDifferences += Math.abs(zvalues[i] - zvalues[i - 1]);
      }
      const dz = sumDifferences / (zvalues.length - 1);
      console.log("I calculated ", dx, dy, dz);
      dataCellSize.current = [dx, dy, dz];
      dataShape.current = [shape[1], shape[2], shape[0]];
    }
  }

  /**
   * Fetches all data from a given URL and path.
   * @param {string} url - The URL to fetch data from.
   * @param {string} path - The path to the data.
   * @returns {Promise<any>} - A promise that resolves with the fetched data.
   */
  const fetchAllData = async (url, path) => {
    console.log('here we go downloading data...')
    /**
     * Creates a new Queue instance with a concurrency of 1 and a timeout of 5000ms.
     */
    const q = new Queue(1, 5000);

    for (let i = 0; i < 10; ++i) {
      const me = Symbol();
      await q.wait(me, 10 - i);
      try {
        fetchData(url, path, i);
      } catch (e) {
        console.error(e);
      } finally {
        q.end(me);
      }
    }
    return await q.flush();
  }


  //
  // On mount equivalent
  //
  useEffect(() => {
    console.log('fetching data...');
    fetchAllData(zarrUrl, 'ql');
    // fetchData(zarrUrl, 'ql', 0);
    // fetchSubset(zarrUrl, 'ql', 0);


    const interval = setInterval(() => {
      if (allTimeSlices.current[currentTimeIndex.current]) {
        setDataUint8(allTimeSlices.current[currentTimeIndex.current]);
        currentTimeIndex.current = (currentTimeIndex.current + 1) % 10;   // 10 is the number of time slices, go to 0 after 9 TODO: make this dynamic
      }
    }, 500);
    return () => clearInterval(interval);  // run on unmount
  }, []); //
  // setDataUint8(allTimeSlices.current[currentTimeIndex.current]);

  // if (allTimeSlices.current[currentTimeIndex.current]) {
  //   setDataUint8(allTimeSlices.current[currentTimeIndex.current]);
  //   currentTimeIndex.current = (currentTimeIndex.current + 1) % 10;   // 10 is the number of time slices, go to 0 after 9 TODO: make this dynamic
  // }

  return (
    <div className=" flex">
      <pre> Slices downloaded: {JSON.stringify(allTimeSlices.current.length, null, 2)} </pre>

      {dataUint8 && dataUint8.length !== 0 && dataCellSize.current.length !== 0
        ? <Vol3dViewer
          volumeDataUint8={dataUint8}
          volumeSize={dataShape.current}
          voxelSize={dataCellSize.current}
          transferFunctionTex={makeCloudTransferTex()}
          dtScale={0.1}
          finalGamma={6.0}
        />
        : 'LOADING DATA...'}

    </div>);
}





export default function Vol3dViewer(props) {
  const {
    volumeDataUint8,
    volumeSize,
    voxelSize,
    dtScale,
    ambientFactor,
    solarFactor,    
    qLScale,
    gHG,
    dataEpsilon,
    bottomColor,
    bottomHeight,
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

  useEffect(() => {

    const initRenderer = () => {
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
      renderer.setPixelRatio(window.devicePixelRatio);

      // Must be called after setPixelRatio().
      const width = window.innerWidth || mountRef.current.clientWidth;
      const height = window.innerWidth || 100 || mountRef.current.clientHeight;
      renderer.setSize(width, height);

      // The `clientHeight` does not seem to change when resizing to a shorter height.
      // So keep track of the `innerHeight`, which does change, and use it for a correction.
      prevHeightRef.current = window.innerHeight;

      mountRef.current.appendChild(renderer.domElement);
      return renderer;
    }
    window.innerWidth = 800; // sets the window width to 800 pixels

    const windowWidth = window.innerWidth;
    console.log(`Window width: ${windowWidth}px`);

    const initScene = () => {
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
      scene.add(planeMesh);

      return ([scene, box, boxSize, sunLight, hemisphereLight]);
    }

    const initMaterial = (renderer, box, boxSize, sunLight, hemisphereLight) => {
      const volumeTexture = new THREE.DataTexture3D(volumeDataUint8, volumeSize[0], volumeSize[1], volumeSize[2]);
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
          ambientFactor: new THREE.Uniform(0),
          solarFactor: new THREE.Uniform(0),
          qLScale: new THREE.Uniform(0),
          gHG: new THREE.Uniform(0),
          dataEpsilon: new THREE.Uniform(0),
          bottomColor: new THREE.Uniform(new THREE.Vector3(0.0, 0.0005, 0.0033)),
          bottomHeight: new THREE.Uniform(0),
          finalGamma: new THREE.Uniform(0)
        }
      });

      /* eslint no-param-reassign: ["error", { "props": false }] */
      box.material = boxMaterial;

      return [boxMaterial]
    }

    const renderer = initRenderer();
    const [scene, box, boxSize, sunLight, hemisphereLight] = initScene();
    const [boxMaterial] = initMaterial(renderer, box, boxSize, sunLight, hemisphereLight);

    // boxMaterial.blending = THREE.CustomBlending;
    // boxMaterial.transparent = true;

    rendererRef.current = renderer;
    sceneRef.current = scene;
    boxRef.current = box;
    boxMaterialRef.current = boxMaterial;

    // This "clean up" function will be called when the component is unmounted.  The copy of
    // `mountRef.current` eliminates the following warning from React: "The ref value 'mountRef.current'
    // will likely have changed by the time this effect cleanup function runs. If this ref points to a
    // node rendered by React, copy 'mountRef.current' to a variable inside the effect, and use that
    // variable in the cleanup function."
    const mnt = mountRef.current;
    return (() => mnt.removeChild(renderer.domElement));
  }, [volumeSize, voxelSize]/*[volumeDataUint8, volumeSize, voxelSize]*/);


  useEffect(() => {
    if (rendererRef.current) {
      console.log('initCamera');
      const renderer = rendererRef.current;
      const size = new THREE.Vector2();
      renderer.getSize(size);
      const camera = new THREE.PerspectiveCamera(
        cameraFovDegrees,
        size.x / size.y,
        cameraNear,
        cameraFar
      );
      camera.position.set(cameraPosition[0], cameraPosition[1], cameraPosition[2]);
      camera.up.set(cameraUp[0], cameraUp[1], cameraUp[2]);

      // Calculate the camera position for a 45-degree angle
      // const distance = 1;  // Adjust this value to position the camera closer or farther from the origin
      // camera.position.set(distance, distance, distance);
      // camera.lookAt(0, 0, 0);  // Adjust these values if your scene is centered at a different point


      const trackball = new OrbitUnlimitedControls(camera, renderer.domElement);
      trackball.zoomSpeed = orbitZoomSpeed;

      // Match the modifier keys used by VVD_Viewer, as described in the FluoRender user manual:
      // http://www.sci.utah.edu/releases/fluorender_v2.20/FluoRender2.20_Manual.pdf
      // Appendix "C. Keyboard Shortcuts"
      trackball.usePanModAlt = true;
      trackball.usePanModCtrl = true;
      trackball.usePanModMeta = true;

      cameraRef.current = camera;
      trackballRef.current = trackball;
    }
  }, [rendererRef, cameraPosition, cameraUp, cameraFovDegrees, orbitZoomSpeed]);

  // This rendering function is "memoized" so it can be used in `useEffect` blocks.
  const renderScene = useCallback(() => {
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    if (onWebGLRender) {
      onWebGLRender();
    }
  }, [onWebGLRender]);

  useEffect(() => {
    console.log('update OrbitUnlimitedControls');

    trackballRef.current.addEventListener("change", renderScene);

    // This `useEffect` should run only once, but if it ever ran again, this "clean up"
    // function would ensure that the current `renderScene` is no longer called.
    return (() => trackballRef.current.removeEventListener("change", renderScene));
  }, [renderScene]);

  useEffect(() => {
    console.log('update OrbitUnlimitedControls 2');

    if (onCameraChange) {
      if (onCameraChangeRef.current) {
        trackballRef.current.removeEventListener("change", onCameraChangeRef.current);
      }
      onCameraChangeRef.current = onCameraChange;
      trackballRef.current.addEventListener("change", onCameraChangeRef.current);
    }

    // This `useEffect` should run only once, but if it ever ran again, this "clean up"
    // function would ensure that the current `onCameraChange` is no longer called.
    return (() => trackballRef.current.removeEventListener("change", onCameraChangeRef.current));
  }, [onCameraChange]);

  useEffect(() => {
    console.log('update box material');

    boxMaterialRef.current.uniforms.volumeTex.value.dispose();
    const volumeTexture = new THREE.DataTexture3D(volumeDataUint8, volumeSize[0], volumeSize[1], volumeSize[2]);
    volumeTexture.format = THREE.RedFormat
    volumeTexture.type = THREE.UnsignedByteType
    // Disabling mimpaps saves memory.
    volumeTexture.generateMipmaps = false;
    // Linear filtering disables LODs, which do not help with volume rendering.
    volumeTexture.minFilter = THREE.LinearFilter;
    volumeTexture.magFilter = THREE.LinearFilter;
    volumeTexture.needsUpdate = true
    boxMaterialRef.current.uniforms.volumeTex.value = volumeTexture;
    boxMaterialRef.current.uniforms.transferTex.value = transferFunctionTex;
    boxMaterialRef.current.uniforms.dtScale.value = dtScale;
    boxMaterialRef.current.uniforms.ambientFactor.value = ambientFactor;
    boxMaterialRef.current.uniforms.solarFactor.value = solarFactor;
    boxMaterialRef.current.uniforms.qLScale.value = qLScale;
    boxMaterialRef.current.uniforms.gHG.value = gHG;
    boxMaterialRef.current.uniforms.dataEpsilon.value = dataEpsilon;
    boxMaterialRef.current.uniforms.bottomColor.value = bottomColor;
    boxMaterialRef.current.uniforms.bottomHeight.value = bottomHeight;
    boxMaterialRef.current.uniforms.finalGamma.value = finalGamma;

    // This `useEffect` follows the first React rendering, so it is necessary to
    // explicitly force a Three.js rendering to make the volme visible before any
    // interactive camera motion.
    renderScene();
  }, [dtScale, ambientFactor, solarFactor, finalGamma, renderScene, transferFunctionTex]);

  // When the window is resized, force an update to the camera aspect ratio as part of scene rendering.
  useEffect(() => {
    let timeout;
    const handleResize = () => {
      clearTimeout(timeout);
      // Wait a bit before rendering to improve performance.s
      timeout = setTimeout(() => {
        const width = mountRef.current.clientWidth;
        let height = mountRef.current.clientHeight;

        // The `clientHeight` does not seem to change when resizing to a shorter height.
        // So keep track of the `innerHeight`, which does change, and use it for a correction.
        if (window.innerHeight < prevHeightRef.current) {
          height -= prevHeightRef.current - window.innerHeight;
        }
        prevHeightRef.current = window.innerHeight;

        rendererRef.current.setSize(width, height);
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        renderScene();
      }, 2000);
    }
    window.addEventListener("resize", handleResize)
    return (() => window.removeEventListener("resize", handleResize));
  }, [renderScene]);

  if (rendererRef.current) {
    renderScene();
  }

  useEffect(() => {
    if (interactionSpeedup > 1) {
      const setRes = (d) => {
        rendererRef.current.setPixelRatio(window.devicePixelRatio / d);
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;
        rendererRef.current.setSize(width, height);
        renderScene();
      }
      const mousedown = () => setRes(interactionSpeedup);
      const mouseup = () => setRes(1);
      rendererRef.current.domElement.addEventListener("mousedown", mousedown);
      rendererRef.current.domElement.addEventListener("mouseup", mouseup);
      return (() => {
        rendererRef.current.domElement.removeEventListener("mousedown", mousedown);
        rendererRef.current.domElement.removeEventListener("mouseup", mouseup);
      });
    }
    return (() => { });
  }, [interactionSpeedup, renderScene]);

  // Check for WebGL 2 support, and store the result, to avoid creating too may contexts
  // when checking with each rendering.
  const gl2Ref = useRef(true);
  useEffect(() => {
    gl2Ref.current = document.createElement("canvas").getContext("webgpu");
  }, [gl2Ref]);

  if (!gl2Ref.current) {
    return (
      <div className="Fallback">
        WebGL 2 is not supported in this browser.
      </div>
    );
  }

  // Add some buttons to control the camera view.
  useEffect(() => {
    const setCameraView = (position, up) => {
      cameraRef.current.position.set(...position);
      cameraRef.current.up.set(...up);
      cameraRef.current.lookAt(0, 0, 0);
      renderScene();
    };


    return () => {
      document.getElementById("viewAbove").addEventListener("click", () => setCameraView([0, -2, 0], [0, 0, 1]));
      document.getElementById("viewFront").addEventListener("click", () => setCameraView([0, 0, 2], [0, 1, 0]));
    };
  }, [renderScene]);



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
  ambientFactor: PropTypes.number,
  solarFactor: PropTypes.number,
  qLScale: PropTypes.number,
  gHG: PropTypes.number,
  dataEpsilon: PropTypes.number,
  bottomColor: PropTypes.arrayOf(PropTypes.number),
  bottomHeight: PropTypes.number,
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
  dtScale: 0.4,
  ambientFactor: 0.0001,
  solarFactor: 0.01,
  qLScale: 0.00446,
  gHG: 0.8,
  dataEpsilon: 1.e-5,
  bottomColor: [0.0, 0.0005, 0.0033],
  bottomHeight: 675.0,
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

