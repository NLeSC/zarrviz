import { persisted } from 'svelte-persisted-store'
import { writable } from 'svelte/store';

export const slicesToRender = persisted('slicesToRender', 10); // defatult 10. It can be more
export const showGrid = persisted('showGrid', true); // defatult 10. It can be more

export const scene = writable(null);

// 1 unit in the scene = 1000 meters (1 kilometer) in real life
// Meters of the bounding box of the data
export const scaleFactor = persisted('scaleFactor', 33800); // TODO: calculate this value from the data

export const cloudLayer = persisted('cloudLayer', { enabled: true, opacity: 100 }); // 0 to 100
export const rainLayer = persisted('rainLayer', { enabled: true, opacity: 100 }); // 0 to 100
export const temperatureLayer = persisted('temperatureLayer', { enabled: true, opacity: 100 }); // 0 to 100
