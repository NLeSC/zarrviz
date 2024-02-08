<script lang="ts">
	import { onMount } from 'svelte';

	import { openArray } from 'zarr';
	// import { openArray, ArrayStore } from 'zarr';

	// class ArrayBufferStore extends ArrayStore {
	// 	constructor(buffer: ArrayBuffer) {
	// 		// Convert ArrayBuffer to an object that mimics key-value storage.
	// 		// This is a simplistic approach; actual implementation may vary.
	// 		const data = new Uint8Array(buffer);
	// 		super({ data: data });
	// 	}

	// 	// Implement other required methods if needed.
	// }

	let files = [];

	let dropzoneActive = false;
	let dragCounter = 0;
	const preventDefaults = (e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
	};
	const onDragEnter = (event: DragEvent) => {
		event.preventDefault();
		dragCounter++;
		dropzoneActive = true;
	};
	const onDragLeave = (event: DragEvent) => {
		event.preventDefault();
		dragCounter--;
		if (dragCounter === 0) {
			dropzoneActive = false;
		}
	};

	const onDrop = async (e: DragEvent) => {
		preventDefaults(e);
		dragCounter = 0;
		dropzoneActive = false;
		if (!e.dataTransfer) {
			return;
		}

		const items = e.dataTransfer.items;
		if (items) {
			for (let i = 0; i < items.length; i++) {
				// If dropped items aren't files, reject them
				if (items[i].kind === 'file') {
					const entry = items[i].webkitGetAsEntry();
					if (entry && entry.isDirectory) {
						// Process the directory
						await processDirectory(entry);
					}
				}
			}
		}
	};
	// Function to read file as an array buffer
	async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
		return file.arrayBuffer();
	}

	// Function to get file from the user
	async function getFile(): Promise<File> {
		const [fileHandle] = await window.showOpenFilePicker();
		return await fileHandle.getFile();
	}

	// Function to load and visualize data
	async function loadDataAndVisualize() {
		try {
			const file = await getFile();
			const arrayBuffer = await readFileAsArrayBuffer(file);

			// Process the file data with Zarr.js
			const zarray = await openArray({ store: arrayBuffer });
			const data = await zarray.get();
			const uint8Data = new Uint8Array(data.buffer);

			// Visualize data with Three.js (example: creating a texture)
			const texture = new THREE.DataTexture(uint8Data, zarray.shape[0], zarray.shape[1], THREE.RedFormat);
			texture.needsUpdate = true;

			// Further Three.js visualization code goes here
			// ...
		} catch (error) {
			console.error('Error loading or processing file', error);
		}
	}

	const processDirectory = async (directoryEntry: FileSystemDirectoryEntry) => {
		const reader = directoryEntry.createReader();
		reader.readEntries(async (entries) => {
			for (const entry of entries) {
				if (entry.isFile) {
					// Process file
					entry.file((file) => {
						files = [...files, file];
						console.log('File:', file);

						// read the file and convert it to array stream to pass it later to zarrjs
						const reader = new FileReader();
						reader.onload = async (e) => {
							const arrayBuffer = e.target.result;
							console.log('🧪 arrayBuffer', arrayBuffer);

							// const array = new Uint8Array(arrayBuffer);
							// console.log('array', array);
						};

						// processFile(file); // Define this function to process the file
					});
				} else if (entry.isDirectory) {
					// Process subdirectory
					console.log('🎹 directory', entry);

					await processDirectory(entry);
				}
			}
		});
	};

	onMount(() => {
		window.addEventListener('dragover', preventDefaults, false);
		window.addEventListener('dragenter', onDragEnter);
		window.addEventListener('dragleave', onDragLeave, false);
		window.addEventListener('drop', onDrop, false);
	});
</script>

<div class="container mx-auto flex flex-col items-center mt-10 group">
	<div class="max-w-xl">
		<label
			class="flex justify-center w-full h-32 px-4 transition border-2 border-gray-500 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none"
			class:border-gray-300={dropzoneActive}
		>
			<span class="flex items-center space-x-2">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="w-6 h-6 text-gray-600 group-hover:text-white transition"
					class:text-white={dropzoneActive}
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
				<span class="font-medium text-gray-600 group-hover:text-white transition" class:text-white={dropzoneActive}>
					Drop files to Attach, or
					<span class="text-blue-600 underline">browse</span>
				</span>
			</span>
			<!-- <input type="file" webkitdirectory name="file_upload" class="hidden"  /> -->
			<input type="file" webkitdirectory class="hidden" />
		</label>
	</div>
</div>
<div
	class="bg-gray-600 opacity-0 fixed w-screen h-screen pointer-events-none"
	class:pointer-events-auto={dropzoneActive}
	class:opacity-25={dropzoneActive}
></div>
<button on:click={loadDataAndVisualize} class="btn">LOAD</button>
