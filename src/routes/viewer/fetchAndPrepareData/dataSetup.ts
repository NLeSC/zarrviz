import {
  createVolumetricRenderingBox
} from "../sceneSetup/boxSetup";
import {
  getVoxelAndVolumeSize,
  getVoxelAndVolumeSize2D
} from "../stores/allSlices.store";
import { fetchAllSlices } from "./fetchAllSlices";
import { fetchSlice } from "./fetchSlice";


// Download first slice of the data and
// calculate the voxel and volume size.
// It runs only once.
export async function dataSetup(visible_data, scene) {

  for (const variable of visible_data) {
    const dimensions = variable === 'thetavmix' ? 3 : 4;
    const { dataUint8, store, shape } = await fetchSlice({ currentTimeIndex: 0, path: variable, dimensions });
    variable === 'thetavmix'
      ? await getVoxelAndVolumeSize2D(store, shape, variable)
      : await getVoxelAndVolumeSize(store, shape, variable);

    await createVolumetricRenderingBox({ scene, variable, dataUint8 });
  }

  // Fetch all slices after shwing the first one
  for (const variable of visible_data) {
    const dimensions = variable === 'thetavmix' ? 3 : 4;
    fetchAllSlices({ path: variable, dimensions });
  }

}