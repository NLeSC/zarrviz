import { openArray, HTTPStore, create } from 'zarr';
import type { PersistenceMode } from 'zarr/types/types';

import { allTimeSlices } from "../../lib/components/allSlices.store";


// downloadZarrPoints
export async function fetchSlice({
  currentTimeIndex = 0,
  path = 'ql',
  mode = 'r' as PersistenceMode
}) {

  const params = new URLSearchParams(document.location.search);
  const datasetUrl = params.get("dataset") || 'http://localhost:5173/data/ql.zarr';
  console.log(datasetUrl)

  // Create an HTTPStore pointing to the base of your Zarr hierarchy
  const store = new HTTPStore(datasetUrl, {
    fetchOptions: { redirect: 'follow', mode: 'no-cors', credentials: 'include' }
  });
  const zarrdata = await openArray({ store, path, mode });

  const { data, strides, shape } = await zarrdata.getRaw([currentTimeIndex, null, null, null]);

  // allSlices.set(data);
  // Update the time slices store
  allTimeSlices.update((timeSlices) => {
    timeSlices[currentTimeIndex] = data;
    return timeSlices;
  });
  console.log('🎹 downloaded ', currentTimeIndex);
  // console.log('🎹 downloaded ', get(allTimeSlices)[currentTimeIndex]);
  return { dataUint8: data, strides, shape, store };

}