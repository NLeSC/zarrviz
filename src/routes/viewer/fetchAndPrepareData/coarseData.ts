//
// Coarse data downsampling for volumetric data (used for both rain and cloud datasets)
// Creates a lower resolution version by taking the maximum value in each 8x8x8 block
// This enables efficient empty space skipping in the shaders
//
export function coarseData(data, shape) {
  let dataCoarse = null;
  const blockSize = 8;
  const s0 = Math.ceil(shape[0] / blockSize);
  const s1 = Math.ceil(shape[1] / blockSize);
  const s2 = Math.ceil(shape[2] / blockSize);
  console.log("Coarse graining array of shape ",shape," to ",[s0, s1, s2],"...");
  dataCoarse = new Uint8ClampedArray(s0 * s1 * s2);
  let index2 = 0;
  let x = 0;
  for (let i = 0; i < shape[2]; i += blockSize) {
    for (let j = 0; j < shape[0]; j += blockSize) {
      for (let k = 0; k < shape[1]; k += blockSize) {
        x = 0;
        for (let l = i; l < (i + blockSize) && l < shape[2]; l++) {
          for (let m = j; m < (j + blockSize) && m < shape[0]; m++) {
            for (let n = k; n < (k + blockSize) && n < shape[1]; n++) {
                const value = data[n + m * shape[1] + l * shape[0] * shape[1]];
                if (value > x){
                  x = value;
                }
            }
          }
        }
        dataCoarse[index2] = x;
        index2++;
      }
    }
  }
  console.log("...Done");

  return dataCoarse;
}