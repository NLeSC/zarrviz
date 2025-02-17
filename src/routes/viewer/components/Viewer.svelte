<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import * as THREE from 'three';
	import DebugButtons from './DebugButtons.svelte';

	import { cloudLayerSettings, rainLayerSettings, temperatureLayerSettings, showGrid, 
		numTimes, currentTimeIndex, currentStepIndex, subStepsPerFrame, wind, multiVariableStore } from '../stores/viewer.store';
	import { create3DScene, scene, renderer, camera, renderScene } from '../sceneSetup/create3DScene';

	import { dataSetup } from '../fetchAndPrepareData/dataSetup';
	import { createGridHelper } from '../sceneSetup/createGridHelper';

	import { get, writable } from 'svelte/store';
	import { layers } from '../sceneSetup/boxSetup';
	import type { RemoteDataLayer } from '../sceneSetup/remoteDataLayer';

	let canvas: HTMLElement;

	let gridHelper: THREE.GridHelper;

	// Download time
	const downloadedTime = writable(0);

	//
	// Listen for changes in the opacity of the layers and update the material
	// and add and remove the layers from the scene
	//
	$: {
		if (scene) {
			// Change transparency of the materials
			layers.ql && (layers.ql.updateUniforms({uTransparency: $cloudLayerSettings.opacity / 100}));
			layers.qr && (layers.qr.updateUniforms({uTransparency: $rainLayerSettings.opacity / 100}));
			layers.thetavmix &&
				(layers.thetavmix.configureUniforms({uTransparency: $temperatureLayerSettings.opacity / 100}));

			// Enable and disable the layers
			updateLayerVisibility(layers.qr, $rainLayerSettings.enabled);
			updateLayerVisibility(layers.ql, $cloudLayerSettings.enabled);
			updateLayerVisibility(layers.thetavmix, $temperatureLayerSettings.enabled);

			// Render the scene
			renderScene();
		}
	}

	function updateLayerVisibility(layer: RemoteDataLayer, enabled: boolean) {
		if (layer === undefined) return;
		if (layer && enabled){
			layer.update(get(currentTimeIndex));
			layer.displace(get(currentStepIndex), subStepsPerFrame, wind);
			scene.add(layer.getRenderObject());
		} else {
			scene.remove(layer.getRenderObject());
		}
	}

	// Toggle showGrid helper
	export function toggleGrid() {
		showGrid.update(($showGrid) => !$showGrid);
		gridHelper.visible = $showGrid; // Assuming gridHelper is your grid object
	}

	onMount(async () => {
		const timing = performance.now();

		// Create the base 3D scene (camera, renderer, etc.)
		await create3DScene({ canvas });

		// Add the grid helper to the scene
		gridHelper = createGridHelper();
		scene.add(gridHelper);

		//
		// Add an axes helper to the scene to help with debugging.
		//
		// const axesHelper = new THREE.AxesHelper(5);
		// scene.add(axesHelper);
		//
		const presentVariables = await dataSetup(Object.keys(layers), scene, multiVariableStore);
		$cloudLayerSettings.active = presentVariables.includes('ql');
		$rainLayerSettings.active = presentVariables.includes('qr');
		$temperatureLayerSettings.active = presentVariables.includes('thetavmix');
		numTimes.set(multiVariableStore.numTimes);

		// Add the example points to the scene
		// scene.add(examplePoints());

		downloadedTime.set(Math.round(performance.now() - timing));
		renderer.render(scene, camera);
		console.log('⏰ data downloaded and displayed in:', Math.round(performance.now() - timing), 'ms');
	});

	onDestroy(() => {
		// Clean up Three.js resources
		currentTimeIndex.set(0);
		multiVariableStore.clear();
	});
</script>

<div>
	<div class="fixed top-0 left-0">
		<a href="/"><button class="btn">← Select dataset</button></a>

		<button class="btn" on:click={() => toggleGrid()}>
			<input type="checkbox" bind:checked={$showGrid} id="gridCheckbox" />
			<label class="pointer-events-none" for="gridCheckbox"> Show Grid </label>
		</button>
		<DebugButtons />
	</div>
</div>
<canvas class="w-full h-full" bind:this={canvas} />
