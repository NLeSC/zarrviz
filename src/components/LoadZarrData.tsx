import { openArray, HTTPStore, slice } from 'zarr'
import React, { useEffect, useState, useRef } from 'react';
import { Queue } from 'async-await-queue';

import { makeCloudTransferTex } from '../utils/makeCloudTransferTex';
import Vol3dViewer from './Vol3dViewer';


export default function LoadZarrData() {
  // const [zarrUrl, setZarrUrl] = useState('https://surfdrive.surf.nl/files/remote.php/nonshib-webdav/Ruisdael-viz/ql.zarr');
  const [zarrUrl, setZarrUrl] = useState('http://localhost:3000/data/ql.zarr');
  const [dataUint8, setDataUint8] = useState(null);
  const dataShape = useRef([]);
  const dataCellSize = useRef([]);
  /**
   * Ref to an array containing all time slices.
   */
  const allTimeSlices = useRef(new Array(10));  // 10 is the number of time slices TODO: make this dynamic
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


  // On mount equivalent
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
    }, 3000);
    return () => clearInterval(interval);  // run on unmount
  }, []); //
  // setDataUint8(allTimeSlices.current[currentTimeIndex.current]);

  // if (allTimeSlices.current[currentTimeIndex.current]) {
  //   setDataUint8(allTimeSlices.current[currentTimeIndex.current]);
  //   currentTimeIndex.current = (currentTimeIndex.current + 1) % 10;   // 10 is the number of time slices, go to 0 after 9 TODO: make this dynamic
  // }

  return (
    <div className=" flex">

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