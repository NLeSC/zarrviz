import { openArray, HTTPStore, create } from 'zarr';
import type { PersistenceMode } from 'zarr/types/types';

import { allTimeSlices } from "../../lib/components/allSlices.store";


// downloadZarrPoints
export async function fetchSlice({
  currentTimeIndex = 0,
  url = 'http://localhost:5173/data/ql.zarr',
  path = 'ql',
  mode = 'r' as PersistenceMode
}) {
  // Create an HTTPStore pointing to the base of your Zarr hierarchy
  const store = new HTTPStore(url, {
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