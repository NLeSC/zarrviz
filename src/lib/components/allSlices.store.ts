import { getBoxSize } from "$lib/utils/Utils";
import { get, writable } from "svelte/store";
import * as THREE from "three";
import { openArray } from 'zarr';


export const allTimeSlices = writable([]);
export const currentTimeIndex = writable(0);

export const voxelSizes = writable({})
export const volumeSizes = writable({})
export const boxSizes = writable({})

export const downloadedTime = writable(0)


export async function getVoxelAndVolumeSize( store, shape, path ) {
  // if (currentTimeIndex === 0) {
  const zarrxvals = await openArray({ store, path: 'xt', mode: 'r' });
  const zarryvals = await openArray({ store, path: 'yt', mode: 'r' });
  const zarrzvals = await openArray({ store, path: 'z_' + path, mode: 'r' });
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

  voxelSizes.update((vs) => {
    vs[path] = [dx, dy, dz];
    return vs;
  });
  volumeSizes.update((vs) => {
    vs[path] = [shape[1], shape[2], shape[0]];
    return vs;
  });
  boxSizes.update((bs) => {
    const [bw, bh, bd] = getBoxSize(get(volumeSizes)[path], get(voxelSizes)[path]);
    bs[path] = new THREE.Vector3(bw, bh, bd);
    return bs;
  });

  console.log(`Voxel size ${get(voxelSizes)[path][0]}, ${get(voxelSizes)[path][1]}, ${get(voxelSizes)[path][2]}`);
  console.log('Box size', get(boxSizes)[path]);
  // return { voxelSize, volumeSize, boxSize };
}