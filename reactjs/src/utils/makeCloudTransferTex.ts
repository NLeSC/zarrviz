import * as THREE from "three";

export function makeCloudTransferTex() {
  const width = 256;
  const height = 1;
  const size = width * height;
  const data = new Uint8Array(4 * size);

  const rstart = 255;
  const rend = 50;
  const astart = 20;
  const aend = 255;
  const imid = 20;
  const amid = 40;

  for (let i = 0; i < width; i += 1) {
    let r = rstart + (i * (rend - rstart)) / (width - 1);
    let alpha = 0;
    if (i < imid) {
      alpha = astart + (i * (amid - astart)) / (imid - 1);
    } else {
      alpha = amid + ((i - imid) * (aend - amid)) / (width - imid);
    }

    data[4 * i] = r;
    data[4 * i + 1] = r;
    data[4 * i + 2] = r;
    data[4 * i + 3] = alpha;
  }
  // console.log(data);

  const transferTexture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  transferTexture.wrapS = THREE.ClampToEdgeWrapping;
  transferTexture.wrapT = THREE.ClampToEdgeWrapping;
  transferTexture.needsUpdate = true;

  return transferTexture;
}
