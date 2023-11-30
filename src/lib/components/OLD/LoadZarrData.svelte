<script lang="ts">
	import { openArray, HTTPStore, slice } from 'zarr';
	import { Queue } from 'async-await-queue';
	import { makeCloudTransferTex } from '$lib/utils/makeCloudTransferTex';
	import Vol3dViewer from './3DVolumetric/Volumetric3DViewer.svelte';
	import { onDestroy, onMount } from 'svelte';

	let zarrUrl = 'http://localhost:5173/data/ql.zarr';

	// Array of 8-bit unsigned integers. It is often used to represent binary data,
	// such as image data or network packets. It provides a way to work with
	// binary data in a more efficient and structured way than using a regular
	// JavaScript array.
	let dataUint8: any = undefined;

	let allTimeSlices: Uint8Array[] = [];
	let dataShape = [];
	let dataCellSize = [];

	// This code block will run whenever allTimeSlices changes value
	$: {
		console.log('🤷‍♀️ allTimeSlices', allTimeSlices.length);

		// dataUint8 = allTimeSlices[currentTimeIndex] || undefined;
		console.log('🔥', !!dataUint8);
	}
	let currentTimeIndex = 0;
	let interval: number | undefined;

	const fetchData = async (url: string, path: string, timeIndex: number) => {
		if (allTimeSlices[timeIndex]) return;

		const fetchOptions = { redirect: 'follow', mode: 'no-cors', credentials: 'include' };
		const store = new HTTPStore(url, { fetchOptions });
		const zarrdata = await openArray({ store, path, mode: 'r' });
		const { data, shape: currentShape } = await zarrdata.getRaw([timeIndex, null, null, null]);

		allTimeSlices[timeIndex] = data;
		allTimeSlices = [...allTimeSlices]; // After updating an element, reassign the whole array

		//
		// Set the parameters of the volumetric data like cell size and shape
		//
		if (timeIndex === 0) {
			const [xvals, yvals, zvals] = await Promise.all(
				['xt', 'yt', 'zt'].map((p) =>
					openArray({ store, path: p, mode: 'r' }).then((arr) => arr.getRaw([null]))
				)
			);
			const dx = xvals.data[1] - xvals.data[0];
			const dy = yvals.data[1] - yvals.data[0];
			const dz =
				zvals.data.slice(1).reduce((acc, val, i) => acc + Math.abs(val - zvals.data[i]), 0) /
				(zvals.data.length - 1);

			dataCellSize = [dx, dy, dz];
			dataShape = [currentShape[1], currentShape[2], currentShape[0]];
		}
	};

	const fetchAllData = async (url, path) => {
		/**
		 * Creates a new Queue instance with a concurrency of 1 and a timeout of 5000ms.
		 */
		const q = new Queue(1, 5000);
		// console.log('🎹 tasks', tasks);

		for (let i = 0; i < 10; ++i) {
			const me = Symbol();
			await q.wait(me, 10 - i);

			try {
				fetchData(url, path, i);
				console.log('📕 data', i);
			} catch (e) {
				console.error(e);
			} finally {
				q.end(me);
			}
		}
		return await q.flush();
	};

	// fetchAllData(zarrUrl, 'ql');

	onMount(async () => {
		console.log('🎹 Start downloading data');

		// Don't wait for all the data to be downloaded, and start updating the vievwer with the slices that are already downloaded
		// await fetchAllData(zarrUrl, 'ql');
		fetchAllData(zarrUrl, 'ql');
		console.log('🎹 data downloaded');

		interval = setInterval(() => {
			console.log('⚡️ currentTimeIndex', currentTimeIndex);

			if (allTimeSlices[currentTimeIndex]) {
				dataUint8 = allTimeSlices[currentTimeIndex];
				dataUint8 = [...dataUint8]; // After updating an element, reassign the whole array
				currentTimeIndex = (currentTimeIndex + 1) % 10; // 10 is the number of time slices, go to 0 after 9 TODO: make this dynamic
			}
		}, 500);
	});

	onDestroy(() => clearInterval(interval));
</script>

<div class="flex flex-col">
	<pre> Slices downloaded: {allTimeSlices?.length} </pre>
	<pre> dataUint8: {dataUint8} </pre>
	<br />
	TO: {!!dataUint8}
	{#if !!dataUint8}
		hello data
		<!-- // && dataCellSize.length !== 0 SHOW DATA -->
		<!-- <Vol3dViewer
			volumeDataUint8={dataUint8}
			volumeSize={dataShape}
			voxelSize={dataCellSize}
			transferFunctionTex={makeCloudTransferTex()}
			dtScale={0.1}
			finalGamma={6.0}
		/> -->
	{:else}
		LOADING DATA...
	{/if}
</div>
