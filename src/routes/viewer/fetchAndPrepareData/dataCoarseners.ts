import type { TypedArray } from 'three';
import { maxReduceData } from './maxReduceData';

export type CoarseningFunction = (fineData: TypedArray, fineShape: number[], coarseData: TypedArray, blockSizes: number[]) => (void);

export class CoarseningFunctionFactory {
  static createCoarseningFunction(coarseningFunction: string): CoarseningFunction {
    switch (coarseningFunction) {
      case 'max':
        return maxReduceData;
      default:
        throw new Error(`Unknown coarsening function: ${coarseningFunction}`);
    }
  }
};