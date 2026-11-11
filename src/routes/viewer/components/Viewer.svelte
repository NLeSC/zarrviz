<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import * as THREE from 'three';
	import DebugButtons from './DebugButtons.svelte';

	import {
		cloudLayerSettings,
		rainLayerSettings,
		temperatureLayerSettings,
		showGrid,
		numTimes,
		currentTimeIndex,
		currentStepIndex,
		subStepsPerFrame,
		wind,
		multiVariableStore,
		dataRenderLayers,
		timeOfDay
	} from '../stores/viewer.store';
	import {
		create3DScene,
		scene,
		renderer,
		camera,
		renderScene,
		cloudShadow,
		skyDome,
		enterGroundView,
		exitGroundView,
		turnGroundView,
		dispose3DScene,
		setUpdateCloudShadowCallback,
		setUpdateLODCallback
	} from '../sceneSetup/create3DScene';

	import { dataSetup } from '../fetchAndPrepareData/dataSetup';
	import { createGridHelper } from '../sceneSetup/createGridHelper';

	import { get, writable } from 'svelte/store';
	import type { RemoteDataLayer } from '../sceneSetup/remoteDataLayer';
	import type { CloudLayer } from '../sceneSetup/cloudLayer';
	import { sunLightingAt } from '../sceneSetup/timeOfDay';
	import { cloudDetailAmount } from '../sceneSetup/boxSetup';

	let canvas: HTMLElement;

	let gridHelper: THREE.GridHelper;
	let groundView = false;
	let placingGroundView = false;
	let draggingGroundIcon = false;
	let ready = false;
	let groundError = '';
	let lookPointer: { id: number; x: number; y: number } | null = null;

	function setGroundDepthTest(enabled: boolean) {
		for (const info of Object.values(dataRenderLayers)) {
			for (const layer of info.layers) {
				layer.getMaterial().depthTest = enabled;
			}
		}
	}

	function placeGroundView(x: number, y: number) {
		if (!ready) return;
		groundError = '';
		try {
			if (
				!enterGroundView(x, y, canvas, () => {
					groundError = 'Some terrain or satellite tiles could not be loaded. Check your connection.';
				})
			) {
				groundError = 'Choose a visible point on the map.';
				return;
			}
		} catch (error) {
			console.error('Failed to start ground view:', error);
			groundError = 'Could not start ground view in this browser.';
			return;
		}
		groundView = true;
		placingGroundView = false;
		gridHelper.visible = false;
		setGroundDepthTest(true);
		skyDome.showSun(true);
		renderScene();
	}

	function leaveGroundView() {
		exitGroundView();
		groundView = false;
		groundError = '';
		lookPointer = null;
		gridHelper.visible = get(showGrid);
		setGroundDepthTest(false);
		skyDome.showSun(false);
		renderScene();
	}

	function startLook(event: PointerEvent) {
		if (!groundView || event.button !== 0) return;
		lookPointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
		canvas.setPointerCapture(event.pointerId);
	}

	function moveLook(event: PointerEvent) {
		if (!lookPointer || event.pointerId !== lookPointer.id) return;
		turnGroundView(event.clientX - lookPointer.x, event.clientY - lookPointer.y);
		lookPointer.x = event.clientX;
		lookPointer.y = event.clientY;
	}

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
			qlLayer && qlLayer.updateUniforms({ uTransparency: $cloudLayerSettings.opacity / 100 });
			const qrLevel = dataRenderLayers.qr.lod ? dataRenderLayers.qr.lod.getCurrentLevel() : 0;
			const qrLayer = dataRenderLayers.qr.layers ? dataRenderLayers.qr.layers[qrLevel] : null;
			qrLayer && qrLayer.updateUniforms({ uTransparency: $rainLayerSettings.opacity / 100 });
			const thetavmixLevel = dataRenderLayers.thetavmix.lod ? dataRenderLayers.thetavmix.lod.getCurrentLevel() : 0;
			const thetavmixLayer = dataRenderLayers.thetavmix.layers
				? dataRenderLayers.thetavmix.layers[thetavmixLevel]
				: null;
			thetavmixLayer && thetavmixLayer.updateUniforms({ uTransparency: $temperatureLayerSettings.opacity / 100 });

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
		if (enabled) {
			layer.update(get(currentTimeIndex));
			layer.displace(get(currentStepIndex), subStepsPerFrame, wind);
			scene.add(renderObject);
		} else {
			scene.remove(renderObject);
		}
	}

	// Time of day: sun direction/colour for the clouds, ground tint and the sky background colour
	function applyTimeOfDay(hour: number) {
		if (!scene) return;
		const lighting = sunLightingAt(hour);
		skyDome?.setTimeOfDaySky(lighting.background);
		skyDome?.setSun(lighting);
		cloudShadow?.setGroundTint(lighting.groundTint);
		if (skyDome) cloudShadow?.setHazeColor(skyDome.horizonColor);
		const activeLevel = dataRenderLayers.ql.lod ? dataRenderLayers.ql.lod.getCurrentLevel() : 0;
		dataRenderLayers.ql.layers.forEach((layer, level) =>
			(layer as CloudLayer).setSunLighting(lighting, level === activeLevel)
		);
		renderScene();
	}

	$: applyTimeOfDay($timeOfDay);

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
			dataRenderLayers.ql.layers[qlLevel]
				.update(get(currentTimeIndex), interimDataTexture)
				.then(() => previousQlLayer.disposeTexture());
			const qlLayer = dataRenderLayers.ql.layers ? dataRenderLayers.ql.layers[qlLevel] : null;
			qlLayer &&
				qlLayer.update(get(currentTimeIndex)) &&
				qlLayer.displace(get(currentStepIndex), subStepsPerFrame, wind);
			dataRenderLayers.ql.currentLODLevel = qlLevel;
		}
		const qrLevel = dataRenderLayers.qr.lod ? dataRenderLayers.qr.lod.getCurrentLevel() : 0;
		if (qrLevel !== dataRenderLayers.qr.currentLODLevel) {
			const previousQrLayer = dataRenderLayers.qr.layers[dataRenderLayers.qr.currentLODLevel];
			dataRenderLayers.qr.layers[qrLevel].update(get(currentTimeIndex)).then(() => previousQrLayer.disposeTexture());
			const qrLayer = dataRenderLayers.qr.layers ? dataRenderLayers.qr.layers[qrLevel] : null;
			qrLayer &&
				qrLayer.update(get(currentTimeIndex)) &&
				qrLayer.displace(get(currentStepIndex), subStepsPerFrame, wind);
			dataRenderLayers.qr.currentLODLevel = qrLevel;
		}
		const thetavmixLevel = dataRenderLayers.thetavmix.lod ? dataRenderLayers.thetavmix.lod.getCurrentLevel() : 0;
		if (thetavmixLevel !== dataRenderLayers.thetavmix.currentLODLevel) {
			const previousThetavmixLayer = dataRenderLayers.thetavmix.layers[dataRenderLayers.thetavmix.currentLODLevel];
			dataRenderLayers.thetavmix.layers[thetavmixLevel]
				.update(get(currentTimeIndex))
				.then(() => previousThetavmixLayer.disposeTexture());
			const thetavmixLayer = dataRenderLayers.thetavmix.layers
				? dataRenderLayers.thetavmix.layers[thetavmixLevel]
				: null;
			thetavmixLayer &&
				thetavmixLayer.update(get(currentTimeIndex)) &&
				thetavmixLayer.displace(get(currentStepIndex), subStepsPerFrame, wind);
			dataRenderLayers.thetavmix.currentLODLevel = thetavmixLevel;
		}
	}

	setUpdateLODCallback(updateLOD);

	setUpdateCloudShadowCallback(() => {
		const level = dataRenderLayers.ql.lod ? dataRenderLayers.ql.lod.getCurrentLevel() : 0;
		const layer = dataRenderLayers.ql.layers?.[level] ?? null;
		cloudShadow.update(renderer, get(cloudLayerSettings).enabled ? layer : null);
	});

	// Toggle showGrid helper
	export function toggleGrid() {
		showGrid.update(($showGrid) => !$showGrid);
		gridHelper.visible = $showGrid; // Assuming gridHelper is your grid object
	}

	onMount(async () => {
		const timing = performance.now();

		// Create the base 3D scene (camera, renderer, etc.)
		await create3DScene({ canvas });
		applyTimeOfDay(get(timeOfDay));

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
		applyTimeOfDay(get(timeOfDay));
		ready = true;

		// Add the example points to the scene
		// scene.add(examplePoints());
		downloadedTime.set(Math.round(performance.now() - timing));
		renderer.render(scene, camera);
		console.log('⏰ data downloaded and displayed in:', Math.round(performance.now() - timing), 'ms');
	});

	onDestroy(() => {
		// Clean up Three.js resources
		dispose3DScene();
		currentTimeIndex.set(0);
		multiVariableStore.clear();
	});
</script>

<div class="relative w-full h-full">
	<div class="fixed top-0 left-0">
		<a href="/"><button class="btn">← Select dataset</button></a>

		{#if !groundView}
			<button class="btn" on:click={() => toggleGrid()}>
				<input type="checkbox" bind:checked={$showGrid} id="gridCheckbox" />
				<label class="pointer-events-none" for="gridCheckbox"> Show Grid </label>
			</button>
			<DebugButtons />
		{/if}
	</div>
	<canvas
		class="w-full h-full"
		class:cursor-crosshair={placingGroundView}
		class:cursor-move={groundView}
		style:touch-action={groundView ? 'none' : 'auto'}
		bind:this={canvas}
		on:dragover={(event) => {
			if (draggingGroundIcon) event.preventDefault();
		}}
		on:drop={(event) => {
			if (!draggingGroundIcon) return;
			event.preventDefault();
			draggingGroundIcon = false;
			placeGroundView(event.clientX, event.clientY);
		}}
		on:click={(event) => {
			if (placingGroundView) placeGroundView(event.clientX, event.clientY);
		}}
		on:pointerdown={startLook}
		on:pointermove={moveLook}
		on:pointerup={() => (lookPointer = null)}
		on:pointercancel={() => (lookPointer = null)}
		on:lostpointercapture={() => (lookPointer = null)}
	/>
	<div class="absolute top-20 right-3 z-10 flex flex-col items-end gap-2">
		{#if groundView}
			<button class="btn btn-sm" on:click={leaveGroundView}>Return to map</button>
			<span class="rounded bg-black/70 px-2 py-1 text-xs text-white">Drag to look around</span>
		{:else}
			<button
				class="btn btn-sm"
				class:btn-primary={placingGroundView}
				disabled={!ready}
				draggable="true"
				aria-label="Ground view: drag onto the map or select then click a location"
				on:click={() => (placingGroundView = !placingGroundView)}
				on:dragstart={(event) => {
					draggingGroundIcon = true;
					event.dataTransfer?.setData('text/plain', 'ground-view');
				}}
				on:dragend={() => (draggingGroundIcon = false)}>📍 Ground view</button
			>
			{#if placingGroundView}
				<span class="rounded bg-black/70 px-2 py-1 text-xs text-white">Click a location on the map</span>
			{/if}
		{/if}
		{#if groundError}
			<p role="alert" class="max-w-xs rounded bg-red-900 px-2 py-1 text-sm text-white">{groundError}</p>
		{/if}
	</div>
	<div class="absolute bottom-2 left-2 z-10 rounded bg-black/30 px-2 py-1 text-xs text-white">
		<a
			href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
			target="_blank"
			rel="noreferrer"
			class="hover:underline"
		>
			Sentinel-2 cloudless by EOX (2021) · CC BY-NC-SA 4.0
		</a>
		{#if groundView}
			<details class="max-w-xl">
				<summary class="cursor-pointer">Mapzen terrain data sources</summary>
				<p>
					ArcticDEM: DigitalGlobe imagery, NSF awards 1043681, 1559691, 1542736; Australia: © Commonwealth of Australia
					(Geoscience Australia) 2017; Austria: © offene Daten Österreichs; Canada: Open Government Licence – Canada;
					Europe: Copernicus data and information funded by the European Union, EU-DEM; global ETOPO1: NOAA; Mexico:
					INEGI, Continental relief, 2016; New Zealand: © Land Information New Zealand and the New Zealand Government
					2011; Norway: © Kartverket; UK: © Environment Agency 2015; US 3DEP and global GMTED2010 and SRTM: U.S.
					Geological Survey.
					<a
						href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md"
						target="_blank"
						rel="noreferrer"
						class="underline">Source details</a
					>
				</p>
			</details>
		{/if}
	</div>
</div>
