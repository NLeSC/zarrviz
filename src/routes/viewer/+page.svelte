<script lang="ts">
	import TimeLine from '$lib/components/TimeLine.svelte';

	import { allTimeSlices, currentTimeIndex } from '$lib/components/allSlices.store';

	import Viewer from './Viewer.svelte';
	// import Viewer from '$lib/components/viewerExample.svelte';
</script>

<!--  Debugging info -->

<div class="grid grid-cols-[1fr_300px] grid-rows-1 w-screen h-screen">
	<!-- <a class="btn" href="/zarrExample">Zarr playground</a> -->
	<!-- <pre>Slices downloaded: {@JSON.stringify(allTimeSlices.length, null, 2)}</pre> -->
	<div class="flex flex-col">
		<!-- datashape = dataShape: {JSON.stringify($dataShape, null, 2)} -->

		<div class="bg-green-900 w-full h-full">
			<Viewer />
		</div>
		<TimeLine
			positionIndex={$currentTimeIndex}
			length={$allTimeSlices.length}
			on:onSelectedIndex={(value) => currentTimeIndex.set(value.detail.index)}
		/>
	</div>
	<div class="px-4 py-4">
		<h2 class="text-2xl mb-3">Scene Title</h2>

		<div class="text-sm">
			<!-- 1073741824 = 1GB -->
			dataUint8 (slice) {$allTimeSlices[0]?.length} - {($allTimeSlices[0]?.byteLength / 1073741824).toFixed(3)} GB
			<!-- <pre>dataCellSize: {$dataCellSize.length} |</pre> -->
			Slices downloaded: {JSON.stringify($allTimeSlices.length, null, 2)}
		</div>

		<h3 class="mt-10 text-xl">Layers</h3>

		<div class="form-control">
			<label class="label cursor-pointer justify-start gap-3">
				<input type="checkbox" checked={true} class="checkbox checkbox-sm" />
				<span class="label-text w-48">Clouds</span>
				<input type="range" min="0" max="100" value="40" class="range range-xs" />
			</label>

			<label class="label cursor-pointer justify-start gap-3">
				<input type="checkbox" checked={true} class="checkbox checkbox-sm" />
				<span class="label-text w-48">Rain</span>
				<input type="range" min="0" max="100" value="40" class="range range-xs" />
			</label>

			<label class="label cursor-pointer justify-start gap-3">
				<input type="checkbox" checked={true} class="checkbox checkbox-sm" />
				<span class="label-text w-48">Surface Temperature</span>
				<input type="range" min="0" max="100" value="40" class="range range-xs" />
			</label>
		</div>

		<div class="mt-10 text-xl">Instruments</div>
		<div class="flex flex-col gap-4 mt-5">
			<!-- You can open the modal using ID.showModal() method -->
			<button class="btn" onclick="my_modal_1.showModal()">Instrument 1 details</button>
			<dialog id="my_modal_1" class="modal">
				<div class="modal-box w-11/12 max-w-full h-[90%] max-h-full">
					<form method="dialog">
						<button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
					</form>
					<h3 class="font-bold text-lg">Instrument</h3>
					<p class="py-4">Press ESC key or click on ✕ button to close</p>
					<iframe
						title="Instrument 1 details"
						class="w-full h-[90%]"
						src="http://wind-experiment.ceg.tudelft.nl/dataBrowser/dataBrowser4.html?site=CMTRACE-2023&date=2023-06-27&UpperLeft=WC_KNMI_overview&UpperRight=skiron_wind_direction&LowerRight=WC_TUD_wind_speed&LowerLeft=ceilometer"
						frameborder="0"
					></iframe>
				</div>
			</dialog>

			<button class="btn" onclick="my_modal_2.showModal()">Instrument 2 details</button>
			<dialog id="my_modal_2" class="modal">
				<div class="modal-box w-11/12 max-w-full h-[90%] max-h-full">
					<form method="dialog">
						<button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
					</form>
					<h3 class="font-bold text-lg">Instrument</h3>
					<p class="py-4">Press ESC key or click on ✕ button to close</p>
					<iframe
						title="Instrument 2 details"
						class="w-full h-[90%]"
						src="http://wind-experiment.ceg.tudelft.nl/dataBrowser/dataBrowser4.html?site=CMTRACE-2023&date=2023-06-27&UpperLeft=WC_KNMI_overview&UpperRight=skiron_wind_direction&LowerRight=WC_TUD_wind_speed&LowerLeft=ceilometer"
						frameborder="0"
					></iframe>
				</div>
			</dialog>
		</div>
	</div>
</div>
