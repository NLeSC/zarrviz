import { createVolumetricRenderingBox } from "../sceneSetup/boxSetup";
import { addRemoteStore, addVariableStore } from "../stores/allSlices.store";
import { RemoteZarrStore } from "../stores/remoteZarrStore";
import { loading, loadTime } from "../stores/viewer.store";

const bufferSlices = {'ql': 6, 'qr': 4, 'thetavmix': 10};
const coarseningLevels = {'qr': 2};

// Download first slice of the data and
// calculate the voxel and volume size.
// It runs only once.
export async function dataSetup(visibleData, scene): Promise<string[]> {

  const urlSearchParams = new URLSearchParams(document.location.search);
  const datasetUrl = urlSearchParams.get("dataset") || 'http://localhost:5173/data/movie-0.zarr';
  addRemoteStore(new RemoteZarrStore(datasetUrl), 0);
  let coarseRemoteZarrStore = null;
  if (datasetUrl.endsWith('-0.zarr')) {
    coarseRemoteZarrStore = new RemoteZarrStore(datasetUrl.replace('-0.zarr', '-2.zarr'));
    addRemoteStore(coarseRemoteZarrStore, 2);
  }

  // open array, no need to opening it again for each variable

  loading.set(true);
  const startTime = performance.now();
  const foundData = [];
  for (const variable of visibleData) {
    try {
      await addVariableStore(variable,  bufferSlices[variable] || 4, 0);
      if (coarseningLevels[variable]) {
        await addVariableStore(variable, bufferSlices[variable] || 4, coarseningLevels[variable]);
      }
      foundData.push(variable);
      await createVolumetricRenderingBox({ scene, variable });
    }
    catch (e) {
      if(e.message.includes(`array not found at path ${variable}`)) {
        console.error(e.message);
        continue;
      }
      else {
        throw e;
      }
    }
  }
  const endTime = performance.now();
  loadTime.set(endTime - startTime);
  loading.set(false);
  return foundData;
}