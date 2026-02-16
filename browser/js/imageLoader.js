/**
 * imageLoader.js — Load and parse Apple II image table binary files.
 *
 * Image table format (from HIRES.S setimage):
 *   byte 0:          max image index (count = byte0 + 1)
 *   bytes 1..count*2: 2-byte LE absolute pointers for each image
 *   each image:       byte 0 = width (in bytes, 7 pixels each)
 *                     byte 1 = height (scanlines)
 *                     bytes 2+: pixel data, bottom-to-top, left-to-right
 *
 * Absolute pointers are converted to file offsets by subtracting the
 * inferred base address (first pointer minus pointer-table size).
 */

/**
 * Parse an image table from a binary ArrayBuffer.
 *
 * @param {ArrayBuffer} buffer  Raw binary data
 * @returns {{ count: number, images: Array<{ width: number, height: number, data: Uint8Array }> }}
 */
export function parseImageTable(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 3) return { count: 0, images: [] };

  const maxIdx = bytes[0];
  const count = maxIdx + 1;

  // Read absolute pointers (2-byte LE at offsets 1, 3, 5, …)
  const ptrs = [];
  for (let i = 0; i < count; i++) {
    const off = 1 + i * 2;
    ptrs.push(bytes[off] | (bytes[off + 1] << 8));
  }

  // The pointer table occupies 1 + count*2 bytes in the file.
  // The first pointer points to the first image, which immediately follows
  // the pointer table.  So: baseAddr = firstPtr - pointerTableSize.
  const ptrTableSize = 1 + count * 2;
  const baseAddr = ptrs[0] - ptrTableSize;

  const images = [];
  for (let i = 0; i < count; i++) {
    const fileOff = ptrs[i] - baseAddr;
    if (fileOff < 0 || fileOff + 2 > bytes.length) {
      // Invalid pointer — push a null placeholder
      images.push(null);
      continue;
    }
    const w = bytes[fileOff];     // width in bytes (×7 pixels)
    const h = bytes[fileOff + 1]; // height in scanlines
    if (w === 0 || h === 0 || fileOff + 2 + w * h > bytes.length) {
      images.push(null);
      continue;
    }
    const pixelData = bytes.slice(fileOff + 2, fileOff + 2 + w * h);
    images.push({ width: w, height: h, data: pixelData });
  }

  return { count, images };
}

/**
 * Load an image table file via fetch.
 *
 * @param {string} url  URL/path to the binary file
 * @returns {Promise<ReturnType<typeof parseImageTable>>}
 */
export async function loadImageTable(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to load ${url}: ${resp.status}`);
  const buffer = await resp.arrayBuffer();
  return parseImageTable(buffer);
}
