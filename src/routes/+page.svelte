<script lang="ts">
	import { goto } from '$app/navigation';
	import logos from '$lib/assets/images/logos.webp';

	const datasets = [
		{
			title: 'Dataset 1 (80MB)',
			description: 'If a dog chews shoes whose shoes does he choose?',
			image: '/images/cover.webp',
			url: 'https://storage-s3.ctwhome.com/ruisdael/data/ql.zarr'
		},
		{
			title: 'Dataset 2 (300MB)',
			description: 'If a dog chews shoes whose shoes does he choose?',
			image: '/images/cover.webp',
			url: 'https://storage-s3.ctwhome.com/ruisdael/data/animated-data/ql.zarr'
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
				<p class="mb-8 text-xl font-bold">Select a dataset view the 3D clouds visualization.</p>
			</div>
		</div>
	</div>
</div>

<div class="container mx-auto i">
	<div class="text-lg my-10">Datasets</div>
	<div class="flex gap-8">
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

<div class="container mx-auto flex flex-col items-center mt-10">
	Drop data is not available yet:
	<div class="max-w-xl">
		<label
			class="flex justify-center w-full h-32 px-4 transition border-2 border-gray-500 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none"
		>
			<span class="flex items-center space-x-2">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="w-6 h-6 text-gray-600"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
					/>
				</svg>
				<span class="font-medium text-gray-600">
					Drop files to Attach, or
					<span class="text-blue-600 underline">browse</span>
				</span>
			</span>
			<input type="file" name="file_upload" class="hidden" />
		</label>
	</div>
</div>
