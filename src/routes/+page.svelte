<script lang="ts">
	import { goto } from '$app/navigation';
	import logos from '$lib/assets/images/logos.webp';
	import DropFolder from '$lib/components/DropFolder.svelte';

	const datasets = [
		{
			title: 'Dataset 1 (80MB)',
			description: 'If a dog chews shoes whose shoes does he choose?',
			image: '/images/cover.webp',
			url: 'https://s3.ctwhome.com/ruisdael/data/ql.zarr'
		},
		{
			title: 'Dataset 2 (300MB)',
			description: 'If a dog chews shoes whose shoes does he choose?',
			image: '/images/cover.webp',
			url: 'https://s3.ctwhome.com/ruisdael/data/animated-data/ql.zarr'
		}
	];
</script>

<div class="container mx-auto px-4">
	<div class="overflow-hidden rounded-t-3xl">
		<div class="px-8 pt-20">
			<div class="md:max-w-2xl text-center mx-auto">
				<img src={logos} alt="" class="max-h-20 w-auto mx-auto" />
				<h1 class="font-heading mb-6 text-5xl lg:text-6xl font-black mt-10">Ruisdael on Display</h1>
				<span class="inline-block mb-3 text-sm font-bold uppercase">3D CLOUDS VISUALIZATION</span>
			</div>
		</div>
	</div>
</div>

<div class="container mx-auto i">
	<p class="mb-8 text-lg font-bold my-10">Datasets</p>

	<!-- TODO: remove these buttons when uploading from local machine is available -->
	<!-- <a class="btn btn-primary" href="/viewer">Localhost</a>
	<a class="btn btn-primary" href="/viewer?dataset=http://localhost:5173/data/animated/ql.zarr">Localhost animated</a>
	<a class="btn btn-primary" href="/viewer?dataset=http://localhost:5173/data/animated/qr.zarr&path=qr">Localhost qr</a> -->

	<div class="flex gap-8 mt-4">
		{#each datasets as data}
			<a href={'viewer?dataset=' + data.url}>
				<div class="flex flex-col items-center">
					<div class="card w-60 bg-base-300 shadow-xl ring-base-300 hover:ring-gray-500 transition-all ring-2">
						<img src={data.image} class="flex-none rounded-t-2xl" alt="Shoes" />
						<div class="card-body">
							<h2 class="card-title">{data.title}</h2>
							<p>If a dog chews shoes whose shoes does he choose?</p>
							<div class="card-actions justify-end">
								<button class="btn btn-primary btn-sm">Load 3D data</button>
							</div>
						</div>
					</div>
				</div>
			</a>
		{/each}
	</div>
</div>
]
<DropFolder />
