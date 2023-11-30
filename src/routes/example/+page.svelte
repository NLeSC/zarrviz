<script lang="ts">
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import CameraControls from 'camera-controls';

	CameraControls.install({ THREE: THREE });

	onMount(() => {
		// Set up the scene, camera, and renderer.
		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
		const renderer = new THREE.WebGLRenderer();
		renderer.setSize(window.innerWidth, window.innerHeight);
		document.body.appendChild(renderer.domElement);

		// Set up camera controls to allow camera movement.
		const cameraControls = new CameraControls(camera, renderer.domElement);

		// Create a buffer to store positions of points.
		const numberOfPoints = 1000;
		const positions = new Float32Array(numberOfPoints * 3);
		const dataUint8 = new Uint8Array(numberOfPoints);

		// Populate the position buffer and dataUint8 with random data.
		for (let i = 0; i < numberOfPoints; i++) {
			positions[i * 3] = Math.random() * 2 - 1; // x
			positions[i * 3 + 1] = Math.random() * 2 - 1; // y
			positions[i * 3 + 2] = Math.random() * 2 - 1; // z

			// Fill dataUint8 with random values.
			dataUint8[i] = Math.floor(Math.random() * 255);
		}

		// Create an instance of THREE.BufferGeometry and set the random positions as its attribute.
		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

		// Use THREE.PointsMaterial to create a material for the points. The color can be set as needed.
		const material = new THREE.PointsMaterial({ size: 0.02, vertexColors: false });

		// Create a points object with the geometry and material.
		const points = new THREE.Points(geometry, material);

		// Add the points to the scene.
		scene.add(points);

		// Move the camera out so we can see the points.
		camera.position.z = 5;
		// Create an animate function that will update the renderer every frame.
		let lastTime = performance.now();
		function animate() {
			const time = performance.now();
			const delta = (time - lastTime) / 1000;
			requestAnimationFrame(animate);
			cameraControls.update(delta);
			renderer.render(scene, camera);
			lastTime = time;
		}

		// Start the animation loop.
		animate();
	});
</script>
