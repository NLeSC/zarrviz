import {
  createVolumetricRenderingBox
} from "../sceneSetup/boxSetup";
import {
  getVoxelAndVolumeSize,
  getVoxelAndVolumeSize2D,
  totalSlices,
  coarseDataSlices
} from "../stores/allSlices.store";
import { fetchAllSlices, fetchAllSlicesAtOnce } from "./fetchAllSlices";
import { fetchSlice } from "./fetchSlice";
import { openArray, HTTPStore } from 'zarr';
import { get } from "svelte/store";
import { slicesToRender } from "../stores/viewer.store";
import { coarseData } from "./coarseData";


export const zarrdata = []
// Download first slice of the data and
// calculate the voxel and volume size.
// It runs only once.
export async function dataSetup(visible_data, scene) {

  const urlSearchParams = new URLSearchParams(document.location.search);
  const datasetUrl = urlSearchParams.get("dataset") || 'http://localhost:5173/data/movie.zarr';

  // open array, no need to opening it again for each variable

  const store = new HTTPStore(datasetUrl, { fetchOptions: { redirect: 'follow', mode: 'cors', credentials: 'include' } });
  for (const variable of visible_data) {
    zarrdata[variable] = await openArray({ store, path: variable, mode: 'r' });
    const dimensions = variable === 'thetavmix' ? 3 : 4;
    const { dataUint8, shape } = await fetchSlice({ currentTimeIndex: 0, path: variable, dimensions });
    let coarseSlice = null;

    // Generate coarse data for volumetric variables (both rain and clouds)
    if (variable == 'qr' || variable == 'ql'){
      coarseSlice = coarseData(dataUint8, shape);
      coarseDataSlices.update((timeSlices) => {
        if(timeSlices[0]){
          timeSlices[0][variable] = coarseSlice;
        }
        else{
          timeSlices[0] = {variable: coarseSlice};
        }
        return timeSlices
      })
    }

    variable === 'thetavmix'
      ? await getVoxelAndVolumeSize2D(store, shape, variable)
      : await getVoxelAndVolumeSize(store, shape, variable);

    totalSlices.set(zarrdata[variable].length);
    await createVolumetricRenderingBox({ scene, variable, dataUint8, coarseData: coarseSlice });
  }

  // Fetch all slices after shwing the first one
  //fetchAllData(visible_data, [1, get(slicesToRender)]);
  fetchAllSlicesAtOnce(visible_data, [1, Math.floor(get(slicesToRender))]);
}

function fetchAllData(visible_data, timeRange) {
  for (const variable of visible_data) {
    const dimensions = variable === 'thetavmix' ? 3 : 4;
    fetchAllSlices({ path: variable, dimensions, timeRange });
  }
}

