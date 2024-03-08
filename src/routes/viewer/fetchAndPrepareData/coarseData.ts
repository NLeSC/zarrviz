//
// Coarse data to compress the ammount of data for the qr dataset
//
export function coarseData(shape, data) {
  // Coarse data to compress the ammount of data
  let dataCoarse = null;
  // console.log("Coarse graining...");
  dataCoarse = new Uint8Array(shape[0] * shape[1] * shape[2] / (8 * 8 * 8));
  for (let i = 0; i < shape[0] / 8; i++) {
    for (let j = 0; j < shape[1] / 8; j++) {
      for (let k = 0; k < shape[2] / 8; k++) {
        let x = 0;
        for (let l = 0; l < 8; l++) {
          for (let m = 0; m < 8; m++) {
            for (let n = 0; n < 8; n++) {
              const index = (k * 8 + n) + (j * 8 + m) * shape[2] + (l * 8 + i) * shape[2] * shape[1];
              x = Math.max(x, data[index])
            }
          }
        }
        const index2 = k + j * shape[2] / 8 + i * (shape[2] / 8) * (shape[1] / 8);
        dataCoarse[index2] = x
      }
    }
  }
  // console.log("...Done");

  return dataCoarse;
}