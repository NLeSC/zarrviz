import { openArray, HTTPStore, create } from 'zarr';
import type { PersistenceMode } from 'zarr/types/types';

import { allTimeSlices } from "$lib/stores/allSlices.store";


// downloadZarrPoints
export async function fetchSlice({
  currentTimeIndex = 0,
  path = 'ql',
  mode = 'r' as PersistenceMode,
  dims = 4
}) {

  const params = new URLSearchParams(document.location.search);
  const datasetUrl = params.get("dataset") || 'http://localhost:5173/data/ql.zarr';
  console.log(datasetUrl)

  // Create an HTTPStore pointing to the base of your Zarr hierarchy
  const store = new HTTPStore(datasetUrl, {
    fetchOptions: { redirect: 'follow', mode: 'cors', credentials: 'include' }
  });
  const zarrdata = await openArray({ store, path, mode });

  const { data, strides, shape } = dims == 4 ? await zarrdata.getRaw([currentTimeIndex, null, null, null]) : await zarrdata.getRaw([currentTimeIndex, null, null]);

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
  console.log('🎹 downloaded ', currentTimeIndex);
  // console.log('🎹 downloaded ', get(allTimeSlices)[currentTimeIndex]);
  return { dataUint8: data, strides, shape, store };

}