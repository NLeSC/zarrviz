//
// Coarse data to compress the amount of data for the qr dataset

import type { TypedArray } from "three";

//
export function maxReduceData(fineData: TypedArray, fineShape: number[], coarseData: TypedArray, blockSizes: number[]) {
  if (blockSizes[0] != 1) {
    throw Error("Temporal reduction is not supported in this method");
  }
  let index = 0;
  for (let t = 0; t < fineShape[0]; t++) {
    for (let i = 0; i < fineShape[3]; i += blockSizes[3]) {
      for (let j = 0; j < fineShape[1]; j += blockSizes[1]) {
        for (let k = 0; k < fineShape[2]; k += blockSizes[2]) {
          let x = 0;
          for (let l = i; l < (i + blockSizes[3]) && l < fineShape[3]; l++) {
            for (let m = j; m < (j + blockSizes[1]) && m < fineShape[1]; m++) {
              for (let n = k; n < (k + blockSizes[2]) && n < fineShape[2]; n++) {
                const value = fineData[n + m * fineShape[2] + l * fineShape[1] * fineShape[2] + t * fineShape[1] * fineShape[2] * fineShape[3]];
                if (value > x) {
                  x = value;
                }
              }
            }
          }
          coarseData[index] = x;
          index++;
        }
      }
    }
  }
}
