<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import * as THREE from 'three';
	import DebugButtons from './DebugButtons.svelte';

	import { allTimeSlices, currentTimeIndex, downloadedTime } from '../stores/allSlices.store';
	import { cloudLayerSettings, rainLayerSettings, temperatureLayerSettings, showGrid } from '../stores/viewer.store';
	import { create3DScene } from '../sceneSetup/create3DScene';

	import { dataSetup } from '../fetchAndPrepareData/dataSetup';
	import { createGridHelper } from '../sceneSetup/createGridHelper';
	import { boxes, data_layers } from '../sceneSetup/boxSetup';
	// import examplePoints from '../fetchAndPrepareData/examplePoints';

	let canvas: HTMLElement;
	let scene: THREE.Scene;
	let camera: THREE.PerspectiveCamera;
	let gridHelper: THREE.GridHelper;

	//
	// Listen for changes in the opacity of the layers and update the material
	// and add and remove the layers from the scene
	//
	$: {
		if (scene) {
			// Change transparency of the materials
			// TODO: TESTING THESE ARE THE ORIGINAL
			boxes.ql && (boxes.ql.material.uniforms.uTransparency.value = $cloudLayerSettings.opacity / 100);
			// boxes.qrBox && (boxes.qrBox.material.uniforms.uTransparency.value = $rainLayerSettings.opacity / 100);
			// boxes.thetavmixBox &&
			// 	(boxes.thetavmixBox.material.uniforms.uTransparency.value = $temperatureLayerSettings.opacity / 100);

			// TODO: TESTING
			// boxes.ql && (boxes.ql.material.opacity = $cloudLayerSettings.opacity / 100);
			// boxes.qrBox && (boxes.qrBox.material.opacity = $rainLayerSettings.opacity / 100);
			// boxes.thetavmixBox && (boxes.thetavmixBox.material.opacity = $temperatureLayerSettings.opacity / 100);

			// TODO:
			// TODO:  make this work
			// TODO:
			// TODO:
			// Enable and disable the layers
			$rainLayerSettings.enabled && !!boxes.qr ? scene.add(boxes.qr) : scene.remove(boxes.qr);
			$cloudLayerSettings.enabled && !!boxes.ql ? scene.add(boxes.ql) : scene.remove(boxes.ql);
			$temperatureLayerSettings.enabled && !!boxes.thetavmix
				? scene.add(boxes.thetavmix)
				: scene.remove(boxes.thetavmix);
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
		scene = await create3DScene({ canvas, camera });

		// Add the grid helper to the scene
		gridHelper = createGridHelper();
		scene.add(gridHelper);

		// Download first slice of the data and
		// calculate the voxel and volume size.
		// It runs only once.
		dataSetup(data_layers, scene);

		// Add the example points to the scene
		// scene.add(examplePoints());

		downloadedTime.set(Math.round(performance.now() - timing));
		console.log('⏰ data downloaded and displayed in:', Math.round(performance.now() - timing), 'ms');
	});

	onDestroy(() => {
		// Clean up Three.js resources
		currentTimeIndex.set(0);
		allTimeSlices.set([]);
	});
</script>

<div>
	<div class="fixed top-0 left-0">
		<a href="/"><button class="btn">← Select dataset</button></a>

		<!-- Open the modal using ID.showModal() method -->
		<button class="btn" onclick="camera_modal.showModal()">Camera Controls</button>
		<dialog id="camera_modal" class="modal">
			<div class="modal-box">
				<h3 class="font-bold text-lg">Camera Controls!</h3>
				<DebugButtons {camera} />
			</div>
			<form method="dialog" class="modal-backdrop">
				<button>close</button>
			</form>
		</dialog>
		<button class="btn" on:click={() => toggleGrid()}>
			<input type="checkbox" bind:checked={$showGrid} id="gridCheckbox" />
			<label class="pointer-events-none" for="gridCheckbox"> Show Grid </label>
		</button>
	</div>
</div>
<canvas class="w-full h-full" bind:this={canvas} />
