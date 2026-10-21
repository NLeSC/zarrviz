<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import * as THREE from 'three';
	import DebugButtons from './DebugButtons.svelte';

	import { cloudLayerSettings, rainLayerSettings, temperatureLayerSettings, showGrid, 
		numTimes, currentTimeIndex, currentStepIndex, subStepsPerFrame, wind, multiVariableStore, 
		dataRenderLayers} from '../stores/viewer.store';
	import { create3DScene, scene, renderer, camera, renderScene, updateLODCallback, setUpdateLODCallback } from '../sceneSetup/create3DScene';

	import { dataSetup } from '../fetchAndPrepareData/dataSetup';
	import { createGridHelper } from '../sceneSetup/createGridHelper';

	import { get, writable } from 'svelte/store';
	import type { RemoteDataLayer } from '../sceneSetup/remoteDataLayer';
	import type { CloudLayer } from '../sceneSetup/cloudLayer';
	import { cloudDetailAmount } from '../sceneSetup/boxSetup';

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
			const qlLevel = dataRenderLayers.ql.lod ? dataRenderLayers.ql.lod.getCurrentLevel() : 0;
			const qlLayer = dataRenderLayers.ql.layers ? dataRenderLayers.ql.layers[qlLevel] : null;
			qlLayer && (qlLayer.updateUniforms({uTransparency: $cloudLayerSettings.opacity / 100}));
			const qrLevel = dataRenderLayers.qr.lod ? dataRenderLayers.qr.lod.getCurrentLevel() : 0;
			const qrLayer = dataRenderLayers.qr.layers ? dataRenderLayers.qr.layers[qrLevel] : null;
			qrLayer && (qrLayer.updateUniforms({uTransparency: $rainLayerSettings.opacity / 100}));
			const thetavmixLevel = dataRenderLayers.thetavmix.lod ? dataRenderLayers.thetavmix.lod.getCurrentLevel() : 0;
			const thetavmixLayer = dataRenderLayers.thetavmix.layers ? dataRenderLayers.thetavmix.layers[thetavmixLevel] : null;
			thetavmixLayer &&
				(thetavmixLayer.updateUniforms({uTransparency: $temperatureLayerSettings.opacity / 100}));

			// Enable and disable the layers
			updateLayerVisibility(dataRenderLayers.qr, qrLayer, $rainLayerSettings.enabled);
			updateLayerVisibility(dataRenderLayers.ql, qlLayer, $cloudLayerSettings.enabled);
			updateLayerVisibility(dataRenderLayers.thetavmix, thetavmixLayer, $temperatureLayerSettings.enabled);

			// Render the scene
			renderScene();
		}
	}

	// When a variable has multiple LOD levels, only the shared THREE.LOD container is ever
	// added to the scene; the per-level meshes are its children, not direct scene children.
	function updateLayerVisibility(
		layerInfo: { layers: RemoteDataLayer[]; lod: THREE.LOD },
		layer: RemoteDataLayer,
		enabled: boolean
	) {
		if (layer === undefined) return;
		const renderObject: THREE.Object3D = layerInfo.lod ?? layer.getRenderObject();
		if (enabled){
			layer.update(get(currentTimeIndex));
			layer.displace(get(currentStepIndex), subStepsPerFrame, wind);
			scene.add(renderObject);
		} else {
			scene.remove(renderObject);
		}
	}

	let lastDetailAmount = -1;

	function updateCloudDetail() {
		const finestCloudLayer = dataRenderLayers.ql.layers[0] as CloudLayer | undefined;
		if (!finestCloudLayer) return;
		const amount = cloudDetailAmount(camera.position.length() / camera.zoom);
		if (amount === lastDetailAmount) return;
		lastDetailAmount = amount;
		finestCloudLayer.setDetailAmount(amount);
	}

	function updateLOD() {
		updateCloudDetail();
		const qlLevel = dataRenderLayers.ql.lod ? dataRenderLayers.ql.lod.getCurrentLevel() : 0;
		if (qlLevel !== dataRenderLayers.ql.currentLODLevel) {
			const previousQlLayer = dataRenderLayers.ql.layers[dataRenderLayers.ql.currentLODLevel];
			const interimDataTexture = previousQlLayer.getDataTexture();
			// Once the new level has its own real texture, the previous level's texture
			// (only kept alive here as an interim placeholder) can be freed.
			dataRenderLayers.ql.layers[qlLevel].update(get(currentTimeIndex), interimDataTexture)
				.then(() => previousQlLayer.disposeTexture());
			const qlLayer = dataRenderLayers.ql.layers ? dataRenderLayers.ql.layers[qlLevel] : null;
			qlLayer && qlLayer.update(get(currentTimeIndex)) && qlLayer.displace(get(currentStepIndex), subStepsPerFrame, wind);
			dataRenderLayers.ql.currentLODLevel = qlLevel;
		}
		const qrLevel = dataRenderLayers.qr.lod ? dataRenderLayers.qr.lod.getCurrentLevel() : 0;
		if (qrLevel !== dataRenderLayers.qr.currentLODLevel) {
			const previousQrLayer = dataRenderLayers.qr.layers[dataRenderLayers.qr.currentLODLevel];
			dataRenderLayers.qr.layers[qrLevel].update(get(currentTimeIndex))
				.then(() => previousQrLayer.disposeTexture());
			const qrLayer = dataRenderLayers.qr.layers ? dataRenderLayers.qr.layers[qrLevel] : null;
			qrLayer && qrLayer.update(get(currentTimeIndex)) && qrLayer.displace(get(currentStepIndex), subStepsPerFrame, wind);
			dataRenderLayers.qr.currentLODLevel = qrLevel;
		}
		const thetavmixLevel = dataRenderLayers.thetavmix.lod ? dataRenderLayers.thetavmix.lod.getCurrentLevel() : 0;
		if (thetavmixLevel !== dataRenderLayers.thetavmix.currentLODLevel) {
			const previousThetavmixLayer = dataRenderLayers.thetavmix.layers[dataRenderLayers.thetavmix.currentLODLevel];
			dataRenderLayers.thetavmix.layers[thetavmixLevel].update(get(currentTimeIndex))
				.then(() => previousThetavmixLayer.disposeTexture());
			const thetavmixLayer = dataRenderLayers.thetavmix.layers ? dataRenderLayers.thetavmix.layers[thetavmixLevel] : null;
			thetavmixLayer && thetavmixLayer.update(get(currentTimeIndex)) && thetavmixLayer.displace(get(currentStepIndex), subStepsPerFrame, wind);
			dataRenderLayers.thetavmix.currentLODLevel = thetavmixLevel;
		}
	}

	setUpdateLODCallback(updateLOD);

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
		const presentVariables = await dataSetup(Object.keys(dataRenderLayers), scene, multiVariableStore);
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

<div class="relative w-full h-full">
	<div class="fixed top-0 left-0">
		<a href="/"><button class="btn">← Select dataset</button></a>

		<button class="btn" on:click={() => toggleGrid()}>
			<input type="checkbox" bind:checked={$showGrid} id="gridCheckbox" />
			<label class="pointer-events-none" for="gridCheckbox"> Show Grid </label>
		</button>
		<DebugButtons />
	</div>
	<canvas class="w-full h-full" bind:this={canvas} />
	<div class="absolute bottom-2 left-2 z-10 rounded bg-black/30 px-2 py-1 text-xs text-white">
		<a
			href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
			target="_blank"
			rel="noreferrer"
			class="hover:underline"
		>
			Sentinel-2 cloudless by EOX (2021) · CC BY-NC-SA 4.0
		</a>
	</div>
</div>
