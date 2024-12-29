import { createVolumetricRenderingBox } from "../sceneSetup/boxSetup";
import { setRemoteStore, addVariableStore } from "../stores/allSlices.store";
import { RemoteZarrStore } from "../stores/remoteZarrStore";
import { loading, loadTime } from "../stores/viewer.store";

const bufferSlices = {'ql': 4, 'qr': 4, 'thetavmix': 32};
const coarseningFactors = {'qr': [1, 8, 8, 8]};

export const zarrdata = []

// Download first slice of the data and
// calculate the voxel and volume size.
// It runs only once.
export async function dataSetup(visibleData, scene) {

  const urlSearchParams = new URLSearchParams(document.location.search);
  const datasetUrl = urlSearchParams.get("dataset") || 'http://localhost:5173/data/movie.zarr';
  setRemoteStore(new RemoteZarrStore(datasetUrl));

  // open array, no need to opening it again for each variable

  loading.set(true);
  const startTime = performance.now();
  for (const variable of visibleData) {
    if (variable in coarseningFactors) {
      await addVariableStore(variable, bufferSlices[variable] || 4, coarseningFactors[variable], "max");
    }
    else {
      await addVariableStore(variable, bufferSlices[variable] || 4, null, null);
    }
    await createVolumetricRenderingBox({ scene, variable });
  }
  const endTime = performance.now();
  loadTime.set(endTime - startTime);
  loading.set(false);
}