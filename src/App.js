import { ImprovedNoise } from 'https://unpkg.com/three/examples/jsm/math/ImprovedNoise.js';
import { Vol3dViewer } from '@janelia/web-vol-viewer';
import './App.css';
import * as THREE from 'three';
import { openArray, HTTPStore } from 'zarr'
import React, { useState, useEffect, useRef } from 'react';
import CloudViewerUI from './CloudViewerUI.jsx';


function App() {
  return (
    <div className="App">
      <CloudViewerUI />
    </div>
  );
}

export default App;
