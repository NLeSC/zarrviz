import { type RemoteStore } from "./remoteStore";
import {type WorkerResultBuffers } from "./bufferWorker"


export class BufferMemoryStore {
  currentBuffer: Uint8Array;
  nextBuffer: Uint8Array;
  currentSliceIndex: number;
  currentBufferStartIndex: number;
  bufferSize: number;
  bufferSlices: number;
  numSlices: number;
  variable: string;
  dimensions: number;
  dataFetchWorker: Worker;
  nextBufferPromise: Promise<WorkerResultBuffers>;

  constructor(bufferSize_: number, bufferSlices_: number, numSlices_: number, variable_: string, dimensions_: number) {
    this.bufferSize = bufferSize_;
    this.bufferSlices = bufferSlices_;
    this.numSlices = numSlices_;
    this.variable = variable_;
    this.dimensions = dimensions_;
    this.currentBuffer = null;
    this.nextBuffer = null;
    this.currentSliceIndex = -1;
    this.currentBufferStartIndex = -2 * this.bufferSlices;
    this.dataFetchWorker = new Worker(new URL('./bufferWorker.ts', import.meta.url), { type: 'module' });
    this.nextBufferPromise = null;
  }

  async setCurrentSliceIndex(index: number, remoteStore: RemoteStore): Promise<ArrayBufferView> {
    if (this.currentBuffer === null) {
      this.currentBuffer = new Uint8Array(this.bufferSize);
    }
    if (this.nextBuffer === null) {
      this.nextBuffer = new Uint8Array(this.bufferSize);
    }
    this.currentSliceIndex = index;
    const sliceSize = this.bufferSize / this.bufferSlices;
    const startIndex = Math.floor(index / this.bufferSlices) * this.bufferSlices;
    if (startIndex < this.currentBufferStartIndex) {
      if (startIndex + this.bufferSlices >= this.currentBufferStartIndex) {
        this.nextBuffer = this.currentBuffer;
      }
      else {
        this.fetchNextBuffer(startIndex, remoteStore);
      }
      await this.fetchCurrentBuffer(startIndex, remoteStore);
      this.currentBufferStartIndex = startIndex;
    }
    else if (startIndex >= this.currentBufferStartIndex + this.bufferSlices) {
      if (startIndex < this.currentBufferStartIndex + 2 * this.bufferSlices) {
        // If the next buffer is being fetched, wait for it to finish
        await this.awaitNextBuffer();
        this.currentBuffer = this.nextBuffer;
      }
      else {
        await this.fetchCurrentBuffer(startIndex, remoteStore);
      }
      this.currentBufferStartIndex = startIndex;
      // Fetch the next buffer in a web worker
      this.fetchNextBuffer(startIndex, remoteStore);
    }
    const begin = (this.currentSliceIndex - this.currentBufferStartIndex) * sliceSize;
    return this.currentBuffer.subarray(begin, begin + sliceSize);
  }

  public async awaitNextBuffer() {
    if (this.nextBufferPromise) {
      this.nextBuffer.set((await this.nextBufferPromise).bufferData);
      this.nextBufferPromise = null;
    }
  }

  public fetchNextBuffer(startIndex: number, remoteStore: RemoteStore) {
      this.dataFetchWorker.postMessage({
        variable: this.variable,
        dimensions: this.dimensions,
        startIndex: startIndex + this.bufferSlices,
        endIndex: startIndex + 2 * this.bufferSlices,
        path: remoteStore.getURL(),
      });
      this.nextBufferPromise = new Promise<WorkerResultBuffers>((resolve, reject) => {
        this.dataFetchWorker.onmessage = (event) => { resolve(event.data); };
        this.dataFetchWorker.onerror = reject;
      });
  }

  public async fetchCurrentBuffer(startIndex: number, remoteStore: RemoteStore) {
    await remoteStore.copyTimeRange(this.variable, this.dimensions, startIndex, startIndex + this.bufferSlices, this.currentBuffer);
  }
}
