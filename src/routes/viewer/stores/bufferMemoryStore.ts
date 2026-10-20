import { type RemoteStore } from "./remoteStore";
import {type WorkerResultBuffers } from "./bufferWorker"


export class BufferMemoryStore {
  readonly bufferSize: number;
  readonly bufferSlices: number;
  readonly numSlices: number;
  readonly variable: string;
  readonly dimensions: number;
  currentBuffer: Uint8Array;
  currentBufferStartIndex: number;
  currentBufferSlices: number;
  nextBuffer: Uint8Array;
  nextBufferStartIndex: number;
  nextBufferSlices: number;
  currentSliceIndex: number;
  dataFetchWorker: Worker;
  nextBufferPromise: Promise<WorkerResultBuffers>;

  constructor(bufferSize_: number, bufferSlices_: number, numSlices_: number, variable_: string, dimensions_: number) {
    this.bufferSize = bufferSize_;
    this.bufferSlices = bufferSlices_;
    this.numSlices = numSlices_;
    this.variable = variable_;
    this.dimensions = dimensions_;
    this.currentBuffer = null;
    this.currentBufferStartIndex = 0;
    this.currentBufferSlices = 0;
    this.nextBuffer = null;
    this.nextBufferStartIndex = 0;
    this.nextBufferSlices = 0;
    this.currentSliceIndex = 0;
    this.dataFetchWorker = new Worker(new URL('./bufferWorker.ts', import.meta.url), { type: 'module' });
    this.nextBufferPromise = null;
  }

  // Returns a code indicating the location of the slice index
  // -1: Invalid index
  // 0: The slice index is not in the buffers
  // 1: The slice index is in the current buffer
  // 2: The slice index is in the next buffer
  locateSliceIndex(index: number): number {
    if(index < 0 || index >= this.numSlices) {
      return -1;
    }
    if(this.currentBuffer === null) {
      return 0;
    }
    if (this.currentBufferStartIndex < this.nextBufferStartIndex) {
      if (index < this.currentBufferStartIndex || index >= (this.nextBufferStartIndex + this.nextBufferSlices)) {
        return 0;
      }
      if (index < this.nextBufferStartIndex) {
        return 1;
      }
    }
    else {
      if (index < this.currentBufferStartIndex && index >= (this.nextBufferStartIndex + this.nextBufferSlices)) {
        return 0;
      }
      if (index >= this.currentBufferStartIndex) {
        return 1;
      }
    }
    return 2;
  }

  async fetchNewBuffers(index: number, remoteStore: RemoteStore) {
    if (index + this.bufferSlices >= this.numSlices) {
      this.fetchNextBuffer(0, this.bufferSlices, remoteStore);
      await this.fetchCurrentBuffer(index, this.numSlices - index, remoteStore);
    }
    else if(index + 2 * this.bufferSlices >= this.numSlices) {
      this.fetchNextBuffer(index + this.bufferSlices, this.numSlices - index - this.bufferSlices, remoteStore);
      await this.fetchCurrentBuffer(index, this.bufferSlices, remoteStore);
    }
    else {
      this.fetchNextBuffer(index + this.bufferSlices, this.bufferSlices, remoteStore);
      await this.fetchCurrentBuffer(index, this.bufferSlices, remoteStore);
    }
  }

  async setCurrentSliceIndex(index: number, remoteStore: RemoteStore): Promise<Uint8Array> {
    let initializing = false;
    if (this.currentBuffer === null) {
      this.currentBuffer = this.allocateBuffer();
      initializing = true;
    }
    if (this.nextBuffer === null) {
      this.nextBuffer = this.allocateBuffer();
    }
    if (initializing) {
      this.fetchNewBuffers(index, remoteStore);
    }
    await this.awaitNextBuffer();
    const sliceLocation = this.locateSliceIndex(index);
    switch(sliceLocation) {
      case -1:
        throw new Error("Invalid slice index");
      case 0:
        await this.fetchNewBuffers(index, remoteStore);
        break;
      case 1:
        break;
      case 2:
        this.currentBuffer = this.nextBuffer;
        this.currentBufferStartIndex = this.nextBufferStartIndex;
        this.currentBufferSlices = this.nextBufferSlices;
        if((this.nextBufferStartIndex + this.nextBufferSlices) >= this.numSlices) {
          this.fetchNextBuffer(0, this.bufferSlices, remoteStore);
        }
        else {
          const slicesToFetch = Math.min(this.bufferSlices, this.numSlices - this.nextBufferStartIndex - this.nextBufferSlices);
          this.fetchNextBuffer(this.nextBufferStartIndex + this.nextBufferSlices, slicesToFetch, remoteStore);
        }
        break;
      default:
        return null;
    }
    const sliceSize = this.bufferSize / this.bufferSlices;
    const begin = (index - this.currentBufferStartIndex) * sliceSize;
    return this.currentBuffer.subarray(begin, begin + sliceSize);
  }

  allocateBuffer(numSlices: number = this.bufferSlices): Uint8Array {
    return new Uint8Array((this.bufferSize / this.bufferSlices) * numSlices);
  }

  public async awaitNextBuffer() {
    if (this.nextBufferPromise) {
      const bufferWorkResult = await this.nextBufferPromise;
      this.nextBuffer = bufferWorkResult.bufferData;
      this.nextBufferStartIndex = bufferWorkResult.bufferStartIndex;
      this.nextBufferSlices = bufferWorkResult.bufferLength;
      this.nextBufferPromise = null;
    }
  }

  public fetchNextBuffer(startIndex: number, length: number, remoteStore: RemoteStore) {
    this.dataFetchWorker.postMessage({
        variable: this.variable,
        dimensions: this.dimensions,
        startIndex: startIndex,
        endIndex: startIndex + length,
        path: remoteStore.getURL(),
    });
    this.nextBufferPromise = new Promise<WorkerResultBuffers>((resolve, reject) => {
        this.dataFetchWorker.onmessage = (event) => { resolve(event.data); };
        this.dataFetchWorker.onerror = reject;
    });
  }

  public async fetchCurrentBuffer(startIndex: number, length: number, remoteStore: RemoteStore) {
    await remoteStore.copyTimeRange(this.variable, this.dimensions, startIndex, startIndex + length, this.currentBuffer);
    this.currentBufferStartIndex = startIndex;
    this.currentBufferSlices = length;
  }
}
