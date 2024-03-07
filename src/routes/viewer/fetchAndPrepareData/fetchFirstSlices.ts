import {
  boxes,
  createPlaneRenderingBox,
  createVolumetricRenderingBox
} from "../sceneSetup/boxSetup";
import {
  getVoxelAndVolumeSize,
  getVoxelAndVolumeSize2D
} from "../stores/allSlices.store";
import { fetchAllSlices } from "./fetchAllSlices";
import { fetchSlice } from "./fetchSlice";

export async function fetchFirstSlices(visible_data, scene) {

  for (const variable of visible_data) {
    const dimensions = variable === 'thetavmix' ? 3 : 4;
    // Common operation for all variables
    // fetchAllSlices({ path: variable, dimensions }); // TODO: FETCH ALL SLICES ONCE I HAVE THE FIRST ONE

    // Conditional operations based on the variable value
    if (variable === 'thetavmix') {
      const {
        dataUint8: vdata,
        store: vstore,
        shape: vshape
      } = await fetchSlice({ currentTimeIndex: 0, path: variable, dimensions: 3 });

      // TODO MAKE NOOOOO SIDE EFECTS FUNCTION!!!!
      await getVoxelAndVolumeSize2D(vstore, vshape, variable);
      // boxes.thetavmixBox = createPlaneRenderingBox({ variable, dataUint8: vdata });
      // boxes.thetavmixBox = createVolumetricRenderingBox({ variable, dataUint8: vdata });
      boxes[variable] = await createVolumetricRenderingBox({
        scene,
        variable,
        dataUint8: vdata
      });

    }
    else {
      const {
        dataUint8: vdata,
        store: vstore,
        shape: vshape,
        coarseData: vCoarseData
      } = await fetchSlice({ currentTimeIndex: 0, path: variable });

      // TODO NOOOOO SIDE EFECTS FUNCTION!!!!
      await getVoxelAndVolumeSize(vstore, vshape, variable);

      boxes[variable] = await createVolumetricRenderingBox({
        scene,
        variable,
        dataUint8: vdata,
        dataCoarse: vCoarseData
      });
    }
  }
}