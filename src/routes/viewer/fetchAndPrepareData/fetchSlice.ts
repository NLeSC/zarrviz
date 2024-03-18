
import { dataSlices } from "../stores/allSlices.store";
import { coarseData } from './coarseData';
import { zarrdata } from './dataSetup';

// downloadZarrPoints
export async function fetchSlice({
  currentTimeIndex = 0,
  path = 'ql',
  dimensions = 4,
}) {
  console.log('🚀 Downloading slice... ', currentTimeIndex + 1);

  // Create an HTTPStore pointing to the base of the Zarr hierarchy
  const { data, shape } = dimensions === 4
    ? await zarrdata[path].getRaw([currentTimeIndex, null, null, null])
    : await zarrdata[path].getRaw([currentTimeIndex, null, null]);


  let dataUint8 = null;
  if (path == 'qr') {
    // Coarse data to compress the ammount of data
    dataUint8 = coarseData(shape, data);
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
  return { dataUint8, shape };
}