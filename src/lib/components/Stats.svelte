<script lang="ts">
	import { onMount } from 'svelte';
	import Stats from 'stats.js';

	let className = ''; // 'class' is a reserved keyword in JS, with initialization
	export { className as class };

	let statsElement: HTMLElement; // This is where you'll append the stats panel

	onMount(() => {
		const stats = new Stats();
		stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom

		// Apply styles directly to stats.dom to position it
		stats.dom.style.position = 'fixed';
		stats.dom.style.bottom = '10px';
		stats.dom.style.right = '10px';
		stats.dom.style.left = 'auto'; // Override default left positioning
		stats.dom.style.top = 'auto'; // Ensure top is not affecting the positioning

		statsElement.appendChild(stats.dom); // Append to the bound element instead of body

		function animate() {
			stats.begin();
			// monitored code goes here

			stats.end();
			requestAnimationFrame(animate);
		}

		requestAnimationFrame(animate);
	});
</script>

<div class={'z-10 fixed bottom-0 right-0 ' + className} bind:this={statsElement}></div>
