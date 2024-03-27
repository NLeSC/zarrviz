import { openArray, HTTPStore } from 'zarr';
import type { PersistenceMode } from 'zarr/types/types';

import { dataSlices } from "../stores/allSlices.store";
//import { coarseData } from './coarseData';

// downloadZarrPoints
export async function fetchSlice({
  currentTimeIndex = 0,
  path = 'ql',
  mode = 'r' as PersistenceMode,
  dimensions = 4
}) {
  console.log('🚀 Downloading slice... ', currentTimeIndex + 1);

  const urlSearchParams = new URLSearchParams(document.location.search);
  const datasetUrl = urlSearchParams.get("dataset") || 'http://localhost:5173/data/movie.zarr';

  // Create an HTTPStore pointing to the base of your Zarr hierarchy
  const store = new HTTPStore(datasetUrl, { fetchOptions: { redirect: 'follow', mode: 'no-cors', credentials: 'include' } });
  const zarrdata = await openArray({ store, path, mode });
  const { data, shape } = dimensions === 4
    ? await zarrdata.getRaw([currentTimeIndex, null, null, null])
    : await zarrdata.getRaw([currentTimeIndex, null, null]);


  let dataUint8 = null;
  if (path == 'qr') {
    // Coarse data to compress the ammount of data
//    dataUint8 = coarseData(shape, data);
    dataUint8 = data;
  }
  else {
    dataUint8 = data;
  }

  // allSlices.set(data);
  // Update the time slices store
  dataSlices.update((timeSlices) => {
    if (timeSlices[currentTimeIndex]) {
      timeSlices[currentTimeIndex][path] = dataUint8;
    }
    else {
      timeSlices[currentTimeIndex] = {};
      timeSlices[currentTimeIndex][path] = dataUint8;
    }
    return timeSlices;
  });
  // console.log('🎹 downloaded ', currentTimeIndex + 1);
  // console.log('🎹 downloaded ', get(allTimeSlices)[currentTimeIndex]);
  return { dataUint8, shape, store };
}