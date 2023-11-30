<script>
	import * as THREE from 'three';

	export let camera;
	export let cameraControls;
</script>

<div class="info p-6">
	<button class="btn btn-sm" on:click={() => cameraControls.rotate(45 * THREE.MathUtils.DEG2RAD, 0, true)}
		>rotate theta 45deg</button
	>
	<button class="btn btn-sm" on:click={() => cameraControls.rotate(-90 * THREE.MathUtils.DEG2RAD, 0, true)}
		>rotate theta -90deg</button
	>
	<button class="btn btn-sm" on:click={() => cameraControls.rotate(360 * THREE.MathUtils.DEG2RAD, 0, true)}
		>rotate theta 360deg</button
	>
	<button class="btn btn-sm" on:click={() => cameraControls.rotate(0, 20 * THREE.MathUtils.DEG2RAD, true)}
		>rotate phi 20deg</button
	>

	<button class="btn btn-sm" on:click={() => cameraControls.truck(1, 0, true)}> truck( 1, 0 ) </button>
	<button class="btn btn-sm" on:click={() => cameraControls.truck(0, 1, true)}> truck( 0, 1 ) </button>
	<button class="btn btn-sm" on:click={() => cameraControls.truck(-1, -1, true)}> truck( -1, -1 ) </button>

	<button class="btn btn-sm" on:click={() => cameraControls.dolly(1, true)}>dolly 1</button>
	<button class="btn btn-sm" on:click={() => cameraControls.dolly(-1, true)}>dolly -1</button>

	<button class="btn btn-sm" on:click={() => cameraControls.zoom(camera.zoom / 2, true)}>zoom `camera.zoom / 2`</button>
	<button class="btn btn-sm" on:click={() => cameraControls.zoom(-camera.zoom / 2, true)}
		>zoom `- camera.zoom / 2`</button
	>

	<button class="btn btn-sm" on:click={() => cameraControls.moveTo(3, 5, 2, true)}> move to( 3, 5, 2 )</button>
	<!-- <button class="btn btn-sm" on:click={()=> cameraControls.fitToBox(mesh, true)}>fit to the bounding box of the mesh</button -->

	<button class="btn btn-sm" on:click={() => cameraControls.setPosition(-5, 2, 1, true)}>move to ( -5, 2, 1 )</button>
	<button class="btn btn-sm" on:click={() => cameraControls.setTarget(3, 0, -3, true)}>look at ( 3, 0, -3 )</button>
	<button class="btn btn-sm" on:click={() => cameraControls.setLookAt(1, 2, 3, 1, 1, 0, true)}
		>move to ( 1, 2, 3 ), look at ( 1, 1, 0 )</button
	>

	<button on:click={() => cameraControls.lerpLookAt(-2, 0, 0, 1, 1, 0, 0, 2, 5, -1, 0, 0, Math.random(), true)}
		>move to somewhere between ( -2, 0, 0 ) -> ( 1, 1, 0 ) and ( 0, 2, 5 ) -> ( -1, 0, 0 )</button
	>

	<button class="btn btn-sm" on:click={() => cameraControls.reset(true)}>reset</button>
	<button class="btn btn-sm" on:click={() => cameraControls.saveState()}>saveState</button>
	<br />
	<button class="btn btn-sm" on:click={() => (cameraControls.enabled = false)}>disable mouse/touch controls</button>
	<button class="btn btn-sm" on:click={() => (cameraControls.enabled = true)}>enable mouse/touch controls</button>
	<button on:click={() => console.log(camera?.position)}>Log camera in console</button>
</div>
