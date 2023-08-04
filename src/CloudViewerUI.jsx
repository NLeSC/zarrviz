import { ImprovedNoise } from 'https://unpkg.com/three/examples/jsm/math/ImprovedNoise.js';
import { Vol3dViewer } from '@janelia/web-vol-viewer';
import * as THREE from 'three';
import { openArray, HTTPStore } from 'zarr'
import React, { useState, useEffect, useRef } from 'react';
import './CloudViewerUI.css';

async function fetchdata(url, variable, time_index) {
    const fetchOptions = { redirect: 'follow', mode: 'cors', credentials: 'include'};
    const supportedMethods = ['GET', 'HEAD'];
    const store = new HTTPStore(url, {fetchOptions, supportedMethods});
    const zarrdata = await openArray({store: store, path: variable, mode: "r"});
    const { data, strides, shape } = await zarrdata.getRaw([time_index, null, null, null]);
    console.log('hoera 0', shape);
    return { data, shape };
}

function CloudViewerUI() {
    const [zarrUrl, setZarrUrl] = React.useState('https://surfdrive.surf.nl/files/remote.php/nonshib-webdav/Ruisdael-viz/ql.zarr');
    const [dataUint8, setDataUint8] = React.useState(null);
    const [dataShape, setDataShape] = React.useState(null);

    const fetchData = async (url, variable, time_index) => {
        const fetchOptions = { redirect: 'follow', mode: 'cors', credentials: 'include'};
        const supportedMethods = ['GET', 'HEAD'];
        const store = new HTTPStore(url, {fetchOptions, supportedMethods});
        const zarrdata = await openArray({store: store, path: variable, mode: "r"});
        const { data, strides, shape } = await zarrdata.getRaw([time_index, null, null, null]);
        console.log('hoera 0', shape);
        setDataShape([shape[1], shape[2], shape[0]]);
        setDataUint8(data);
    }


    useEffect(() => {
        const result = fetchData(zarrUrl, 'ql', 0);
//        setDataShape(result.shape);
//        setDataUint8(result.data);
//        console.log('hoera 1');
    }, []);
    console.log('hoera 2', dataShape);

    let viewer = null;
    if (dataUint8 && dataUint8.length != 0) {
        console.log('hoera 3');
      viewer = (
          <Vol3dViewer
            volumeDataUint8={dataUint8}
            volumeSize={dataShape}
            voxelSize={[1, 1, 1]}
            transferFunctionTex={makeFluoTransferTex(0.5, 200, 3, 255, '#f3f6f4')}
          />
      );
    }
    return (
      <div className="BasicUI">
        <div
          className="Middle"
          tabIndex={0}
          //        onKeyPress={onKeyPress}
          role='link'>
          {viewer}
        </div>
      </div>); 
}

export function makeFluoTransferTex(alpha0, peak, dataGamma, alpha1, colorStr) {
  // See Wan et al., 2012, "FluoRender: An Application of 2D Image Space Methods for
  // 3D and 4D Confocal Microscopy Data Visualization in Neurobiology Research"
  // https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3622106/

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
    const extraAlpha = alpha / 255.0;
    data[4 * i] = color.r * extraAlpha;
    data[4 * i + 1] = color.g * extraAlpha;
    data[4 * i + 2] = color.b * extraAlpha;
    data[4 * i + 3] = alpha;
  }

  const transferTexture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  transferTexture.wrapS = THREE.ClampToEdgeWrapping;
  transferTexture.wrapT = THREE.ClampToEdgeWrapping;
  transferTexture.needsUpdate = true;

  return transferTexture;
}

export default CloudViewerUI;