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
		downloadedTime
	} from '../stores/allSlices.store';
	import { cloudLayer, rainLayer, temperatureLayer, showGrid } from '../stores/viewer.store';
	import DebugButtons from './DebugButtons.svelte';
	import { cameraControls, create3DScene, toggleGrid } from '../sceneSetup/createScene';
	import { initMaterial, updateMaterial } from '../sceneSetup/initMaterial';
	import { createPlaneRenderingBox, createVolumetricRenderingBox } from '../sceneSetup/boxSetup';

	// import examplePoints from '$lib/components/3DVolumetric/examplePoints';

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
	// TODO: MOVE TO THE SCENE SETUP
	// TODO:
	// TODO:
	let cameraFovDegrees = 5.0;
	let cameraNear = 0.01;
	let cameraFar = 1000.0;

	// TODO:
	// TODO:
	// TODO:
	// TODO:
	type Boxes = {
		qrBox?: THREE.Mesh;
		qlBox?: THREE.Mesh;
		thetavmixBox?: THREE.Points;
	};
	let boxes: Boxes = {};

	// TODO Move to boxes???
	let qrBox: THREE.Mesh;
	let qlBox: THREE.Mesh;
	let thetavmixBox: THREE.Points;

	// TODO:
	// TODO:
	// TODO:
	// TODO:
	const visible_data = [
		// 'ql', // clouds
		'qr' // rain
		// 'thetavmix' // temperature
	];

	// 1 unit in the scene = 1000 meters (1 kilometer) in real life
	// Meters of the bounding box of the data
	let scaleFactor = 33800; // TODO: calculate this value from the data
	// TODO:
	// TODO:
	// TODO:
	// TODO:
	let qlMaterial: THREE.Material;
	let qrMaterial: THREE.Material;
	let thetavmixMaterial: THREE.Material;

	//
	// Listen for changes in the opacity of the layers and update the material
	//
	$: {
		// Change transparency of the materials
		// function toggleGrid() {
		// showGrid = !showGrid;
		// gridHelper.visible = $showGrid; // Assuming gridHelper is your grid object
		// }

		qrMaterial && (qrMaterial.uniforms.uTransparency.value = $rainLayer.opacity / 100);
		qlMaterial && (qlMaterial.uniforms.uTransparency.value = $cloudLayer.opacity / 100);
		thetavmixMaterial && (thetavmixMaterial.uniforms.uTransparency.value = $temperatureLayer.opacity / 100);

		// TODO:
		// TODO:
		// TODO:
		// TODO:
		// Enable and disable the layers
		if (!!qrBox) {
			if ($rainLayer.enabled) {
				scene.add(qrBox);
			} else {
				scene.remove(qrBox);
			}
		}
		// console.log('🎹 changed ranged', $rainLayer);
		// console.log('🎹 changed ranged', $temperatureLayer);
		// scene?.updateOpacity('cloud', $cloudLayer.opacity / 100); // Assuming opacity is a fraction
	}

	// TODO: Move to the timeline component
	// TODO: Move to the timeline component
	// TODO: Move to the timeline component
	// TODO: Move to the timeline component
	// TODO: Move to the timeline component
	// Assuming the structure of each time slice
	type TimeSlice = {
		[key: string]: Uint8Array; // key is the variable name, associated with Uint8Array data
	};
	// Update the material when the currentTimeIndex changes
	currentTimeIndex.subscribe((index: number) => {
		const data: TimeSlice = get(allTimeSlices)[index];
		if (data) {
			for (var variable of visible_data) {
				updateMaterial({ variable, dataUint8: data[variable] });
			}
		}
	});

	// Render the scene. This function can be reused in other effects or callbacks.
	function renderScene(): void {
		renderer.render(scene, camera);
		console.log('🔥 rendered');
	}

	onMount(async () => {
		// scaleFactor = 33800; // TODO: calculate this value from the data
		// 3D scene
		console.log('entered onMount');
		scene = await create3DScene({ canvas, camera, cameraFar, cameraNear, cameraFovDegrees });
		console.log('entered onMount', scene);

		// Add the points to the scene
		// scene.add(examplePoints());

		const timing = performance.now();
		// Download first slice of the data and calculate the voxel and volume size. It runs only once.
		// TODO:
		// TODO: MOve to set up data???????
		// TODO:
		// TODO:

		for (let variable of visible_data) {
			const dimensions = variable === 'thetavmix' ? 3 : 4;
			// Common operation for all variables
			fetchAllSlices({ path: variable, dimensions });

			// Conditional operations based on the variable value
			if (variable === 'thetavmix') {
				const {
					dataUint8: vdata,
					store: vstore,
					shape: vshape
				} = await fetchSlice({ currentTimeIndex: 0, path: variable, dimensions: 3 });
				await getVoxelAndVolumeSize2D(vstore, vshape, variable);
				thetavmixBox = createPlaneRenderingBox({ scene, boxes, variable, dataUint8: vdata });
			} else {
				const {
					dataUint8: vdata,
					store: vstore,
					shape: vshape,
					coarseData: vCoarseData
				} = await fetchSlice({ currentTimeIndex: 0, path: variable });
				await getVoxelAndVolumeSize(vstore, vshape, variable);
				await createVolumetricRenderingBox({
					scene,
					boxes,
					variable,
					dataUint8: vdata,
					dataCoarse: vCoarseData
				});
			}
		}
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
