<script lang="ts">
	import { onMount } from 'svelte';
	import * as THREE from 'three';

	let container: HTMLElement;

	async function readAndProcessFile() {
		// Use the File System Access API to read a file
		const fileHandle = await window.showOpenFilePicker();
		const file = await fileHandle[0].getFile();
		const arrayBuffer = await file.arrayBuffer();

		// Dynamically import zarr-js to ensure it works in a Svelte component
		const Zarr = await import('zarr-js');
		const z = new Zarr.default();

		// Load your data into zarr-js
		const zarray = z.openArray({ data: arrayBuffer });

		// Prepare the data for Three.js visualization
		const data = new Uint8Array(zarray.data.buffer);
		const texture = new THREE.DataTexture(data, zarray.shape[0], zarray.shape[1], THREE.RedFormat);
		texture.needsUpdate = true;

		// Initialize Three.js scene
		initThreeJS(texture);
	}

	function initThreeJS(texture: THREE.DataTexture) {
		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);

		const renderer = new THREE.WebGLRenderer();
		renderer.setSize(container.clientWidth, container.clientHeight);
		container.appendChild(renderer.domElement);

		// Add your texture to the scene
		const geometry = new THREE.PlaneGeometry();
		const material = new THREE.MeshBasicMaterial({ map: texture });
		const plane = new THREE.Mesh(geometry, material);
		scene.add(plane);

		camera.position.z = 5;

		function animate() {
			requestAnimationFrame(animate);
			renderer.render(scene, camera);
		}

		animate();
	}

	// Optional: Function to trigger file reading and processing
	function handleLoadData() {
		readAndProcessFile().catch(console.error);
	}

	onMount(() => {
		// Initialize or load data here if needed
	});
</script>

<svelte:head>
	<title>Zarr Data Visualizer</title>
</svelte:head>

<div bind:this={container} class="visualizer-container">
	<button on:click={handleLoadData}>Load Data</button>
</div>

<style>
	.visualizer-container {
		width: 100%; /* Adjust as necessary */
		height: 100vh; /* Adjust as necessary */
		position: relative;
	}
	button {
		position: absolute;
		z-index: 10;
		top: 20px;
		right: 20px;
	}
</style>
