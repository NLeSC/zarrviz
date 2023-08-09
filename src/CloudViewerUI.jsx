import Vol3dViewer from './Vol3dViewer';
import * as THREE from 'three';
import { openArray, HTTPStore } from 'zarr'
import React, { useEffect } from 'react';
import './CloudViewerUI.css';
import { Queue } from 'async-await-queue';


function CloudViewerUI() {
    const [zarrUrl, setZarrUrl] = React.useState('https://surfdrive.surf.nl/files/remote.php/nonshib-webdav/Ruisdael-viz/ql.zarr');
    const [dataUint8, setDataUint8] = React.useState(null);
    const dataShape = React.useRef([]);
    const dataCellSize = React.useRef([]);
    const allTimeSlices = React.useRef(new Array(10));
    const currentTimeIndex = React.useRef(0);

    const fetchData = async (url, variable, timeIndex) => {
        if (allTimeSlices.current[timeIndex]) {
            return;
        }
        const fetchOptions = { redirect: 'follow', mode: 'cors', credentials: 'include'};
        const supportedMethods = ['GET', 'HEAD'];
        const store = new HTTPStore(url, {fetchOptions, supportedMethods});
        const zarrdata = await openArray({store: store, path: variable, mode: "r"});
        console.log('downloading time slice', timeIndex, '...');
        const { data, strides, shape } = await zarrdata.getRaw([timeIndex, null, null, null]);
        console.log('...done.');
        allTimeSlices.current[timeIndex] = data;
        if ( timeIndex == 0 ){
          const zarrxvals = await openArray({store: store, path: 'xt', mode: "r"});
          const zarryvals = await openArray({store: store, path: 'yt', mode: "r"});
          const zarrzvals = await openArray({store: store, path: 'zt', mode: "r"});
          const xvals = await zarrxvals.getRaw([null]);
          const yvals = await zarryvals.getRaw([null]);
          const zvals = await zarrzvals.getRaw([null]);
          let xvalues = xvals.data;
          let dx = xvalues[1] - xvalues[0];
          let yvalues = yvals.data;
          let dy = yvalues[1] - yvalues[0];
          let zvalues = zvals.data;
          let sumDifferences = 0;
          for (let i = 1; i < zvalues.length; i++) {
            sumDifferences += Math.abs(zvalues[i] - zvalues[i - 1]);
          }
          let dz = sumDifferences / (zvalues.length - 1);
          console.log("I calculated ", dx, dy, dz);
          dataCellSize.current = [dx/dx, dy/dx, dz/dx];
          dataShape.current = [shape[1], shape[2] * (dy/dx), shape[0] * (dz/dx)];
        }
    }

    const fetchAllData = async (url, variable) => {
      console.log('here we go downloading data...')
      const q = new Queue(1, 5000);
      for (let i = 0; i < 10; ++i) {
        const me = Symbol();
        await q.wait(me, 10 - i);
        try {
            fetchData(url, variable, i);
        } catch (e) {
          console.error(e);
        } finally {
          q.end(me);
        }
      }
      return await q.flush();
    }

    useEffect(() => {
      fetchAllData(zarrUrl, 'ql');
    }, [zarrUrl]);

    useEffect(() => {
      const interval =  setInterval(() => {
        if (allTimeSlices.current[currentTimeIndex.current]){
          setDataUint8(allTimeSlices.current[currentTimeIndex.current]);
          currentTimeIndex.current = (currentTimeIndex.current + 1) % 10;
        }
      }, 1000);
      return () => clearInterval(interval);
      }, []);

    let viewer = null;
    if (dataUint8 && dataUint8.length != 0 && dataCellSize.current.length != 0) {
      viewer = (
          <Vol3dViewer
            volumeDataUint8={dataUint8}
            volumeSize={dataShape.current}
            voxelSize={dataCellSize.current}
            transferFunctionTex={makeFluoTransferTex(10, 250, 10, 25, '#f3f6f4')}
            dtScale={0.5}
          />
      );
    }
    return (
      <div className="BasicUI">
        <div
          className="Middle"
          tabIndex={0}
 //         onKeyDown={onKeyDown}
          role='link'>
          {viewer}
        </div>
      </div>); 
}

export function makeFluoTransferTex(alpha0, peak, dataGamma, alpha1, colorStr) {
  // See Wan et al., 2012, "FluoRender: An Application of 2D Image Space Methods for
  // 3D and 4D Confocal Microscopy Data Visualization in Neurobiology Research"
  // https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3622106/

/*  const transferFunction = new THREE.DataTexture([
    // Scalar value, Color R, Color G, Color B, Opacity
    1, 255, 255, 255, 3,  // Fully transparent for low densities
    25, 204, 204, 204, 12, // Light gray with low opacity for lighter smoke
    77, 123, 123, 123, 50,  // Medium gray with some opacity
    180, 77, 77, 77, 126,  // Dark gray with more opacity
    255, 26, 26, 26, 250   // Almost fully opaque for high densities (dense clouds)
  ], 5, 1, THREE.RGBAFormat);

  // Set parameters for the DataTexture1D
  transferFunction.minFilter = THREE.NearestFilter;
  transferFunction.magFilter = THREE.NearestFilter;
  transferFunction.wrapS = THREE.ClampToEdgeWrapping;
  transferFunction.wrapT = THREE.ClampToEdgeWrapping;
  transferFunction.needsUpdate = true;
  return transferFunction;*/

  const color = new THREE.Color(colorStr).multiplyScalar(255);
  const width = 256;
  const height = 1;
  const size = width * height;
  const data = new Uint8Array(4 * size);
  for (let i = 0; i < width; i += 1) {
    // Compute the alpha for the data value at `i` in three steps. For the first step, 
    // think of a triangular "tent" with `y = 0` at `x = 0`, `y = 1` at `x = peak`, and 
    // `y = 0` at `x = 255`, and find the `y` on this tent at `x = i`.
    // The slope of the appropriate side of the "tent" is `1.0 / d`.
    const d = (i < peak) ? peak : width - peak - 1;
    const x = (i < peak) ? i : width - i - 1;
    const y = (1.0 / d) * x;

    // For the second step, use an exponential of `dataGamma` to make the straight "tent" line 
    // "droop" or "bulge".
    const yGamma = y ** (1.0 / dataGamma);

    // For the third step, apply a similar "droop"/"bulge" to a "tent" with `y = alpha0`
    // at `x = 0` and `y = 255` at `x = peak` and `y = alpha1` at `x = 255`.
    let alpha = (i < peak) ? alpha0 : alpha1;
    alpha += yGamma * (255 - alpha);
    alpha = Math.round(alpha);
    alpha = Math.max(0, Math.min(alpha, 255));

    // Match VVD_Viewer, which has an extra factor of alpha in the colors (but not alphas) of
    // its transfer function.
//    const extraAlpha = alpha / 255.0;
    const extraAlpha = 1;
    data[4 * i] = color.r * extraAlpha;
    data[4 * i + 1] = color.g * extraAlpha;
    data[4 * i + 2] = color.b * extraAlpha;
    data[4 * i + 3] = alpha;

    let r = 0;

    if (i < 10)
    {
      r = 255;
      alpha = 30;
    }
    else if(i < 25)
    {
      r = 255;
      alpha = 42;
    }
    else if(i < 77)
    {
      r = 255;
      alpha = 80;
    }
    else if(i < 180)
    {
      r = 255;
      alpha = 126;
    }
    else
    {
      r = 255;
      alpha = 250;

    }
    data[4 * i] = r;
    data[4 * i + 1] = r;
    data[4 * i + 2] = r;
    data[4 * i + 3] = alpha;


  }
  console.log(data);

  const transferTexture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  transferTexture.wrapS = THREE.ClampToEdgeWrapping;
  transferTexture.wrapT = THREE.ClampToEdgeWrapping;
  transferTexture.needsUpdate = true;

  return transferTexture;
}

export default CloudViewerUI;