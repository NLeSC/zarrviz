import { persisted } from 'svelte-persisted-store'
import { writable } from 'svelte/store';

export const showGrid = persisted('showGrid', true); // defatult 10. It can be more
export const cloudLayerSettings = persisted('cloudLayer', { enabled: true, opacity: 100 }); // 0 to 100
export const rainLayerSettings = persisted('rainLayer', { enabled: true, opacity: 100 }); // 0 to 100
export const temperatureLayerSettings = persisted('temperatureLayer', { enabled: true, opacity: 100 }); // 0 to 100

// 1 unit in the scene = 1000 meters (1 kilometer) in real life
// Meters of the bounding box of the data
// NOTE: Calculate the bounding box of the data and set it here if possible.
export const scaleFactor = persisted('scaleFactor', 33800);

export const scene = writable(null);
export const currentTimeIndex = writable(0);
export const currentStepIndex = writable(0);
export const numTimes = writable(0);
export const loading = writable(false);
export const loadTime = writable(0);
export const meshSize = writable([]);