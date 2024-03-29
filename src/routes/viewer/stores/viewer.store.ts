import { persisted } from 'svelte-persisted-store'
import { writable } from 'svelte/store';

export const slicesToRender = persisted('slicesToRender', 10); // defatult 10. It can be more
export const showGrid = persisted('showGrid', true); // defatult 10. It can be more

export const scene = writable(null);


export const cloudLayerSettings = persisted('cloudLayer', { enabled: true, opacity: 100 }); // 0 to 100
export const rainLayerSettings = persisted('rainLayer', { enabled: true, opacity: 100 }); // 0 to 100
export const temperatureLayerSettings = persisted('temperatureLayer', { enabled: true, opacity: 100 }); // 0 to 100


// 1 unit in the scene = 1000 meters (1 kilometer) in real life
// Meters of the bounding box of the data
// NOTE: Calculate the bounding box of the data and set it here if possible.
export const scaleFactor = persisted('scaleFactor', 33800);
