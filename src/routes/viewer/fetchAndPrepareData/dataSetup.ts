import {
  boxes,
  // createPlaneRenderingBox,
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
    // Common operation for all variables
    // fetchAllSlices({ path: variable, dimensions }); // TODO: FETCH ALL SLICES ONCE I HAVE THE FIRST ONE

    // Conditional operations based on the variable value
    if (variable === 'thetavmix') {
      const {
        dataUint8,
        store,
        shape
      } = await fetchSlice({ currentTimeIndex: 0, path: variable, dimensions });

      await getVoxelAndVolumeSize2D(store, shape, variable);
      // boxes.thetavmixBox = createPlaneRenderingBox({ variable, dataUint8: vdata });
      // boxes.thetavmixBox = createVolumetricRenderingBox({ variable, dataUint8: vdata });
      await createVolumetricRenderingBox({
        scene,
        variable,
        dataUint8
      });
    }
    else {
      const {
        dataUint8,
        store,
        shape,
      } = await fetchSlice({ currentTimeIndex: 0, path: variable, dimensions });

      await getVoxelAndVolumeSize(store, shape, variable);

      await createVolumetricRenderingBox({
        scene,
        variable,
        dataUint8,
      });
    }
  }
}