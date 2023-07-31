import {ImprovedNoise} from 'https://unpkg.com/three/examples/jsm/math/ImprovedNoise.js';
import { Vol3dViewer } from '@janelia/web-vol-viewer';
import logo from './logo.svg';
import './App.css';
import * as THREE from 'three';

function App() {
  const size = 1024;
  const size_z = 192;
  const data = new Uint8Array(size * size * size_z);
  let i = 0;
  let z_fac = 1;
  const scale = 0.1;
  const perlin = new ImprovedNoise();
  const vector = new THREE.Vector3();

  for (let z = 0; z < size_z; z++) {

    z_fac = 80. / (1 + 10 * (z - 0.5 * size_z)**2);
    for (let y = 0; y < size; y++) {

      for (let x = 0; x < size; x++) {

        data[i] = (0 + z_fac * perlin.noise(x * scale, y * scale, z * scale * 8) + z_fac * perlin.noise(x * scale / 4, y * scale / 4, z * scale));
        i++;

      }
    }
  }
  console.log("Data is loaded");
  let middle = (
    <div className='App'>
    <Vol3dViewer
      volumeDataUint8={data}
      volumeSize={[size, size, size_z]}
      voxelSize={[1, 1, 1]}
      transferFunctionTex={makeFluoTransferTex(0, 200, 0.5, 255, '#ff00ff')}
    />
    </div>
  )
  return (
    <div className="BasicUI">
      <div
        className="Middle"

        tabIndex={0}
//        onKeyPress={onKeyPress}
        role='link'>
        {middle}
      </div>
    </div>)

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to refresh.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export function makeFluoTransferTex(alpha0, peak, dataGamma, alpha1, colorStr)
{
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
    data[4 * i]     = color.r * extraAlpha;
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

export default App;
