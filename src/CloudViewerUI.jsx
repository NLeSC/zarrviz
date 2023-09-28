import Vol3dViewer from './Vol3dViewer';
import * as THREE from 'three';
import { openArray, HTTPStore } from 'zarr'
import React, { useEffect } from 'react';
import './CloudViewerUI.css';
import { Queue } from 'async-await-queue';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Slider from '@mui/material/Slider';

function CloudViewerUI() {
    const [zarrUrl, setZarrUrl] = React.useState('https://surfdrive.surf.nl/files/remote.php/nonshib-webdav/Ruisdael-viz/ql.zarr');
    //const [zarrUrl, setZarrUrl] = React.useState('http://0.0.0.0:8000/ql.zarr');
    const [dataUint8, setDataUint8] = React.useState(null);
    const dataShape = React.useRef([]);
    const dataCellSize = React.useRef([]);
    const allTimeSlices = React.useRef(new Array(10));
    const currentTimeIndex = React.useRef(0);
    const [finalGamma, setFinalGamma] = React.useState(Vol3dViewer.defaultProps.finalGamma);
    const [ambientFactor, setAmbientFactor] = React.useState(Vol3dViewer.defaultProps.ambientFactor);
    const [solarFactor, setSolarFactor] = React.useState(Vol3dViewer.defaultProps.solarFactor);
    const [rayMarchStepSize, setRayMarchStepSize] = React.useState(Vol3dViewer.defaultProps.dtScale);
    const [noiseFreq1, setNoiseFreq1] = React.useState(Vol3dViewer.defaultProps.noiseFreq1);
    const [noiseFreq2, setNoiseFreq2] = React.useState(Vol3dViewer.defaultProps.noiseFreq2);
    const [noiseScale1, setNoiseScale1] = React.useState(Vol3dViewer.defaultProps.noiseScale1);
    const [noiseScale2, setNoiseScale2] = React.useState(Vol3dViewer.defaultProps.noiseScale2);

// Not `React.useState` so changes do not cause React to re-render.
    const allowThrottledEvent = React.useRef(false);

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
          dataCellSize.current = [dx, dy, dz];
          dataShape.current = [shape[1], shape[2], shape[0]];
        }
    }

    const fetchAllData = async (url, variable) => {
      console.log('here we go downloading data...')
      const q = new Queue(1, 10);
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

    const onFinalGammaChange = (event, newValue) => {
      if (allowThrottledEvent.current) {
         allowThrottledEvent.current = false;
         setFinalGamma(newValue);
       }
    }

    const onAmbientFactorChange = (event, newValue) => {
      if (allowThrottledEvent.current) {
         allowThrottledEvent.current = false;
         setAmbientFactor(newValue);
       }
    }

    const onSolarFactorChange = (event, newValue) => {
      if (allowThrottledEvent.current) {
         allowThrottledEvent.current = false;
         setSolarFactor(newValue);
       }
    }

    const onRayMarchStepSizeChange = (event, newValue) => {
      if (allowThrottledEvent.current) {
         allowThrottledEvent.current = false;
         setRayMarchStepSize(newValue);
       }
    }

    const onNoiseFreq1Change = (event, newValue) => {
      if (allowThrottledEvent.current) {
        allowThrottledEvent.current = false;
        setNoiseFreq1(newValue);
      }
    }

    const onNoiseScale1Change = (event, newValue) => {
      if (allowThrottledEvent.current) {
        allowThrottledEvent.current = false;
        setNoiseScale1(newValue);
      }
    }

    const onNoiseFreq2Change = (event, newValue) => {
      if (allowThrottledEvent.current) {
        allowThrottledEvent.current = false;
        setNoiseFreq2(newValue);
      }
    }

    const onNoiseScale2Change = (event, newValue) => {
      if (allowThrottledEvent.current) {
        allowThrottledEvent.current = false;
        setNoiseScale2(newValue);
      }
    }

    const onWebGLRender = React.useCallback(() => {
      // Events generated by the spinners on the final-gamma control (and others) need to
      // be throttled, to avoid having a backlog of events that continue to be processed
      // after the user stops presssing the spinner.  Standard throttling techniques based
      // on time do not work well, but it does work to throttle so that no new event is
      // processed until the WebGL rendering triggered by the last event has been processed.
      allowThrottledEvent.current = true;
    }, []);
     
    useEffect(() => {
      fetchAllData(zarrUrl, 'ql');
    }, [zarrUrl]);

    useEffect(() => {
      const interval =  setInterval(() => {
        if (allTimeSlices.current[currentTimeIndex.current]){
          setDataUint8(allTimeSlices.current[currentTimeIndex.current]);
          currentTimeIndex.current = (currentTimeIndex.current + 1) % 10;
        }
        return () => clearInterval(interval);
      }, 10000);
      }, []);

    function valuetext(value){
      return `${value}`;
    }

    let viewer = null;
    let controls = null;
    if (dataUint8 && dataUint8.length !== 0 && dataCellSize.current.length !== 0) {
      viewer = (
          <Vol3dViewer
            volumeDataUint8={dataUint8}
            volumeSize={dataShape.current}
            voxelSize={dataCellSize.current}
            transferFunctionTex={makeCloudTransferTex()}
            dtScale={rayMarchStepSize}
            finalGamma={finalGamma}
            noiseFreq1={noiseFreq1}
            noiseScale1={noiseScale1}
            noiseFreq2={noiseFreq2}
            noiseScale2={noiseScale2}
            ambientFactor={ambientFactor}
            solarFactor={solarFactor}
            onWebGLRender={onWebGLRender}
          />
      );
      controls = (
        <div className="Controls">
          <Box sx={{ width: 100 }} margin={1.5}>
          Step size&nbsp;
            <Stack spacing={2} direction="row" sx={{ mb: 1 }} alignItems="center">
                <Slider aria-label="Ray marching step" 
                        value={rayMarchStepSize} 
                        min={0.01} 
                        max={1.0}
                        step={0.01} 
                        onChange={onRayMarchStepSizeChange}
                        valueLabelDisplay="auto"
                        getAriaValueText={valuetext}
                />
            </Stack>
          </Box>
          <Box sx={{ width: 100 }} margin={1.5}>
          Ambient light&nbsp;
            <Stack spacing={2} direction="row" sx={{ mb: 1 }} alignItems="center">
                <Slider aria-label="Ambient light factor" 
                        value={ambientFactor} 
                        min={0.0} 
                        max={0.0001}
                        step={0.000001} 
                        onChange={onAmbientFactorChange}
                        valueLabelDisplay="auto"
                        getAriaValueText={valuetext}
                />
            </Stack>
          </Box>
          <Box sx={{ width: 100 }} margin={1.5}>
          Solar light&nbsp;
            <Stack spacing={2} direction="row" sx={{ mb: 1 }} alignItems="center">
                <Slider aria-label="Solar light factor" 
                        value={solarFactor} 
                        min={0.0} 
                        max={0.01}
                        step={0.0001}
                        onChange={onSolarFactorChange}
                        valueLabelDisplay="auto"
                        getAriaValueText={valuetext}
                />
            </Stack>
          </Box>
          <Box sx={{ width: 100 }} margin={1.5}>
          Final gamma&nbsp;
            <Stack spacing={2} direction="row" sx={{ mb: 1 }} alignItems="center">
                <Slider aria-label="Total image gamma" 
                        value={finalGamma} 
                        min={0.0} 
                        max={10.0}
                        step={0.1} 
                        onChange={onFinalGammaChange}
                        valueLabelDisplay="auto"
                        getAriaValueText={valuetext}
                />
            </Stack>
          </Box>
          <Box sx={{ width: 100 }} margin={1.5}>
          Noise 1st freq&nbsp;
            <Stack spacing={2} direction="row" sx={{ mb: 1 }} alignItems="center">
                <Slider aria-label="First noise frequency" 
                        value={noiseFreq1} 
                        min={1.0} 
                        max={50.0}
                        step={0.5} 
                        onChange={onNoiseFreq1Change}
                        valueLabelDisplay="auto"
                        getAriaValueText={valuetext}
                />
            </Stack>
          </Box>
          <Box sx={{ width: 100 }} margin={1.5}>
          Noise 1st scale&nbsp;
            <Stack spacing={2} direction="row" sx={{ mb: 1 }} alignItems="center">
                <Slider aria-label="First noise amplitude" 
                        value={noiseScale1} 
                        min={0} 
                        max={0.01}
                        step={0.0001} 
                        onChange={onNoiseScale1Change}
                        valueLabelDisplay="auto"
                        getAriaValueText={valuetext}
                />
            </Stack>
          </Box>
          <Box sx={{ width: 100 }} margin={1.5}>
          Noise 2nd freq&nbsp;
            <Stack spacing={2} direction="row" sx={{ mb: 1 }} alignItems="center">
                <Slider aria-label="Second noise frequency" 
                        value={noiseFreq2} 
                        min={100.0} 
                        max={500.0}
                        step={1.0} 
                        onChange={onNoiseFreq2Change}
                        valueLabelDisplay="auto"
                        getAriaValueText={valuetext}
                />
            </Stack>
          </Box>
          <Box sx={{ width: 100 }} margin={1.5}>
          Noise 2nd scale&nbsp;
            <Stack spacing={2} direction="row" sx={{ mb: 1 }} alignItems="center">
                <Slider aria-label="Second noise amplitude" 
                        value={noiseScale2} 
                        min={0} 
                        max={0.001}
                        step={0.00001} 
                        onChange={onNoiseScale2Change}
                        valueLabelDisplay="auto"
                        getAriaValueText={valuetext}
                />
            </Stack>
          </Box>
          </div>
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
        {controls}
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
    if (i < imid){
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
  console.log(data);

  const transferTexture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  transferTexture.wrapS = THREE.ClampToEdgeWrapping;
  transferTexture.wrapT = THREE.ClampToEdgeWrapping;
  transferTexture.needsUpdate = true;

  return transferTexture;
}

export default CloudViewerUI;