<script lang="ts">
	import TimeLine from '$lib/components/TimeLine.svelte';
	import { allTimeSlices, currentTimeIndex, totalSlices } from '$lib/stores/allSlices.store';
	import Viewer from '$lib/components/Viewer.svelte';
	import { cloudLayer, rainLayer, slicesToRender, temperatureLayer } from '$lib/stores/viewer.store';
</script>

<!--  Debugging info -->

<div class="grid grid-cols-[1fr_300px] grid-rows-1 w-screen h-screen">
	<!-- <a class="btn" href="/zarrExample">Zarr playground</a> -->
	<!-- <pre>Slices downloaded: {@JSON.stringify(allTimeSlices.length, null, 2)}</pre> -->
	<div class="flex flex-col">
		<!-- datashape = dataShape: {JSON.stringify($dataShape, null, 2)} -->

		<div class="w-full h-full">
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
			Slices:
			<input
				type="number"
				min="0"
				bind:value={$slicesToRender}
				on:change={(e) => {
					$slicesToRender = e.target.value;
				}}
				class="input input-xs w-14"
			/>
			of {totalSlices}<br />
			dataUint8 (slice) {$allTimeSlices[0]?.length} - {($allTimeSlices[0]?.byteLength / 1073741824).toFixed(3)} GB
			<!-- <pre>dataCellSize: {$dataCellSize.length} |</pre> -->
			Slices downloaded: {JSON.stringify($allTimeSlices.length, null, 2)}
		</div>

		<h3 class="mt-10 text-xl">Layers</h3>
		{#if $cloudLayer}
			<div class="form-control">
				<div class="grid grid-cols-2 gap-2 items-center">
					<label class="label cursor-pointer justify-start gap-3 w-1/2">
						<input
							type="checkbox"
							checked={$cloudLayer.enabled}
							class="checkbox checkbox-sm"
							on:change={(e) => ($cloudLayer.enabled = e.target.checked)}
						/>
						<span class="label-text w-1/2">Clouds</span>
					</label>
					<input
						type="range"
						min="0"
						max="100"
						bind:value={$cloudLayer.opacity}
						on:change={(e) => ($cloudLayer.opacity = e.target.value)}
						disabled={!$cloudLayer.enabled}
						class:opacity-30={!$cloudLayer.enabled}
						class="disabled range range-xs"
					/>
				</div>

				<div class="grid grid-cols-2 gap-2 items-center">
					<label class="label cursor-pointer justify-start gap-3">
						<input
							type="checkbox"
							checked={$rainLayer.enabled}
							class="checkbox checkbox-sm"
							on:change={(e) => ($rainLayer.enabled = e.target.checked)}
						/>
						<span class="label-text">Rain</span>
					</label>
					<input
						type="range"
						bind:value={$rainLayer.opacity}
						on:change={(e) => ($rainLayer.opacity = e.target.value)}
						min="0"
						max="100"
						class="range range-xs"
						disabled={!$rainLayer.enabled}
						class:opacity-30={!$rainLayer.enabled}
					/>
				</div>
				<div class="grid grid-cols-2 gap-2 items-center">
					<label class="label cursor-pointer justify-start gap-3 w-1/2">
						<input
							type="checkbox"
							checked={$temperatureLayer.enabled}
							class="checkbox checkbox-sm"
							on:change={(e) => ($temperatureLayer.enabled = e.target.checked)}
						/>
						<span class="label-text">Surface Temperature</span>
					</label>
					<input
						type="range"
						min="0"
						max="100"
						bind:value={$temperatureLayer.opacity}
						on:change={(e) => ($temperatureLayer.opacity = e.target.value)}
						class="range range-xs"
						disabled={!$temperatureLayer.enabled}
						class:opacity-30={!$temperatureLayer.enabled}
					/>
				</div>
			</div>
		{/if}

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
