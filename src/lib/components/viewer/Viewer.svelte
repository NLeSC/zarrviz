<script lang="ts">
	import DebugButtons from '../DebugButtons.svelte';
	import { onDestroy, onMount } from 'svelte';
	import * as THREE from 'three';
	import CameraControls from 'camera-controls';

	import { makeRainTransferTex } from '$lib/utils/makeRainTransferTex';

	import { fetchSlice } from '$lib/api/fetchSlice';
	import { fetchAllSlices } from '$lib/api/fetchAllSlices';

	import {
		allTimeSlices,
		getVoxelAndVolumeSize,
		getVoxelAndVolumeSize2D,
		volumeSizes,
		currentTimeIndex,
		downloadedTime
	} from '$lib/stores/allSlices.store';

	import { get } from 'svelte/store';
	import { createPlaneMesh } from '../planeMesh';
	import { scaleFactor } from '$lib/stores/viewer.store';

	// import examplePoints from '$lib/components/3DVolumetric/examplePoints';

	CameraControls.install({ THREE: THREE });
	// Other variables and refs

	// let dataUint8: Uint8Array = new Uint8Array(0);
	// let voxelSize: number[]; // = //[100, 100, 37.46];
	// let volumeSize: number[]; // = //[1536, 1536, 123];
	// const zarrArray = await openArray({ store: 'http://localhost:5173/data/ql.zarr' });

	let cameraControls: CameraControls | null = null;
	//let plane: THREE.Mesh;
	let canvas: HTMLElement;
	let scene: THREE.Scene;
	let camera: THREE.PerspectiveCamera;
	let renderer: THREE.WebGLRenderer;

	// Be caruful with these valies, they can clip the date in the 3D scene
	let cameraNear = 0.1;
	let cameraFar = 10000.0;
	let cameraFovDegrees = 45.0;

	let dtScale: number = 0.6; // 0.8
	let ambientFactor: number = 0.0;
	let solarFactor: number = 0.6; // 0.8

	let qlScale: number = 0.00446;
	let qrScale: number = 0.0035;

	let gHG: number = 0.6;
	let dataEpsilon: number = 1e-10;
	let bottomColor: number[] = [0.0, 0.0005, 0.0033];
	let bottomHeight: number = 675.0;

	let gridHelper: THREE.GridHelper;
	let showGrid = true; // Variable to track the grid's visibility

	// Store the volumetric and plane renderings for the different boxes
	let boxes = {};

	// Run only once at mount
	const transferTexture = makeRainTransferTex();
	const finalGamma = 6.0;

	import { cloudLayer, rainLayer, temperatureLayer } from '$lib/stores/viewer.store';
	import { initMaterial } from './initMaterial';
	// Listent to changes for opacity
	// Example subscription and update for cloudLayer
	$: {
		console.log('🎹 changed ranged', $cloudLayer);

		// scene?.updateOpacity('cloud', $cloudLayer.opacity / 100); // Assuming opacity is a fraction
	}

	// ql:  clouds
	// qr:  rain
	// thetamix: surface temperature
	const visible_boxes = [
		// 'ql', // clouds
		// 'qr', // rain
		'thetavmix' // surface temperature
	];

	function toggleGrid() {
		showGrid = !showGrid;
		gridHelper.visible = showGrid; // Assuming gridHelper is your grid object
	}

	//
	// Create and add a grid helper to the scene
	//
	function createGridHelper() {
		const gridSize = Math.max(280000, 325000) / $scaleFactor; // in scene units
		const cellSize = 10000 / $scaleFactor; // 10 km per cell, in scene units
		const gridDivisionsX = Math.floor(280000 / $scaleFactor / cellSize);
		const gridDivisionsY = Math.floor(325000 / $scaleFactor / cellSize);

		// Create a grid material with opacity
		const gridMaterial = new THREE.LineBasicMaterial({
			color: 0xffffff, // or any color you prefer
			transparent: true,
			opacity: 0.5
		});
		gridHelper = new THREE.GridHelper(gridSize, Math.max(gridDivisionsX, gridDivisionsY), 0xffffff, 0xffffff);

		// Apply the custom material to each line of the gri
		gridHelper.traverse((child) => {
			if (child instanceof THREE.LineSegments) {
				child.material = gridMaterial;
			}
		});

		gridHelper.position.set(0, 0.1, 0); // Adjusted for scaled scene
		gridHelper.rotation.x = -Math.PI / 2;

		return gridHelper;
	}

	// Create the Three.js scene
	function create3DScene(): void {
		// Set up the Three.js scene
		scene = new THREE.Scene();
		renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas }); // Create a WebGLRenderer and specify the canvas to use
		camera = new THREE.PerspectiveCamera(
			cameraFovDegrees,
			window.innerWidth / window.innerHeight,
			cameraNear,
			cameraFar
		);
		camera.position.set(0, -0.9, 0.9); // Adjusted for scaled scene
		camera.lookAt(new THREE.Vector3(0, 0, 0));
		cameraControls = new CameraControls(camera, canvas);

		//
		// Add an axes helper to the scene to help with debugging.
		//
		// const axesHelper = new THREE.AxesHelper(5);
		// scene.add(axesHelper);

		//
		// Add a plane with the Map to the scene
		//
		//scene.add(createPlaneMesh({ width: 5, height: 5, depth: 3 }));
		scene.add(createPlaneMesh());

		//
		// Add a grid to the scene to help visualize camera movement.
		//
		scene.add(createGridHelper());

		//
		// Lights, to be used both during rendering the volume, and rendering the optional surface.
		//
		// Add the sun light to the scene
		// scene.add(sunLight);
		// Add the hemisphere light to the scene
		// scene.add(hemisphereLight);

		//
		// Render loop
		//
		const clock = new THREE.Clock();
		function animate() {
			requestAnimationFrame(animate);
			const delta = clock.getDelta();
			cameraControls.update(delta);
			renderer.render(scene, camera);
		}
		animate();

		function resize() {
			// Get the dimensions of the parent element
			const parent = canvas.parentElement;
			const width = parent.clientWidth;
			const height = parent.clientHeight;

			// Update the renderer and camera with the new sizes
			renderer.setSize(width, height);
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
		}

		// function resize() {
		// 	renderer.setSize(window.innerWidth, 400);
		// 	camera.aspect = window.innerWidth / 400;
		// 	camera.updateProjectionMatrix();
		// }
		window.addEventListener('resize', resize);
		resize();
		animate();

		// console.log('🔋 3d scene created');
	}
	// Render the scene. This function can be reused in other effects or callbacks.
	function renderScene(): void {
		renderer.render(scene, camera);
		console.log('🔥 rendered');
	}

	function updateMaterial({ variable, dataUint8 }) {
		console.log('UPDATE MATERIAL FOR ', variable);
		let layer = boxes[variable];

		if (!layer) {
			return;
		}
		// Dispose of the old texture to free up memory.
		layer.material.uniforms.volumeTex.value.dispose();

		// Create a new 3D texture for the volume data.
		let volumeTexture = null;
		if (variable === 'thetavmix') {
			volumeTexture = new THREE.DataTexture(dataUint8, get(volumeSizes)[variable][0], get(volumeSizes)[variable][1]);
		} else {
			volumeTexture = new THREE.Data3DTexture(
				dataUint8,
				get(volumeSizes)[variable][0],
				get(volumeSizes)[variable][1],
				get(volumeSizes)[variable][2]
			);
		}
		volumeTexture.format = THREE.RedFormat;
		volumeTexture.type = THREE.UnsignedByteType;
		volumeTexture.generateMipmaps = false; // Saves memory.
		volumeTexture.minFilter = THREE.LinearFilter; // Better for volume rendering.
		volumeTexture.magFilter = THREE.LinearFilter;
		volumeTexture.needsUpdate = true;

		// Update material uniforms with new texture and parameters.
		layer.material.uniforms.volumeTex.value = volumeTexture;
		console.log(layer.material.uniforms);
		// layer.material.uniforms.opacity.value = 0.1;

		switch (String(variable)) {
			case 'ql':
				layer.material.uniforms.dataScale.value = qlScale;
				layer.material.uniforms.dtScale.value = dtScale;
				layer.material.uniforms.ambientFactor.value = ambientFactor;
				layer.material.uniforms.solarFactor.value = solarFactor;
				layer.material.uniforms.gHG.value = gHG;
				layer.material.uniforms.dataEpsilon.value = dataEpsilon;
				layer.material.uniforms.bottomColor.value = bottomColor;
				layer.material.uniforms.bottomHeight.value = bottomHeight;
				layer.material.uniforms.finalGamma.value = finalGamma;
				layer.material.uniforms.opacity = get(cloudLayer).opacity;
				break;
			case 'qr':
				layer.material.uniforms.dataScale.value = qrScale;
				layer.material.uniforms.dtScale.value = dtScale * 4.0;
				layer.material.uniforms.alphaNorm.value = 2.0;
				layer.material.uniforms.finalGamma.value = finalGamma;
				layer.material.uniforms.opacity = get(rainLayer).opacity;
				break;
		}
	}

	/*
	 * A box in which the 3D volume texture will be rendered.  The box will be
	 * centered at the origin, with X in [-0.5, 0.5] so the width is 1, and
	 * Y (height) and Z (depth) scaled to match.
	 */
	async function addVolumetricRenderingContainer({ variable, dataUint8 }) {
		//const boxGeometry = new THREE.BoxGeometry(get(volumeSize)[0], get(volumeSize)[1], get(volumeSize)[2]);
		// const boxSizeInKm = 33.8; // 33.8 km
		// const boxScale = boxSizeInKm; //  $scaleFactor; // Convert to meters and then apply scale factor to scene units

		const boxZ = get(volumeSizes)[variable][2] / get(volumeSizes)[variable][1];
		// const boxScale = 33800 / $scaleFactor; //  33.8 km in meters in scene units
		const boxGeometry = new THREE.BoxGeometry(1, 1, boxZ);
		let box = new THREE.Mesh(boxGeometry);
		box.position.z = 0.25 + 2000 / $scaleFactor; // 570 meters above the map TODO: calculate this value from the data
		box.renderOrder = 0;

		box.material = await initMaterial({ variable, dataUint8, cameraFar, cameraNear });
		// const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
		// box.material = cubeMaterial;
		boxes[variable] = box;
		updateMaterial({ variable, dataUint8 });
		scene.add(box);
		renderScene();
	}

	async function addPlaneRenderingContainer({ variable, dataUint8 }) {
		//const boxGeometry = new THREE.BoxGeometry(get(volumeSize)[0], get(volumeSize)[1], get(volumeSize)[2]);
		// const boxSizeInKm = 33.8; // 33.8 km
		// const boxScale = boxSizeInKm; // / scaleFactor; // Convert to meters and then apply scale factor to scene units

		//const planeGeometry = new THREE.PlaneGeometry(1.0, 1.0);
		//const planeGeometry = new THREE.PlaneGeometry(1, 1, get(volumeSizes)[variable][0], get(volumeSizes)[variable][1]);
		const planeGeometry = new THREE.PlaneGeometry(1, 1, 1000, 1000);
		planeGeometry.rotateX(Math.PI / 2);

		//planeGeometry.translate(0, 0, 20);
		let plane = new THREE.Points(planeGeometry);
		plane.rotateX(-Math.PI / 2);
		//plane.position.z = 2000 / scaleFactor; // 570 meters above the map TODO: calculate this value from the data
		plane.renderOrder = 0;
		plane.position.z = 0.1;

		plane.material = await initMaterial({ variable, dataUint8 });
		// const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
		// box.material = cubeMaterial;
		boxes[variable] = plane;
		// updateMaterial({ variable, dataUint8 });
		scene.add(plane);
		renderScene();
	}

	onMount(async () => {
		// 3D scene
		create3DScene();

		// Add exmample cube
		// scene.add(addExampleCube());

		// Add example points to the scene
		// scene.add(examplePoints());

		const timing = performance.now();
		// Download first slice of the data and calculate the voxel and volume size. It runs only once.
		for (var variable of visible_boxes) {
			if (variable == 'thetavmix') {
				const {
					dataUint8: vdata,
					store: vstore,
					shape: vshape
				} = await fetchSlice({ currentTimeIndex: 0, variable, dimensions: 3 });
				await getVoxelAndVolumeSize2D(vstore, vshape, variable);
				// await getVoxelAndVolumeSize2D(vstore, vshape, variable);
				await addPlaneRenderingContainer({ variable: variable, dataUint8: vdata });
				// addPlaneRenderingContainer({ variable: variable, dataUint8: vdata });
			} else {
				const { dataUint8: vdata, store: vstore, shape: vshape } = await fetchSlice({ currentTimeIndex: 0, variable });
				await getVoxelAndVolumeSize(vstore, vshape, variable);
				await addVolumetricRenderingContainer({ variable: variable, dataUint8: vdata });
			}
		}
		for (var variable of visible_boxes) {
			var dimensions = variable == 'thetavmix' ? 3 : 4;
			fetchAllSlices({ variable, dimensions: dimensions });
		}
		downloadedTime.set(Math.round(performance.now() - timing));
		console.log('⏰ data downloaded and displayed in:', Math.round(performance.now() - timing), 'ms');
	});

	// Update the material when the currentTimeIndex changes
	currentTimeIndex.subscribe((index) => {
		const data = get(allTimeSlices)[index];
		if (data) {
			for (const variable of visible_boxes) {
				updateMaterial({ variable, dataUint8: data[variable] });
			}
			/*
			updateMaterial({ variable: 'ql', dataUint8: data['ql'] });
			updateMaterial({ variable: 'qr', dataUint8: data['qr'] });
			updateMaterial({ variable: 'thetavmix', dataUint8: data['thetavmix'] });
		*/
		}
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

		<button class="btn" on:click={toggleGrid}>
			<input type="checkbox" bind:checked={showGrid} id="gridCheckbox" />
			<label class="pointer-events-none" for="gridCheckbox"> Show Grid </label>
		</button>
	</div>
</div>
<canvas class="w-full h-full" bind:this={canvas} />
<div class="fixed right-0 z-100">{$cloudLayer.opacity}</div>
<div class="fixed right-10 z-100">{$cloudLayer.enabled}</div>
