import { openArray, HTTPStore, create } from 'zarr';
import type { PersistenceMode } from 'zarr/types/types';

import { allTimeSlices } from "../stores/allSlices.store";

// downloadZarrPoints
export async function fetchSlice({
  currentTimeIndex = 0,
  path = 'ql',
  mode = 'r' as PersistenceMode,
  dimensions = 4
}) {
  console.log('🚀 Downloading slice... ', currentTimeIndex + 1);

  const params = new URLSearchParams(document.location.search);
  const datasetUrl = params.get("dataset") || 'http://localhost:5173/data/ql.zarr';

  // Create an HTTPStore pointing to the base of your Zarr hierarchy
  const store = new HTTPStore(datasetUrl, {
    fetchOptions: { redirect: 'follow', mode: 'cors', credentials: 'include' }
  });
  const zarrdata = await openArray({ store, path, mode });

  const { data, strides, shape } = dimensions == 4 ? await zarrdata.getRaw([currentTimeIndex, null, null, null]) : await zarrdata.getRaw([currentTimeIndex, null, null]);

  let coarseData = null;
  if (path == 'qr') {
    // console.log("Coarse graining...");
    coarseData = new Uint8Array(shape[0] * shape[1] * shape[2] / (8 * 8 * 8));
    for (let i = 0; i < shape[0] / 8; i++) {
      for (let j = 0; j < shape[1] / 8; j++) {
        for (let k = 0; k < shape[2] / 8; k++) {
          let x = 0;
          for (let l = 0; l < 8; l++) {
            for (let m = 0; m < 8; m++) {
              for (let n = 0; n < 8; n++) {
                const index = (k * 8 + n) + (j * 8 + m) * shape[2] + (l * 8 + i) * shape[2] * shape[1];
                x = Math.max(x, data[index])
              }
            }
          }
          const index2 = k + j * shape[2] / 8 + i * (shape[2] / 8) * (shape[1] / 8);
          coarseData[index2] = x
        }
      }
    }
    // console.log("...Done");
  }

  // allSlices.set(data);
  // Update the time slices store
  allTimeSlices.update((timeSlices) => {
    if (timeSlices[currentTimeIndex]) {
      timeSlices[currentTimeIndex][path] = data;
    }
    else {
      timeSlices[currentTimeIndex] = {};
      timeSlices[currentTimeIndex][path] = data;
    }
    return timeSlices;
  });
  console.log('🎹 downloaded ', currentTimeIndex + 1);
  // console.log('🎹 downloaded ', get(allTimeSlices)[currentTimeIndex]);
  return { dataUint8: data, shape, store, coarseData };
}