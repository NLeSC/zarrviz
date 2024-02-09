// import { Queue } from "async-await-queue";
import { downloadedTime } from "$lib/components/allSlices.store";
import { get } from "svelte/store";
import { fetchSlice } from "./fetchSlice";

/**
 * Creates a new Queue instance with a concurrency of 1 and a timeout of 5000ms.
 */
export async function fetchAllSlices({ path = 'ql' , dims = 4}) {

  /**
   * Creates a new Queue instance with a concurrency of 1 and a timeout of 5000ms.
   */
  // const q = new Queue(1, 5000);
  const timing = performance.now()
  const promises = [];

  console.log('📕 Downloading all slices');
  for (let i = 1; i < 10; ++i) { // start with 1 because 0 was already fetched at mounted
    // const me = Symbol();
    // await q.wait(me, 10 - i);
    try {
      promises.push(fetchSlice({ path, currentTimeIndex: i, dims: dims }));
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
