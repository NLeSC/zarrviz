<script lang="ts">
	import { onMount } from 'svelte';
	import Stats from 'stats.js';

	let className = undefined; // 'class' is a reserved keyword in JS, with initialization
	export { className as class };

	let statsElement: HTMLElement; // This is where you'll append the stats panel

	onMount(() => {
		const stats = new Stats();
		stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
		statsElement.appendChild(stats.dom); // Append to the bound element instead of body

		function animate() {
			stats.begin();
			// monitored code goes here

			stats.end();
			requestAnimationFrame(animate);
		}

		requestAnimationFrame(animate);

		return () => {
			// Cleanup function to remove the stats panel when the component is destroyed
			if (statsElement && statsElement.contains(stats.dom)) {
				statsElement.removeChild(stats.dom);
			}
		};
	});
</script>

<div bind:this={statsElement} class={'z-10 ' + className} />
