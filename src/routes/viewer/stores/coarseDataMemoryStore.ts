import { type RemoteStore } from './remoteStore';
import { BufferMemoryStore } from './bufferMemoryStore';
import { type WorkerResultBuffers } from './bufferWorker'
import { CoarseningFunctionFactory } from '../fetchAndPrepareData/dataCoarseners';


export class CoarseDataMemoryStore extends BufferMemoryStore {
    private currentCoarseBuffer: Uint8Array;
    private nextCoarseBuffer: Uint8Array;
    private fineBufferShape: number[];
    private blockSizes: number[];
    private coarseningFunction: string;

    constructor(bufferSize_: number, bufferSlices_: number, variable_: string, inputShape_: number[], blockSizes_: number[], coarseningFunction_ : string) {
        super(bufferSize_, bufferSlices_, inputShape_[0], variable_, inputShape_.length);
        this.fineBufferShape = inputShape_;
        this.fineBufferShape[0] = bufferSlices_;
        this.blockSizes = blockSizes_;
        this.coarseningFunction = coarseningFunction_;
        this.currentCoarseBuffer = this.createCoarseBuffer();
        this.nextCoarseBuffer = this.createCoarseBuffer();
    }

    private createCoarseBuffer(): Uint8Array {
        let fullSize = 1;
        for ( let i = 0; i < this.fineBufferShape.length; i++) {
            fullSize *= Math.ceil(this.fineBufferShape[i] / this.blockSizes[i]);
        }
        return new Uint8Array(fullSize);
    }

    public getCurrentCoarseBuffer(): Uint8Array {
        let sliceSize = 1;
        for ( let i = 1; i < this.fineBufferShape.length; i++) {
            sliceSize *= Math.ceil(this.fineBufferShape[i] / this.blockSizes[i]);
        }
        const begin = (this.currentSliceIndex - this.currentBufferStartIndex) * sliceSize;
        return this.currentCoarseBuffer.subarray(begin, begin + sliceSize);
    }

    public async awaitNextBuffer() {
        if (this.nextBufferPromise) {
            this.nextBuffer.set((await this.nextBufferPromise).bufferData);
            this.nextCoarseBuffer.set((await this.nextBufferPromise).coarseBufferData);
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
          coarseningData : {
            coarseningFunction: this.coarseningFunction,
            fineBufferShape: this.fineBufferShape,
            blockSizes: this.blockSizes
          }
        });
        this.nextBufferPromise = new Promise<WorkerResultBuffers>((resolve, reject) => {
          this.dataFetchWorker.onmessage = (event) => { resolve(event.data); };
          this.dataFetchWorker.onerror = reject;
        });
    }  

    public async fetchCurrentBuffer(startIndex: number, remoteStore: RemoteStore) {
        await super.fetchCurrentBuffer(startIndex, remoteStore);
        CoarseningFunctionFactory.createCoarseningFunction(this.coarseningFunction)(
            this.currentBuffer,
            this.fineBufferShape,
            this.currentCoarseBuffer,
            this.blockSizes
        );
    }
}