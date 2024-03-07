<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import * as THREE from 'three';
	import DebugButtons from './DebugButtons.svelte';

	import { allTimeSlices, currentTimeIndex, downloadedTime } from '../stores/allSlices.store';
	import { cloudLayerSettings, rainLayerSettings, temperatureLayerSettings, showGrid } from '../stores/viewer.store';
	import { create3DScene } from '../sceneSetup/createScene';

	import { fetchFirstSlices } from '../fetchAndPrepareData/fetchFirstSlices';
	import { createGridHelper } from '../sceneSetup/createGridHelper';
	import { boxes, visible_data } from '../sceneSetup/boxSetup';
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
		// Change transparency of the materials
		boxes.qrMaterial && (boxes.qrMaterial.uniforms.uTransparency.value = $rainLayerSettings.opacity / 100);
		boxes.qlMaterial && (boxes.qlMaterial.uniforms.uTransparency.value = $cloudLayerSettings.opacity / 100);
		boxes.thetavmixMaterial &&
			(boxes.thetavmixMaterial.uniforms.uTransparency.value = $temperatureLayerSettings.opacity / 100);

		// TODO:
		// TODO:  make this work
		// TODO:
		// TODO:
		// Enable and disable the layers
		if (scene) {
			$rainLayerSettings.enabled && !!boxes.qrBox ? scene.add(boxes.qrBox) : scene.remove(boxes.qrBox);
			$cloudLayerSettings.enabled && !!boxes.qlBox ? scene.add(boxes.qlBox) : scene.remove(boxes.qlBox);
			$temperatureLayerSettings.enabled && !!boxes.thetavmixBox
				? scene.add(boxes.thetavmixBox)
				: scene.remove(boxes.thetavmixBox);
		}
		// console.log('🎹 changed ranged', $rainLayerSettings);
		// console.log('🎹 changed ranged', $temperatureLayerSettings);
		// scene?.updateOpacity('cloud', $cloudLayerSettings.opacity / 100); // Assuming opacity is a fraction
	}

	// Toggle showGrid helper
	export function toggleGrid() {
		showGrid.update(($showGrid) => !$showGrid);
		gridHelper.visible = $showGrid; // Assuming gridHelper is your grid object
	}

	onMount(async () => {
		const timing = performance.now();
		// 3D scene
		scene = await create3DScene({ canvas, camera });

		// Add the grid helper to the scene
		gridHelper = createGridHelper();
		scene.add(gridHelper);

		// Add the example points to the scene
		// scene.add(examplePoints());

		// Download first slice of the data and calculate the voxel and volume size. It runs only once.
		fetchFirstSlices(visible_data, scene, boxes);

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
