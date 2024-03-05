import { createPlaneRenderingBox, createVolumetricRenderingBox } from "../sceneSetup/boxSetup";
import { getVoxelAndVolumeSize, getVoxelAndVolumeSize2D } from "../stores/allSlices.store";
import { fetchAllSlices } from "./fetchAllSlices";
import { fetchSlice } from "./fetchSlice";

export async function fetchFirstSlices(visible_data, scene, boxes) {
  for (const variable of visible_data) {
    const dimensions = variable === 'thetavmix' ? 3 : 4;
    // Common operation for all variables
    fetchAllSlices({ path: variable, dimensions });

    // Conditional operations based on the variable value
    if (variable === 'thetavmix') {
      const {
        dataUint8: vdata,
        store: vstore,
        shape: vshape
      } = await fetchSlice({ currentTimeIndex: 0, path: variable, dimensions: 3 });

      await getVoxelAndVolumeSize2D(vstore, vshape, variable);

      boxes.thetavmixBox = createPlaneRenderingBox({ variable, dataUint8: vdata });
    }
    else {
      const {
        dataUint8: vdata,
        store: vstore,
        shape: vshape,
        coarseData: vCoarseData
      } = await fetchSlice({ currentTimeIndex: 0, path: variable });
      await getVoxelAndVolumeSize(vstore, vshape, variable);
      await createVolumetricRenderingBox({
        scene,
        boxes,
        variable,
        dataUint8: vdata,
        dataCoarse: vCoarseData
      });
    }
  }
}