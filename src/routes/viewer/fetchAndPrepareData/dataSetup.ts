import { createVolumetricRenderingBox } from "../sceneSetup/boxSetup";
import { MultiVariableStore } from "../stores/multiVariableStore";
import { RemoteZarrStore } from "../stores/remoteZarrStore";
import { loading, loadTime } from "../stores/viewer.store";

const bufferSlices = {'ql': 4, 'qr': 4, 'thetavmix': 8};

// Download first slice of the data and
// calculate the voxel and volume size.
// It runs only once.
export async function dataSetup(visibleData: string[], scene: THREE.Scene, store: MultiVariableStore): Promise<string[]> {

  const urlSearchParams = new URLSearchParams(document.location.search);
  const datasetUrl = urlSearchParams.get("dataset");
  const remoteStore = new RemoteZarrStore(datasetUrl);
  store.addRemoteStore(remoteStore);
  const coarseRemoteZarrStores = [remoteStore];
  if (datasetUrl.endsWith('-0.zarr')) {
    const urlsToCheck = [
      datasetUrl.replace('-0.zarr', '-1.zarr'),
      datasetUrl.replace('-0.zarr', '-2.zarr')
    ];
    for (const url of urlsToCheck) {
      try {
      const response = await fetch(url, { method: 'HEAD' });
      if (!response.ok) continue;
      coarseRemoteZarrStores.push(new RemoteZarrStore(url));
      store.addRemoteStore(coarseRemoteZarrStores[coarseRemoteZarrStores.length - 1]);
      } catch (e) {
        console.warn(`Could not access ${url}:`, e);
      }
    }
  }

  // open array, no need to opening it again for each variable

  loading.set(true);
  const startTime = performance.now();
  const foundData = [];
  for (const variable of visibleData) {
    try {
      const variableStores = [];
      let i = 0;
      for (const coarseRemoteZarrStore of coarseRemoteZarrStores) {
        const variableStore = await store.addVariableStore(variable,  bufferSlices[variable] || 4, ++i, coarseRemoteZarrStore);
        variableStores.push(variableStore);
      }
      foundData.push(variable);
      await createVolumetricRenderingBox({ scene, variable, variableStores });
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