<script>
	import * as THREE from 'three';
	import { camera, cameraControls } from '../sceneSetup/create3DScene';
	const distance = 50; // Adjust the distance based on your scene scale

	// More examples here

	// Function to update camera position and look at the center of the cube
	function setCameraView(x, y, z, u = 0, v = -1, w = 0, animate = true) {
		camera.up.set(u, v, w); // This keeps the camera oriented with the world's up direction
		cameraControls.setPosition(x, y, z, animate);
		camera.lookAt(0, 0, 0); // Assuming the cube is at the origin
	}
</script>

<button class="btn btn-sm" onclick="camera_modal.showModal()">Camera Controls</button>
<button class="btn btn-sm" on:click={() => setCameraView(0, 0, distance, 0, 1, 0)}>Up</button>

<button class="btn btn-sm" on:click={() => setCameraView(0, -distance, 0, 0, 1, 0, true)}>Front</button>
<button class="btn btn-sm" on:click={() => setCameraView(0, distance, 0, 0, -1, 0, true)}>Back</button>

<button class="btn btn-sm" on:click={() => setCameraView(distance, 0, 0, 0, 0, 1, true)}>Left</button>
<button class="btn btn-sm" on:click={() => setCameraView(-distance, 0, 0, 0, 0, 1, true)}>Right</button>
<dialog id="camera_modal" class="modal">
	<div class="modal-box">
		<h3 class="font-bold text-lg">Camera Controls!</h3>
		<div class="info p-6">
			<button class="btn btn-sm" on:click={() => cameraControls.zoom(camera.zoom / 2, true)}>Zoom in</button>
			<button class="btn btn-sm" on:click={() => cameraControls.zoom(-camera.zoom / 2, true)}>Zoom out</button>

			<br />
			<button class="btn btn-sm" on:click={() => cameraControls.reset(true)}>reset</button>
			<button class="btn btn-sm" on:click={() => cameraControls.saveState()}>saveState</button>
			<button class="btn btn-sm" on:click={() => console.log(camera?.position)}>Log camera in console</button>
		</div>

		<br />
		<button class="btn btn-sm" on:click={() => cameraControls.rotate(90 * THREE.MathUtils.DEG2RAD, 0, true)}>
			rotate theta 90
		</button>
		<button class="btn btn-sm" on:click={() => cameraControls.rotate(0, 90 * THREE.MathUtils.DEG2RAD, true)}>
			rotate phi 90
		</button>

		<!-- rotate alpha 90 -->
		<button class="btn btn-sm" on:click={() => cameraControls.rotate(0, 90 * THREE.MathUtils.DEG2RAD, true)}>
			rotate alpha 90
		</button>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
