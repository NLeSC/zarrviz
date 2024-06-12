// import { Queue } from "async-await-queue";
import { get } from "svelte/store";
import { fetchSlice, fetchRange } from "./fetchSlice";
import { downloadedTime } from "../stores/allSlices.store";

/**
 * Creates a new Queue instance with a concurrency of 1 and a timeout of 5000ms.
 */
export async function fetchAllSlices({ path = 'ql', dimensions = 4, timeRange = [1, 10] }) {

  /**
   * Creates a new Queue instance with a concurrency of 1 and a timeout of 5000ms.
   */
  // const q = new Queue(1, 5000);
  const timing = performance.now()
  const promises = [];

  console.log('📕 Downloading all slices');
  // Start loop at 1 because the first slice was already fetched at mounted
  for (let i = timeRange[0]; i < timeRange[1]; ++i) { // start with 1 because 0 was already fetched at mounted
    // const me = Symbol();
    // await q.wait(me, 10 - i);
    try {
      promises.push(fetchSlice({ path, currentTimeIndex: i, dimensions }));
    } catch (e) {
      console.error(e);
    } finally {
      // q.end(me);
    }
  }

  // TODO this wait for all promises to resolve, but we want to wait for the first one to resolve
  // and then start the next one
  await Promise.all(promises);
  downloadedTime.set(get(downloadedTime) + Math.round(performance.now() - timing))
  console.log('🎹 all data downladed in', get(downloadedTime), ' + ', Math.round(performance.now() - timing), 'ms');


  // return await q.flush();
}

export async function fetchAllSlicesAtOnce(visible_data, timeRange = [1, 10]) {
  const timing = performance.now()
  const promises = [];
  for (const variable of visible_data) {
    const dimensions = variable === 'thetavmix' ? 3 : 4;
    try {
      promises.push(fetchRange({ timeRange, path: variable, dimensions }));
    } catch (e) {
      console.error(e);
    } finally {
      // q.end(me);
    }
  }
  await Promise.all(promises);
  downloadedTime.set(get(downloadedTime) + Math.round(performance.now() - timing))
  console.log('🎹 all data downladed in', get(downloadedTime), ' + ', Math.round(performance.now() - timing), 'ms');
}


