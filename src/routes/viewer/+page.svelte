<script lang="ts">
	import TimeLine from '$lib/components/TimeLine.svelte';
	import * as THREE from 'three';

	import { allTimeSlices, currentTimeIndex } from '$lib/components/allSlices.store';

	import Viewer from './Viewer.svelte';
</script>

<!--  Debugging info -->

<div class="">
	<!-- <a class="btn" href="/zarrExample">Zarr playground</a> -->
	<!-- <pre>Slices downloaded: {@JSON.stringify(allTimeSlices.length, null, 2)}</pre> -->
	<div class="flex gap-5">
		<!-- 1073741824 = 1GB -->
		<pre>dataUint8 (slice) {$allTimeSlices[0]?.length} - {($allTimeSlices[0]?.byteLength / 1073741824).toFixed(
				3
			)} GB |</pre>
		<!-- <pre>dataCellSize: {$dataCellSize.length} |</pre> -->
		<pre>Slices downloaded: {JSON.stringify($allTimeSlices.length, null, 2)} </pre>
	</div>
	<!-- datashape = dataShape: {JSON.stringify($dataShape, null, 2)} -->
</div>

<Viewer {$currentTimeIndex} />
<TimeLine
	positionIndex={$currentTimeIndex}
	length={$allTimeSlices.length}
	on:onSelectedIndex={(value) => currentTimeIndex.set(value.detail.index)}
/>
