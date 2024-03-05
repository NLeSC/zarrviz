<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { get } from 'svelte/store';
	import * as THREE from 'three';

	import { fetchSlice } from '../fetchAndPrepareData/fetchSlice';
	import { fetchAllSlices } from '../fetchAndPrepareData/fetchAllSlices';
	import {
		allTimeSlices,
		getVoxelAndVolumeSize,
		getVoxelAndVolumeSize2D,
		volumeSizes,
		currentTimeIndex,
		downloadedTime,
		boxes
	} from '../stores/allSlices.store';

	import { cloudLayerSettings, rainLayerSettings, temperatureLayerSettings, showGrid } from '../stores/viewer.store';
	import { cameraControls, create3DScene, toggleGrid, visible_data } from '../sceneSetup/createScene';
	import { initMaterial, updateMaterial } from '../sceneSetup/initMaterial';
	import { createPlaneRenderingBox, createVolumetricRenderingBox } from '../sceneSetup/boxSetup';

	import DebugButtons from './DebugButtons.svelte';
	import { fetchFirstSlices } from '../fetchAndPrepareData/fetchFirstSlices';
	import examplePoints from '../fetchAndPrepareData/examplePoints';

	// Other variables and refs

	// let dataUint8: Uint8Array = new Uint8Array(0);
	// let voxelSize: number[]; // = //[100, 100, 37.46];
	// let volumeSize: number[]; // = //[1536, 1536, 123];
	// const zarrArray = await openArray({ store: 'http://localhost:5173/data/ql.zarr' });

	//let plane: THREE.Mesh;
	let canvas: HTMLElement;
	let scene: THREE.Scene;
	let camera: THREE.PerspectiveCamera;
	let renderer: THREE.WebGLRenderer; // TODO, do i need the renderer?? i don't think so

	// TODO:
	// TODO:
	// TODO:
	// TODO:
	// TODO Move to boxes, use the Boxes object
	let qrBox: THREE.Mesh;
	let qlBox: THREE.Mesh;
	let thetavmixBox: THREE.Points;

	//
	// Listen for changes in the opacity of the layers and update the material
	//
	$: {
		// Change transparency of the materials
		// function toggleGrid() {
		// showGrid = !showGrid;
		// gridHelper.visible = $showGrid; // Assuming gridHelper is your grid object
		// }

		qrMaterial && (qrMaterial.uniforms.uTransparency.value = $rainLayerSettings.opacity / 100);
		qlMaterial && (qlMaterial.uniforms.uTransparency.value = $cloudLayerSettings.opacity / 100);
		thetavmixMaterial && (thetavmixMaterial.uniforms.uTransparency.value = $temperatureLayerSettings.opacity / 100);

		// TODO:
		// TODO:
		// TODO:
		// TODO:
		// Enable and disable the layers
		if (!!qrBox) {
			if ($rainLayerSettings.enabled) {
				scene.add(qrBox);
			} else {
				scene.remove(qrBox);
			}
		}
		// console.log('🎹 changed ranged', $rainLayerSettings);
		// console.log('🎹 changed ranged', $temperatureLayerSettings);
		// scene?.updateOpacity('cloud', $cloudLayerSettings.opacity / 100); // Assuming opacity is a fraction
	}

	// Render the scene. This function can be reused in other effects or callbacks.
	function renderScene(): void {
		renderer.render(scene, camera);
		console.log('🔥 rendered');
	}

	onMount(async () => {
		const timing = performance.now();
		// 3D scene
		scene = await create3DScene({ canvas, camera });

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
				<DebugButtons {camera} {cameraControls} />
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
