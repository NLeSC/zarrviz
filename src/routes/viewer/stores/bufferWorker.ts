// bufferWorker.ts
// TODO: breaks modularity, refactor
import { RemoteZarrStore } from "./remoteZarrStore";
//import { CoarseningFunctionFactory } from '../fetchAndPrepareData/dataCoarseners';

export interface WorkerResultBuffers {
    bufferData: Int8Array;
    coarseBufferData?: Int8Array;
}

self.onmessage = async function(event) {
    const { variable, dimensions, startIndex, endIndex, path, coarseningData } = event.data;

    const remoteStore = new RemoteZarrStore(path);

    const bufferData = await remoteStore.getTimeRange(variable, dimensions, startIndex, endIndex);

    console.log("WEBWORKER: Fetched buffer for", variable, "from", startIndex, "to", endIndex);

    if (coarseningData === undefined){
        self.postMessage({bufferData: bufferData});
    }
    else {
        const {coarseFunc, fineBufferShape, blockSizes} = event.data.coarseningData;
        let fullSize = 1;
        for ( let i = 0; i < fineBufferShape.length; i++) {
            fullSize *= Math.ceil(fineBufferShape[i] / blockSizes[i]);
        }
        const coarseBufferData = new Uint8Array(fullSize);
//        CoarseningFunctionFactory.createCoarseningFunction(coarseningFunction)(bufferData, fineBufferShape, coarseBufferData, blockSizes);
        console.log("WEBWORKER: Coarsened buffer for", variable, "from", startIndex, "to", endIndex);
        self.postMessage({bufferData: bufferData, coarseBufferData: coarseBufferData});
    }
};