<script lang="ts">
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { dataSlices, coarseDataSlices, currentTimeIndex, downloadedTime } from '../stores/allSlices.store';
	import { data_layers } from '../sceneSetup/boxSetup';
	import { updateMaterial,
		refreshMaterial,  
		currentStepIndex } from '../sceneSetup/updateMaterial';

	export let playAnimation = false;
	export let length = 10;
	export let positionIndex = 0;
	export let playSpeedInMiliseconds = 300;
	export let subStepsPerFrame = 10;

	let interval;
	const dispatch = createEventDispatcher();

	function play() {
		playAnimation = !playAnimation;
		if (playAnimation) {
			interval = setInterval(() => {
				if (get(dataSlices)[get(currentTimeIndex)]) {
					const nextStep = (get(currentStepIndex) + 1) % subStepsPerFrame;
					currentStepIndex.set(nextStep);
					if(nextStep == 0) {
						const nextTimeIndex = (get(currentTimeIndex) + 1) % get(dataSlices).length;
						currentTimeIndex.set(nextTimeIndex);	
					}
				}
			}, playSpeedInMiliseconds/subStepsPerFrame);
		} else {
			clearInterval(interval);
		}
	}

	onMount(() => {
		// Update the material when the currentTimeIndex changes
		currentTimeIndex.subscribe((index: number) => {
			const data = get(dataSlices)[index];
			const coarseData = get(coarseDataSlices)[index];
			if (data) {
				for (const variable of data_layers) {
					updateMaterial({ variable, dataUint8: data[variable], coarseData: coarseData[variable] ?? null });
				}
			}
		});
		currentStepIndex.subscribe((index: number) => {
			if(index != 0){
				for (const variable of data_layers) {
					refreshMaterial({variable, index, maxIndex: subStepsPerFrame});
				}
			}
		})
	});

	onDestroy(() => {
		clearInterval(interval);
	});
</script>

<div class="flex gap-4 mt-10 items-center px-5">
	<!--  Play icon -->
	<button class="btn" class:btn-primary={playAnimation} on:click={() => play()}>
		{#if !playAnimation}
			<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
				<path
					fill="currentColor"
					d="M9.525 18.025q-.5.325-1.012.038T8 17.175V6.825q0-.6.513-.888t1.012.038l8.15 5.175q.45.3.45.85t-.45.85l-8.15 5.175Z"
				/>
			</svg>
		{:else}
			<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
				<path
					fill="currentColor"
					d="M16 19q-.825 0-1.413-.588T14 17V7q0-.825.588-1.413T16 5q.825 0 1.413.588T18 7v10q0 .825-.588 1.413T16 19Zm-8 0q-.825 0-1.413-.588T6 17V7q0-.825.588-1.413T8 5q.825 0 1.413.588T10 7v10q0 .825-.588 1.413T8 19Z"
				/>
			</svg>
		{/if}
	</button>
	<div class="w-full">
		<!-- Timeline -->
		<input
			type="range"
			class="range-slider transparent h-[4px] w-full cursor-pointer appearance-none border-transparent bg-neutral-200 dark:bg-neutral-600"
			min="1"
			max={length}
			step="1"
			value={positionIndex + 1}
			on:input={(event) => {
				dispatch('onSelectedIndex', { index: parseInt(event.target.value) });
			}}
		/>
		<div class="w-full flex justify-between text-xs px-2 h-[30px]">
			<!-- Steps -->
			<!--  array of steps from 0 to length -->
			{#each Array.from({ length }, (_, index) => index) as step}
				<div class="flex flex-col">
					<div>|</div>
					<div class="-ml-1">{step + 1 || 0}</div>
				</div>
			{/each}
		</div>
	</div>
</div>
<div class="flex gap-4 p-6">
	Play Speed in miliseconds:

	<input
		type="number"
		value={playSpeedInMiliseconds}
		step="100"
		min="100"
		class="w-20"
		on:input={(event) => {
			const wasPlaying = playAnimation;
			wasPlaying && play(); // stop current animation the animation
			playSpeedInMiliseconds = parseInt(event?.target?.value);
			wasPlaying && play(); // stop current animation the animation
		}}
	/>
	{#if $dataSlices.length < 1}
		<div>
			Loading data
			<progress class="progress w-56" />
		</div>
	{:else}
		All data loaded in: {$downloadedTime / 1000} seconds
	{/if}
</div>
