<script lang="ts">
	import TimeLine from './components/TimeLine.svelte';

	import { dataSlices, currentTimeIndex, totalSlices } from './stores/allSlices.store';
	import {
		cloudLayerSettings,
		rainLayerSettings,
		slicesToRender,
		temperatureLayerSettings
	} from './stores/viewer.store';

	import Stats from '$lib/components/Stats.svelte';
	import Viewer from './components/Viewer.svelte';
	// import Viewer from '$lib/components/viewerExample.svelte';
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
			length={$dataSlices.length}
			on:onSelectedIndex={(value) => currentTimeIndex.set(value.detail.index)}
		/>
	</div>
	<div class="px-4 py-4">
		<h2 class="text-2xl mb-3">Dataset</h2>
		<Stats />

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
			of {$totalSlices}<br />
			dataUint8 (slice) {$dataSlices[0]?.length} - {($dataSlices[0]?.byteLength / 1073741824).toFixed(3)} GB
			<!-- <pre>dataCellSize: {$dataCellSize.length} |</pre> -->
			Slices downloaded: {JSON.stringify($dataSlices.length, null, 2)}
		</div>

		<h3 class="mt-10 text-xl">Layers</h3>
		{#if $cloudLayerSettings}
			<div class="form-control">
				<div class="grid grid-cols-2 gap-2 items-center">
					<label class="label cursor-pointer justify-start gap-3 w-1/2">
						<input
							type="checkbox"
							checked={$cloudLayerSettings.enabled}
							class="checkbox checkbox-sm"
							on:change={(e) => ($cloudLayerSettings.enabled = e.target.checked)}
						/>
						<span class="label-text w-1/2">Clouds</span>
					</label>
					<input
						type="range"
						min="0"
						max="100"
						bind:value={$cloudLayerSettings.opacity}
						on:change={(e) => ($cloudLayerSettings.opacity = e.target.value)}
						disabled={!$cloudLayerSettings.enabled}
						class:opacity-30={!$cloudLayerSettings.enabled}
						class="disabled range range-xs"
					/>
				</div>

				<div class="grid grid-cols-2 gap-2 items-center">
					<label class="label cursor-pointer justify-start gap-3">
						<input
							type="checkbox"
							checked={$rainLayerSettings.enabled}
							class="checkbox checkbox-sm"
							on:change={(e) => ($rainLayerSettings.enabled = e.target.checked)}
						/>
						<span class="label-text">Rain</span>
					</label>
					<input
						type="range"
						bind:value={$rainLayerSettings.opacity}
						on:change={(e) => ($rainLayerSettings.opacity = e.target.value)}
						min="0"
						max="100"
						class="range range-xs"
						disabled={!$rainLayerSettings.enabled}
						class:opacity-30={!$rainLayerSettings.enabled}
					/>
				</div>
				<div class="grid grid-cols-2 gap-2 items-center">
					<label class="label cursor-pointer justify-start gap-3 w-1/2">
						<input
							type="checkbox"
							checked={$temperatureLayerSettings.enabled}
							class="checkbox checkbox-sm"
							on:change={(e) => ($temperatureLayerSettings.enabled = e.target.checked)}
						/>
						<span class="label-text">Surface Temperature</span>
					</label>
					<input
						type="range"
						min="0"
						max="100"
						bind:value={$temperatureLayerSettings.opacity}
						class="range range-xs"
						disabled={!$temperatureLayerSettings.enabled}
						class:opacity-30={!$temperatureLayerSettings.enabled}
					/>
				</div>
			</div>
		{/if}

		<div class="mt-10 text-xl">Instruments</div>
		<div class="flex flex-col gap-4 mt-5">
			<!-- You can open the modal using ID.showModal() method -->
			<button class="btn" onclick="my_modal_1.showModal()">Instrument Details Demo</button>
			<dialog id="my_modal_1" class="modal">
				<div class="modal-box w-11/12 max-w-full h-[90%] max-h-full">
					<form method="dialog">
						<button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
					</form>
					<h3 class="font-bold text-lg">Instrument</h3>
					<p class="py-4">Press ESC key or click on ✕ button to close</p>
					<iframe title="Instrument 1 details" class="w-full h-[90%]" src="/instrument/index.html" frameborder="0"
					></iframe>
				</div>
			</dialog>

			<!-- <button class="btn" onclick="my_modal_2.showModal()">Instrument 2 details</button>
			<dialog id="my_modal_2" class="modal">
				<div class="modal-box w-11/12 max-w-full h-[90%] max-h-full">
					<form method="dialog">
						<button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
					</form>
					<h3 class="font-bold text-lg">Instrument</h3>
					<p class="py-4">Press ESC key or click on ✕ button to close</p>
					<iframe title="Instrument 2 details" class="w-full h-[90%]" src="/instrument/index.html" frameborder="0"
					></iframe>
					src="http://wind-experiment.ceg.tudelft.nl/dataBrowser/dataBrowser4.html?site=CMTRACE-2023&date=2023-06-27&UpperLeft=WC_KNMI_overview&UpperRight=skiron_wind_direction&LowerRight=WC_TUD_wind_speed&LowerLeft=ceilometer"
				</div>
			</dialog> -->
		</div>
	</div>
</div>
