
import { dataSlices, coarseDataSlices } from "../stores/allSlices.store";
import { zarrdata } from './dataSetup';
import { slice } from 'zarr';
import { coarseData } from './coarseData';

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


  const dataUint8 = data;

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

export async function fetchRange({
  timeRange = [0, 10],
  path = 'ql',
  dimensions = 4,
}) {
  console.log('🚀 Downloading slices for ', path, ': ', timeRange[0], ' to ', timeRange[1], '...');

  let dataUint8 = null;
  let fullShape = null;

  // Update the time slices store
  const chunkSize = 8;
  const coarsening = (path == 'qr' || path == 'ql'); // Enable coarsening for both rain and cloud data

  for (let i = timeRange[0]; i < timeRange[1]; i += chunkSize) {
    const end = Math.min(i + chunkSize, timeRange[1]);
    const { data, shape } = dimensions === 4
    ? await zarrdata[path].getRaw([slice(timeRange[0], end + 1), null, null, null])
    : await zarrdata[path].getRaw([slice(timeRange[0], end + 1), null, null]);
    dataUint8 = data;
    const gridSize = dimensions === 4 ? shape[1] * shape[2] * shape[3] : shape[1] * shape[2];
    const gridShape = dimensions === 4 ? [shape[1], shape[2], shape[3]] : [shape[1], shape[2]];
    fullShape = [timeRange[1] - timeRange[0] + 1].concat(gridShape);
  
    const chunk = dataUint8.subarray(i * gridSize, end * gridSize);
    dataSlices.update((timeSlices) => {
      for (let j = i; j < end; j++) {
        if (timeSlices[j]) {
          timeSlices[j][path] = chunk.subarray((j - i) * gridSize, (j - i + 1) * gridSize);
        } else {
          timeSlices[j] = {};
          timeSlices[j][path] = chunk.subarray((j - i) * gridSize, (j - i + 1) * gridSize);
        }
      }
      return timeSlices;
    });
    if (coarsening) {
      coarseDataSlices.update((timeSlices) => {
        for (let j = i; j < end; j++) {
          if (timeSlices[j]) {
            timeSlices[j][path] = coarseData(chunk.subarray((j - i) * gridSize, (j - i + 1) * gridSize), gridShape);
          } else {
            timeSlices[j] = {};
            timeSlices[j][path] = coarseData(chunk.subarray((j - i) * gridSize, (j - i + 1) * gridSize), gridShape);
          }
        }
        return timeSlices;
      });
    }
  }
  return { dataUint8, fullShape };
}
