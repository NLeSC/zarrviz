<script lang="ts">
	import DebugButtons from './DebugButtons.svelte';
	import { onDestroy, onMount } from 'svelte';
	import * as THREE from 'three';
	import CameraControls from 'camera-controls';
	import vertexShaderVolume from '$lib/shaders/volume.vert';
	import fragmentShaderVolume from '$lib/shaders/volume_cloud.frag';
	import fragmentShaderVolumeTransfer from '$lib/shaders/volume_transfer.frag';
	import vertexShaderSurface from '$lib/shaders/surface.vert';
	import fragmentShaderSurfaceHeatMap from '$lib/shaders/surface_heatmap.frag';
	import { makeRainTransferTex } from '$lib/utils/makeRainTransferTex';
	import { fetchSlice } from './fetchSlice';
	import { fetchAllSlices } from './fetchAllSlices';
	import {
		allTimeSlices,
		getVoxelAndVolumeSize,
		getVoxelAndVolumeSize2D,
		voxelSizes,
		volumeSizes,
		boxSizes,
		currentTimeIndex,
		downloadedTime
	} from '$lib/components/allSlices.store';
	import { get } from 'svelte/store';
	
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
	let dtScale: number = 0.8;
	let ambientFactor: number = 0.0;
	let solarFactor: number = 0.8;
	let qlScale: number = 0.00446;
	let qrScale: number = 0.0035;
	let gHG: number = 0.6;
	let dataEpsilon: number = 1e-10;
	let bottomColor: number[] = [0.0, 0.0005, 0.0033];
	let bottomHeight: number = 675.0;

	let gridHelper: THREE.GridHelper;
	let showGrid = true; // Variable to track the grid's visibility

	let boxes = {};

	// Run only once at mount
	const transferTexture = makeRainTransferTex();

	const sunLightDir = new THREE.Vector3(0.0, 0.5, 0.5);
	const sunLightColor = new THREE.Color(0.99, 0.83, 0.62);
	const sunLight = new THREE.DirectionalLight(sunLightColor.getHex(), 1.0);
	sunLight.position.copy(sunLightDir);

	const seaLightColor = new THREE.Color(0.0, 0.0005, 0.0033);
	const toaLightColor = new THREE.Color(0.0, 0.0002, 0.033);
	const hemisphereLight = new THREE.HemisphereLight(seaLightColor.getHex(), toaLightColor.getHex(), 1.0);
	const lightColor = sunLight.color;
	const lightColorV = new THREE.Vector3(lightColor.r, lightColor.g, lightColor.b);
	const ambientLightColorV = new THREE.Vector3(
		hemisphereLight.color.r,
		hemisphereLight.color.g,
		hemisphereLight.color.b
	);
	const finalGamma = 6.0;
	//const visible_data = ['ql', 'qr', 'thetavmix'];
	const visible_data = ['thetavmix'];

	// 1 unit in the scene = 1000 meters (1 kilometer) in real life
	// Meters of the bounding box of the data
	let scaleFactor = 33800; // TODO: calculate this value from the data

	function toggleGrid() {
		showGrid = !showGrid;
		gridHelper.visible = showGrid; // Assuming gridHelper is your grid object
	}

	function addExampleCube() {
		// Create a cube
		const cubeGeometry = new THREE.BoxGeometry(33, 33, 1);
		const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
		const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
		cube.position.set(-1, 0, 0); // Set the position of the cube
		return cube; // Add the cube to the scene
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
		// camera.position.z = 5; // Adjust as needed
		// camera.position.set(0, -2, 1.7);
		// x: 0, y: -0.935916216369971, z: 0.9359162163699711
		camera.position.set(0, -0.9, 0.9); // Adjusted for scaled scene
		camera.lookAt(new THREE.Vector3(0, 0, 0));
		cameraControls = new CameraControls(camera, canvas);

		// renderer.setSize(window.innerWidth, window.innerHeight); // Set the size of the canvas
		//renderer.setClearAlpha(0); // Make the canvas transparent
		//
		// Add an axes helper to the scene to help with debugging.
		//
		const axesHelper = new THREE.AxesHelper(5);
		scene.add(axesHelper);
		//
		// Add a grid to the scene to help visualize camera movement.
		//
		// const gridHelper = new THREE.GridHelper(5, 5);
		// gridHelper.position.z = -1;
		// scene.add(gridHelper);

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
			renderer.setSize(window.innerWidth, 400);
			camera.aspect = window.innerWidth / 400;
			camera.updateProjectionMatrix();
		}
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

	async function initMaterial({ variable, dataUint8 }): Promise<THREE.Material> {
		let volumeTexture = null;
		if (variable==='thetavmix'){
			volumeTexture = new THREE.DataTexture(
				dataUint8,
				get(volumeSizes)[variable][0],
				get(volumeSizes)[variable][1]
			);
		}
		else {
			volumeTexture = new THREE.Data3DTexture(
				dataUint8,
				get(volumeSizes)[variable][0],
				get(volumeSizes)[variable][1],
				get(volumeSizes)[variable][2]
			);
		}
		volumeTexture.format = THREE.RedFormat;
		volumeTexture.type = THREE.UnsignedByteType;
		// Disabling mimpaps saves memory.
		volumeTexture.generateMipmaps = false;
		// Linear filtering disables LODs, which do not help with volume rendering.
		volumeTexture.minFilter = THREE.LinearFilter;
		volumeTexture.magFilter = THREE.LinearFilter;
		volumeTexture.needsUpdate = true;
		let boxMaterial = null;
		switch(variable){
			case 'ql':
				boxMaterial = new THREE.ShaderMaterial({
					vertexShader: vertexShaderVolume,
					fragmentShader: fragmentShaderVolume,
					side: THREE.DoubleSide,
					transparent: true,
					opacity: 1.0,
					uniforms: {
						boxSize: new THREE.Uniform(get(boxSizes)[variable]),
						volumeTex: new THREE.Uniform(volumeTexture),
						voxelSize: new THREE.Uniform(get(voxelSizes)[variable]),
						sunLightDir: new THREE.Uniform(sunLight.position),
						sunLightColor: new THREE.Uniform(lightColorV),
						ambientLightColor: new THREE.Uniform(ambientLightColorV),
						near: new THREE.Uniform(cameraNear),
						far: new THREE.Uniform(cameraFar),
						// The following are set separately, since they are based on `props` values that can
						// change often, and should not trigger complete re-initialization.
						dtScale: new THREE.Uniform(0),
						ambientFactor: new THREE.Uniform(0),
						solarFactor: new THREE.Uniform(0),
						dataScale: new THREE.Uniform(0),
						gHG: new THREE.Uniform(0),
						dataEpsilon: new THREE.Uniform(0),
						bottomColor: new THREE.Uniform(new THREE.Vector3(0.0, 0.0005, 0.0033)),
						bottomHeight: new THREE.Uniform(0),
						finalGamma: new THREE.Uniform(0)
					}
				});
				break;
			case 'qr':
				boxMaterial = new THREE.ShaderMaterial({
					vertexShader: vertexShaderVolume,
					fragmentShader: fragmentShaderVolumeTransfer,
					side: THREE.DoubleSide,
					transparent: true,
					opacity: 1.0,
					uniforms: {
						boxSize: new THREE.Uniform(get(boxSizes)[variable]),
						volumeTex: new THREE.Uniform(volumeTexture),
						sunLightDir: new THREE.Uniform(sunLight.position),
						sunLightColor: new THREE.Uniform(lightColorV),
						near: new THREE.Uniform(cameraNear),
						far: new THREE.Uniform(cameraFar),
						// The following are set separately, since they are based on `props` values that can
						// change often, and should not trigger complete re-initialization.
						transferTex: new THREE.Uniform(transferTexture),
						dtScale: new THREE.Uniform(0),
						dataScale: new THREE.Uniform(0),
						alphaNorm: new THREE.Uniform(0),
						finalGamma: new THREE.Uniform(0),
						useLighting: new THREE.Uniform(false)
					}
				});
				break;
			case 'thetavmix':
				// create an elevation texture
				boxMaterial = new THREE.ShaderMaterial({
					vertexShader: vertexShaderSurface,
					fragmentShader: fragmentShaderSurfaceHeatMap,
					side: THREE.DoubleSide,
					transparent: true,
					opacity: 1.0,
					clipping: true,
					uniforms: {
						volumeTex: new THREE.Uniform(volumeTexture),
						heightRatio: new THREE.Uniform(0),
						heightBias: new THREE.Uniform(0),
						//gradientTexture: {value: gradientMap}
						colorLow: new THREE.Uniform(new THREE.Vector3(0, 0, 1)),
						colorMid: new THREE.Uniform(new THREE.Vector3(0, 1, 0)),
						colorHigh: new THREE.Uniform(new THREE.Vector3(1, 0, 0))
					},
				});
				break;
			}
		return boxMaterial;
	}

	function updateMaterial({ variable, dataUint8 }) {
		let localBox = boxes[variable];

		if (!localBox) {
			return;
		}
		// Dispose of the old texture to free up memory.
		localBox.material.uniforms.volumeTex.value.dispose();

		// Create a new 3D texture for the volume data.
		let volumeTexture = null;
		if (variable==='thetavmix'){
			volumeTexture = new THREE.DataTexture(
				dataUint8,
				get(volumeSizes)[variable][0],
				get(volumeSizes)[variable][1]
			);
		}
		else {
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
		localBox.material.uniforms.volumeTex.value = volumeTexture;
		switch(String(variable)){
			case "ql":
				localBox.material.uniforms.dataScale.value = qlScale;
				localBox.material.uniforms.dtScale.value = dtScale;
				localBox.material.uniforms.ambientFactor.value = ambientFactor;
				localBox.material.uniforms.solarFactor.value = solarFactor;
				localBox.material.uniforms.gHG.value = gHG;
				localBox.material.uniforms.dataEpsilon.value = dataEpsilon;
				localBox.material.uniforms.bottomColor.value = bottomColor;
				localBox.material.uniforms.bottomHeight.value = bottomHeight;
				localBox.material.uniforms.finalGamma.value = finalGamma;
				break;
			case "qr":
				localBox.material.uniforms.dataScale.value = qrScale;
				localBox.material.uniforms.dtScale.value = dtScale * 4.0;
				localBox.material.uniforms.alphaNorm.value = 2.0;
				localBox.material.uniforms.finalGamma.value = finalGamma;
				break;
		}
	}

	//
	// Create and add  plane mesh to the scene to hold the Map texture
	//
	function createPlaneMesh(): THREE.Mesh {
		const textureLoader = new THREE.TextureLoader();
		const texture = textureLoader.load('/maps/nl_map 50m per pixel.webp');
		texture.encoding = THREE.sRGBEncoding;

		// Scale factor: 50 meters per pixel
		const mapWidth = (5600 * 50) / scaleFactor; // in scene units
		const mapHeight = (6500 * 50) / scaleFactor; // in scene units

		// Create a plane geometry and mesh
		const planeGeometry = new THREE.PlaneGeometry(mapWidth, mapHeight);
		const planeMaterial = new THREE.MeshBasicMaterial({
			map: texture,
//			side: THREE.DoubleSide
		});

		const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);

		// Rotate the plane to align it with the XY plane
		// planeMesh.rotation.x = -Math.PI / 2;

		// Assuming you want the map centered at the origin
		planeMesh.position.set(0, 0, 0);

		return planeMesh;
	}
	//
	// Create and add a grid helper to the scene
	//
	function createGridHelper() {
		const gridSize = Math.max(280000, 325000) / scaleFactor; // in scene units
		const cellSize = 10000 / scaleFactor; // 10 km per cell, in scene units
		const gridDivisionsX = Math.floor(280000 / scaleFactor / cellSize);
		const gridDivisionsY = Math.floor(325000 / scaleFactor / cellSize);

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

	/* A box in which the 3D volume texture will be rendered.  The box will be
	 * centered at the origin, with X in [-0.5, 0.5] so the width is 1, and
	 * Y (height) and Z (depth) scaled to match.
	 */
	 async function addVolumetricRenderingContainer({ variable, dataUint8 }) {
		//const boxGeometry = new THREE.BoxGeometry(get(volumeSize)[0], get(volumeSize)[1], get(volumeSize)[2]);
		// const boxSizeInKm = 33.8; // 33.8 km
		// const boxScale = boxSizeInKm; // / scaleFactor; // Convert to meters and then apply scale factor to scene units

		const boxZ = get(volumeSizes)[variable][2] / get(volumeSizes)[variable][1];
		// const boxScale = 33800 / scaleFactor; //  33.8 km in meters in scene units
		const boxGeometry = new THREE.BoxGeometry(1, 1, boxZ);
		let box = new THREE.Mesh(boxGeometry);
		box.position.z = 0.25 + 2000 / scaleFactor; // 570 meters above the map TODO: calculate this value from the data
		box.renderOrder = 0;

		box.material = await initMaterial({ variable, dataUint8 });
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
		planeGeometry.rotateX(Math.PI/2);

		//planeGeometry.translate(0, 0, 20);
		let plane = new THREE.Points(planeGeometry);
		plane.rotateX(-Math.PI/2);
		//plane.position.z = 2000 / scaleFactor; // 570 meters above the map TODO: calculate this value from the data
		plane.renderOrder = 0;
		plane.position.z = 0.1;


		plane.material = await initMaterial({ variable, dataUint8 });
		// const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
		// box.material = cubeMaterial;
		boxes[variable] = plane;
		updateMaterial({ variable, dataUint8 });
		scene.add(plane);
		renderScene();
	}

	onMount(async () => {
		// scaleFactor = 33800; // TODO: calculate this value from the data
		// 3D scene
		create3DScene();

		// Add exmample cube
		// scene.add(addExampleCube());

		// Add the points to the scene
		// scene.add(examplePoints());

		const timing = performance.now();
		// Download first slice of the data and calculate the voxel and volume size. It runs only once.
		for(var variable of visible_data){
			if(variable == 'thetavmix'){
				const { dataUint8: vdata, store: vstore, shape: vshape } = await fetchSlice({ currentTimeIndex: 0, path: variable, dims: 3 });
				await getVoxelAndVolumeSize2D( vstore, vshape, variable );
				await addPlaneRenderingContainer({ variable: variable, dataUint8: vdata });

			}
			else{
				const { dataUint8: vdata, store: vstore, shape: vshape } = await fetchSlice({ currentTimeIndex: 0, path: variable });
				await getVoxelAndVolumeSize( vstore, vshape, variable );
				await addVolumetricRenderingContainer({ variable: variable, dataUint8: vdata });
			}
		}
		for(var variable of visible_data){
			var dimensions = variable == 'thetavmix' ? 3 : 4;
			fetchAllSlices({ path: variable, dims: dimensions }); //<-------
		}
		downloadedTime.set(Math.round(performance.now() - timing));
		console.log('⏰ data downloaded and displayed in:', Math.round(performance.now() - timing), 'ms');

	});
	// Update the material when the currentTimeIndex changes
	currentTimeIndex.subscribe((index) => {
		const data = get(allTimeSlices)[index];
		if (data) {
			for(var variable of visible_data){
				updateMaterial({ variable: variable, dataUint8: data[variable] });
			}
/*			updateMaterial({ variable: 'ql', dataUint8: data['ql'] });
			updateMaterial({ variable: 'qr', dataUint8: data['qr'] });
			updateMaterial({ variable: 'thetavmix', dataUint8: data['thetavmix'] });
		*/		}
	});

	onDestroy(() => {
		// Clean up Three.js resources
		currentTimeIndex.set(0);
		allTimeSlices.set([]);
	});
</script>

<div class="flex align-middle">
	<a href="/"><button class="btn">← Select dataset</button></a>

	<button class="btn" on:click={toggleGrid}>
		<input type="checkbox" bind:checked={showGrid} id="gridCheckbox" />
		<label class="pointer-events-none" for="gridCheckbox"> Show Grid (10x10km) </label>
	</button>

</div>
<canvas class="w-full h-full" bind:this={canvas} />
<div>Map resolution: 100m per pixel</div>

<DebugButtons {camera} {cameraControls} />
