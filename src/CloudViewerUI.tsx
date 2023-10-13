import Vol3dViewer from './Vol3dViewer';
import * as THREE from 'three';
import { openArray, HTTPStore } from 'zarr'
import React, { useEffect } from 'react';
import './CloudViewerUI.css';
import { Queue } from 'async-await-queue';


function CloudViewerUI() {
  // const [zarrUrl, setZarrUrl] = React.useState('https://surfdrive.surf.nl/files/remote.php/nonshib-webdav/Ruisdael-viz/ql.zarr');
  const [zarrUrl, setZarrUrl] = React.useState('http://localhost:3000/data/ql.zarr');
  const [dataUint8, setDataUint8] = React.useState(null);
  const dataShape = React.useRef([]);
  const dataCellSize = React.useRef([]);
  const allTimeSlices = React.useRef(new Array(10));
  const currentTimeIndex = React.useRef(0);

  const fetchData = async (url, path, timeIndex) => {
    if (allTimeSlices.current[timeIndex]) {
      return;
    }
    const fetchOptions = { redirect: 'follow', mode: 'no-cors', credentials: 'include' };
    const supportedMethods = ['GET', 'HEAD'];
    const store = new HTTPStore(url, { fetchOptions, supportedMethods });
    console.log('🎹 store', store);

    const zarrdata = await openArray({ store, path, mode: "r" });
    console.log('downloading time slice', timeIndex, '...');
    const { data, strides, shape } = await zarrdata.getRaw([timeIndex, null, null, null]);
    console.log('...done.');

    allTimeSlices.current[timeIndex] = data;
    if (timeIndex == 0) {
      const zarrxvals = await openArray({ store, path: 'xt', mode: "r" });
      const zarryvals = await openArray({ store, path: 'yt', mode: "r" });
      const zarrzvals = await openArray({ store, path: 'zt', mode: "r" });
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
      dataCellSize.current = [dx, dy, dz];
      dataShape.current = [shape[1], shape[2], shape[0]];
    }
  }

  const fetchAllData = async (url, path) => {
    console.log('here we go downloading data...')
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

  useEffect(() => {
    console.log('fetching data...');
    fetchAllData(zarrUrl, 'ql');
  }, [zarrUrl]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (allTimeSlices.current[currentTimeIndex.current]) {
        setDataUint8(allTimeSlices.current[currentTimeIndex.current]);
        currentTimeIndex.current = (currentTimeIndex.current + 1) % 10;
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  let viewer = null;
  if (dataUint8 && dataUint8.length != 0 && dataCellSize.current.length != 0) {

    viewer = (
      <Vol3dViewer
        volumeDataUint8={dataUint8}
        volumeSize={dataShape.current}
        voxelSize={dataCellSize.current}
        transferFunctionTex={makeCloudTransferTex()}
        dtScale={0.1}
        finalGamma={6.0}
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
        {!!viewer ? viewer : 'LOADING DATA...'}
      </div>
    </div>);
}

export function makeCloudTransferTex() {

  const width = 256;
  const height = 1;
  const size = width * height;
  const data = new Uint8Array(4 * size);

  const rstart = 255;
  const rend = 50;
  const astart = 20;
  const aend = 255;
  const imid = 20;
  const amid = 40;

  for (let i = 0; i < width; i += 1) {
    let r = rstart + i * (rend - rstart) / (width - 1);
    let alpha = 0;
    if (i < imid) {
      alpha = astart + i * (amid - astart) / (imid - 1);
    }
    else {
      alpha = amid + (i - imid) * (aend - amid) / (width - imid);
    }

    data[4 * i] = r;
    data[4 * i + 1] = r;
    data[4 * i + 2] = r;
    data[4 * i + 3] = alpha;
  }
  // console.log(data);

  const transferTexture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  transferTexture.wrapS = THREE.ClampToEdgeWrapping;
  transferTexture.wrapT = THREE.ClampToEdgeWrapping;
  transferTexture.needsUpdate = true;

  return transferTexture;
}

export default CloudViewerUI;