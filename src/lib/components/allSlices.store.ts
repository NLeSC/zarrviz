import { getBoxSize } from "$lib/utils/Utils";
import { get, writable } from "svelte/store";
import * as THREE from "three";
import { openArray } from 'zarr';


export const allTimeSlices = writable([]);
export const currentTimeIndex = writable(0);

export const voxelSize = writable()
export const volumeSize = writable()
export const boxSize = writable()

export const downloadedTime = writable(0)


export async function getVoxelAndVolumeSize({ store, shape, path, mode }) {
  // if (currentTimeIndex === 0) {
  const zarrxvals = await openArray({ store, path: 'xt', mode: 'r' });
  const zarryvals = await openArray({ store, path: 'yt', mode: 'r' });
  const zarrzvals = await openArray({ store, path: 'zt', mode: 'r' });
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
  // console.log('I calculated ', dx, dy, dz);
  // }

  voxelSize.set([dx, dy, dz]); // [1536, 1536, 123]
  volumeSize.set([shape[1], shape[2], shape[0]]); // [100, 100, 37.46699284324961]

  const [boxWidth, boxHeight, boxDepth] = getBoxSize(get(volumeSize), get(voxelSize));
  boxSize.set(new THREE.Vector3(boxWidth, boxHeight, boxDepth));

  console.log(`Voxel size ${get(voxelSize)[0]}, ${get(voxelSize)[1]}, ${get(voxelSize)[2]}`);
  console.log('Box size', get(boxSize));
  // return { voxelSize, volumeSize, boxSize };
}