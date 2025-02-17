<script lang="ts">
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { updateLayers, displaceLayers } from '../sceneSetup/boxSetup';
	import { currentTimeIndex, currentStepIndex, loading, loadTime, subStepsPerFrame, multiVariableStore } from '../stores/viewer.store';
	import { renderScene } from '../sceneSetup/create3DScene';

	export let playAnimation = false;
	export let length = 10;
	export let playSpeedInMiliseconds = 1000;

	let interval;

	const dispatch = createEventDispatcher();

	async function play() {
		playAnimation = !playAnimation;
		while(playAnimation){
			const nextStep = (get(currentStepIndex) + 1) % subStepsPerFrame;
			currentStepIndex.set(nextStep);
			let stepIncrementPromise = displaceLayers(nextStep, subStepsPerFrame).then(() => renderScene());
			let promises = [stepIncrementPromise];
			if(nextStep == 0) {
				const nextTimeIndex = (get(currentTimeIndex) + 1) % multiVariableStore.numTimes;
				currentTimeIndex.set(nextTimeIndex);
				let timeUpdatePromise = updateLayers(nextTimeIndex).then(() => renderScene());
				promises.push(timeUpdatePromise);
			}
			const delayPromise = new Promise<void>(res => setTimeout(res, playSpeedInMiliseconds/subStepsPerFrame));
			promises.push(delayPromise);
			await Promise.all(promises);
		}
	}

	onMount(() => {
		// Update the material when the currentTimeIndex changes
		currentTimeIndex.subscribe(async (index: number) => {
			if(playAnimation) return;
			loading.set(true);
			const startTime = performance.now();
			await updateLayers(index).then(() => renderScene());
			const endTime = performance.now();
			loading.set(false);
			loadTime.set(endTime - startTime);
		});
		currentStepIndex.subscribe(async (index: number) => {
			if(index != 0 && !playAnimation) {
				await displaceLayers(index, subStepsPerFrame).then(() => renderScene());
			}
		})
	});

	onDestroy(() => {
		clearInterval(interval);
	});
</script>

<div class="flex gap-4 mt-10 items-center px-5">
	<!--  Play icon -->
	<button class="btn" class:btn-primary={playAnimation} on:click={async () => await play()}>
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
			min="0"
			max={ length - 1 }
			step="1"
			value={$currentTimeIndex}
			on:input={(event) => {
				dispatch('onSelectedIndex', { index: parseInt(event.target.value) });
			}}
		/>
		<div class="w-full flex justify-between text-xs px-2 h-[15px]">
			<!-- Steps -->
			<!--  array of steps from 0 to length -->
			{#each Array.from({ length }, (_, index) => index ) as step}
				<div class="flex flex-col">
					<div>|</div>
				</div>
			{/each}
		</div>
		<div class="w-full flex justify-between text-xs px-2 h-[15px]">
			<!-- Steps -->
			<!--  array of steps from 0 to length -->
			{#each Array.from({ length }, (_, index) => index ) as step}
				<div class="flex flex-col">
					{#if length < 21}
						<div>{step || 0}</div>
					{:else}
						{#if step % 10 == 0}
							<div>{step || 0}</div>
						{/if}
					{/if}
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
	{#if $loading}
		<div>
			Loading data
			<progress class="progress w-56" />
		</div>
	{:else}
		Data buffer loaded in: {($loadTime / 1000).toFixed(2)} seconds
	{/if}
</div>
