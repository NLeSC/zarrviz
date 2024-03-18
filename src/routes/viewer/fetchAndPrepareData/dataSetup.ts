import {
  createVolumetricRenderingBox
} from "../sceneSetup/boxSetup";
import {
  getVoxelAndVolumeSize,
  getVoxelAndVolumeSize2D,
  totalSlices
} from "../stores/allSlices.store";
import { fetchAllSlices } from "./fetchAllSlices";
import { fetchSlice } from "./fetchSlice";
import { openArray, HTTPStore } from 'zarr';


export const zarrdata = []
// Download first slice of the data and
// calculate the voxel and volume size.
// It runs only once.
export async function dataSetup(visible_data, scene) {

  const urlSearchParams = new URLSearchParams(document.location.search);
  const datasetUrl = urlSearchParams.get("dataset") || 'http://localhost:5173/data/movie.zarr';

  // open array, no need to opening it again for each variable

  const store = new HTTPStore(datasetUrl, { fetchOptions: { redirect: 'follow', mode: 'no-cors', credentials: 'include' } });
  for (const variable of visible_data) {
    zarrdata[variable] = await openArray({ store, path: variable, mode: 'r' });
    const dimensions = variable === 'thetavmix' ? 3 : 4;
    const { dataUint8, shape } = await fetchSlice({ currentTimeIndex: 0, path: variable, dimensions });

    variable === 'thetavmix'
      ? await getVoxelAndVolumeSize2D(store, shape, variable)
      : await getVoxelAndVolumeSize(store, shape, variable);

    totalSlices.set(zarrdata[variable].length);
    await createVolumetricRenderingBox({ scene, variable, dataUint8 });
  }

  // Fetch all slices after shwing the first one
  for (const variable of visible_data) {
    const dimensions = variable === 'thetavmix' ? 3 : 4;
    fetchAllSlices({ path: variable, dimensions }); // todo run this in parallel
  }
}