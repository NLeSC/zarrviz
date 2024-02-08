<script lang="ts">
	import { afterUpdate, onMount } from 'svelte';
	import * as THREE from 'three';
	import { openArray, HTTPStore, create } from 'zarr';
	import CameraControls from 'camera-controls';
	import vertexShaderVolume from '$lib/shaders/volume.vert';
	import fragmentShaderVolume from '$lib/shaders/volume.frag';
	import { makeCloudTransferTex } from '$lib/utils/makeCloudTransferTex';
	import { getBoxSize } from '$lib/utils/Utils';
	import type { PersistenceMode } from 'zarr/types/types';
	import DropFolder from '$lib/components/DropFolder.svelte';

	// import examplePoints from '$lib/components/3DVolumetric/examplePoints';

	CameraControls.install({ THREE: THREE });
	// Other variables and refs

	export let timeSliceIndex = 0;
	// let dataUint8: Uint8Array = new Uint8Array(0);
	// let voxelSize: number[]; // = //[100, 100, 37.46];
	// let volumeSize: number[]; // = //[1536, 1536, 123];
	// const zarrArray = await openArray({ store: 'http://localhost:5173/data/ql.zarr' });

	let cameraControls: CameraControls | null = null;
	let canvas: HTMLElement;
	let scene: THREE.Scene;
	let camera: THREE.PerspectiveCamera;
	let renderer: THREE.WebGLRenderer;

	// Be caruful with these valies, they can clip the date in the 3D scene
	let cameraNear = 0.1;
	let cameraFar = 10000.0;
	let cameraFovDegrees = 45.0;

	let dtScale: number = 1.0;
	let inScatFactor: number = 0.06;
	let qLScale: number = 0.00446;
	let gHG: number = 0.8;
	let dataEpsilon: number = 1e-5;
	let bottomColor: number[] = [0.0, 0.0005, 0.0033];

	// Run only once at mount
	const transferTexture = makeCloudTransferTex();

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

	function addExampleCube() {
		// Create a cube
		const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
		const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
		const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
		cube.position.set(-1, 0, 0); // Set the position of the cube
		return cube; // Add the cube to the scene
	}

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
		camera.position.set(0, -2, 1.7);
		cameraControls = new CameraControls(camera, canvas);

		// renderer.setSize(window.innerWidth, window.innerHeight); // Set the size of the canvas
		renderer.setClearAlpha(0); // Make the canvas transparent

		//
		// Add an axes helper to the scene to help with debugging.
		//
		const axesHelper = new THREE.AxesHelper(5);
		scene.add(axesHelper);
		//
		// Add a grid to the scene to help visualize camera movement.
		//
		const gridHelper = new THREE.GridHelper(50, 50);
		gridHelper.position.y = -1;
		scene.add(gridHelper);

		//
		// Add a plane with the Map to the scene
		//
		// scene.add(createPlaneMesh({ width: 100, height: 100, depth: 37.46699284324961 }));

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
			renderer.setSize(parent.innerWidth, parent.innerHeight);
			camera.aspect = parent.innerWidth / parent.innerHeight;
			camera.updateProjectionMatrix();
		}
		window.addEventListener('resize', resize);
		resize();
		animate();

		console.log('🔋 3d scene created');
	}

	async function initMaterial({ dataUint8, boxSize, volumeSize, voxelSize }): Promise<THREE.Material> {
		const volumeTexture = new THREE.Data3DTexture(dataUint8, volumeSize[0], volumeSize[1], volumeSize[2]);
		volumeTexture.format = THREE.RedFormat;
		volumeTexture.type = THREE.UnsignedByteType;
		// Disabling mimpaps saves memory.
		volumeTexture.generateMipmaps = false;
		// Linear filtering disables LODs, which do not help with volume rendering.
		volumeTexture.minFilter = THREE.LinearFilter;
		volumeTexture.magFilter = THREE.LinearFilter;
		volumeTexture.needsUpdate = true;

		const boxMaterial = new THREE.ShaderMaterial({
			vertexShader: vertexShaderVolume,
			fragmentShader: fragmentShaderVolume,
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 1.0,
			uniforms: {
				boxSize: new THREE.Uniform(boxSize),
				volumeTex: new THREE.Uniform(volumeTexture),
				voxelSize: new THREE.Uniform(voxelSize),
				sunLightDir: new THREE.Uniform(sunLight.position),
				sunLightColor: new THREE.Uniform(lightColorV),
				ambientLightColor: new THREE.Uniform(ambientLightColorV),
				near: new THREE.Uniform(cameraNear),
				far: new THREE.Uniform(cameraFar),
				// The following are set separately, since they are based on `props` values that can
				// change often, and should not trigger complete re-initialization.
				transferTex: new THREE.Uniform(null),
				dtScale: new THREE.Uniform(0),
				inScatFactor: new THREE.Uniform(0),
				qLScale: new THREE.Uniform(0),
				gHG: new THREE.Uniform(0),
				dataEpsilon: new THREE.Uniform(0),
				bottomColor: new THREE.Uniform(new THREE.Vector3(0.0, 0.0005, 0.0033)),
				finalGamma: new THREE.Uniform(0)
			}
		});
		return boxMaterial;
	}

	// Render the scene. This function can be reused in other effects or callbacks.
	function renderScene(): void {
		renderer.render(scene, camera);
		console.log('🔥 rendered');
	}

	//
	// Create and add  plane mesh to the scene to hold the Map texture
	//
	function createPlaneMesh({ width = 100, height = 100, depth = 37.46699284324961 }): THREE.Mesh {
		const textureLoader = new THREE.TextureLoader();
		const texture = textureLoader.load('/maps/nl_map 50m per pixel.webp');
		texture.encoding = THREE.sRGBEncoding;
		// Create a plane geometry and mesh
		const planeGeometry = new THREE.PlaneGeometry(width * 4, height * 4);
		const planeMaterial = new THREE.MeshBasicMaterial({
			map: texture,
			side: THREE.DoubleSide,
			envMap: null
		});
		const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);

		planeMesh.position.set(-width / 1000, -height / 1000, depth * -3); // Adjust position as needed
		// planeMesh.position.set(0, 0, 0); // Adjust position as needed

		return planeMesh;
	}

	async function getVoxelAndVolumeSize({ store, shape, path, mode }) {
		// if (timeSliceIndex === 0) {
		const zarrxvals = await openArray({ store, path: 'xt', mode: 'r' });
		const zarryvals = await openArray({ store, path: 'yt', mode: 'r' });
		const zarrzvals = await openArray({ store, path: 'zt', mode: 'r' });
		const xvals = await zarrxvals.getRaw([null]);
		const yvals = await zarryvals.getRaw([null]);
		const zvals = await zarrzvals.getRaw([null]);

		const xvalues = xvals.data;
		const dx = xvalues[1] - xvalues[0];
		const yvalues = yvals.data;
		const dy = yvalues[1] - yvalues[0];
		const zvalues = zvals.data;
		let sumDifferences = 0;

		for (let i = 1; i < zvalues.length; i++) {
			sumDifferences += Math.abs(zvalues[i] - zvalues[i - 1]);
		}
		const dz = sumDifferences / (zvalues.length - 1);
		// console.log('I calculated ', dx, dy, dz);
		// }

		const voxelSize = [dx, dy, dz]; // [1536, 1536, 123]
		const volumeSize = [shape[1], shape[2], shape[0]]; // [100, 100, 37.46699284324961]

		const [boxWidth, boxHeight, boxDepth] = getBoxSize(volumeSize, voxelSize);
		const boxSize = new THREE.Vector3(boxWidth, boxHeight, boxDepth);
		// console.log(`Voxel size ${voxelSize[0]}, ${voxelSize[1]}, ${voxelSize[2]}`);
		// console.log(`Box size ${boxWidth}, ${boxHeight}, ${boxDepth}`);
		return { voxelSize, volumeSize, boxSize };
	}

	async function downloadZarrPoints({
		timeSliceIndex = 0,
		url = 'http://localhost:5173/data/ql.zarr',
		path = 'ql',
		mode = 'r' as PersistenceMode
	}) {
		// Create an HTTPStore pointing to the base of your Zarr hierarchy
		const store = new HTTPStore(url, {
			fetchOptions: { redirect: 'follow', mode: 'no-cors', credentials: 'include' }
		});
		const zarrdata = await openArray({ store, path, mode });

		const { data, strides, shape } = await zarrdata.getRaw([timeSliceIndex, null, null, null]);

		return { dataUint8: data, strides, shape, store };
		// renderScene();
		//
		//
		//
		// We have the data and the size of the volume here
		//
		//
		//
	}

	function updateMaterial({ dataUint8, volumeSize, box }) {
		// Dispose of the old texture to free up memory.
		box.material.uniforms.volumeTex.value.dispose();

		// Create a new 3D texture for the volume data.
		const volumeTexture = new THREE.Data3DTexture(dataUint8, volumeSize[0], volumeSize[1], volumeSize[2]);
		volumeTexture.format = THREE.RedFormat;
		volumeTexture.type = THREE.UnsignedByteType;
		volumeTexture.generateMipmaps = false; // Saves memory.
		volumeTexture.minFilter = THREE.LinearFilter; // Better for volume rendering.
		volumeTexture.magFilter = THREE.LinearFilter;
		volumeTexture.needsUpdate = true;

		// Update material uniforms with new texture and parameters.
		box.material.uniforms.volumeTex.value = volumeTexture;
		// box.material.uniforms.transferTex.value = transferFunctionTex;
		box.material.uniforms.transferTex.value = transferTexture;
		box.material.uniforms.dtScale.value = dtScale;
		box.material.uniforms.inScatFactor.value = inScatFactor;
		box.material.uniforms.qLScale.value = qLScale;
		box.material.uniforms.gHG.value = gHG;
		box.material.uniforms.dataEpsilon.value = dataEpsilon;
		box.material.uniforms.bottomColor.value = bottomColor;
		box.material.uniforms.finalGamma.value = finalGamma;
	}

	/* A box in which the 3D volume texture will be rendered.  The box will be
	 * centered at the origin, with X in [-0.5, 0.5] so the width is 1, and
	 * Y (height) and Z (depth) scaled to match.
	 */
	async function addVolumetricRenderingContainer({ dataUint8, volumeSize, boxSize, voxelSize }) {
		const boxGeometry = new THREE.BoxGeometry(volumeSize[0], volumeSize[1], volumeSize[2]);
		const box = new THREE.Mesh(boxGeometry);
		scene.add(box);

		box.material = await initMaterial({ dataUint8, volumeSize, boxSize, voxelSize });

		updateMaterial({ dataUint8, volumeSize, box });
		// renderScene();
		// initMaterial({ dataUint8, volumeSize, boxSize });
	}

	onMount(async () => {
		// 3D scene
		create3DScene();

		// Add exmample cube
		// scene.add(addExampleCube());

		// Add the points to the scene
		// scene.add(examplePoints());

		const timing = performance.now();
		// Download data
		const { dataUint8, store, shape } = await downloadZarrPoints({ timeSliceIndex });
		// Get voxel and volume size
		const { voxelSize, volumeSize, boxSize } = await getVoxelAndVolumeSize({ store, shape });

		// Add box container for the data
		addVolumetricRenderingContainer({ dataUint8, volumeSize, boxSize, voxelSize });

		console.log('⏰ performed in:', Math.round(performance.now() - timing), 'ms');
	});
	afterUpdate(() => {
		console.log('🎹 updated index', timeSliceIndex);
	});
</script>

<DropFolder />
<canvas class="w-full h-full" bind:this={canvas} />
