/**
 * Generate minimal PWA icons (192x192 and 512x512) as PNG files
 * using raw PNG encoding — no external dependencies.
 */
import { writeFileSync, mkdirSync } from 'fs'
import { deflateSync } from 'zlib'

function createPNG(size) {
  // Dark background (#0a0a1a) with a centered cyan diamond
  const bg = [10, 10, 26]
  const accent = [56, 189, 248] // sky-400

  // Build raw pixel rows (filter byte + RGBA per pixel)
  const rowBytes = 1 + size * 4
  const raw = Buffer.alloc(rowBytes * size)

  const cx = size / 2
  const cy = size / 2
  const diamondR = size * 0.28

  for (let y = 0; y < size; y++) {
    const rowOff = y * rowBytes
    raw[rowOff] = 0 // no filter
    for (let x = 0; x < size; x++) {
      const px = rowOff + 1 + x * 4
      // Diamond shape: |x-cx| + |y-cy| < radius
      const dist = Math.abs(x - cx) + Math.abs(y - cy)
      if (dist < diamondR) {
        // Inner glow gradient
        const t = dist / diamondR
        const glow = 1 - t * 0.4
        raw[px] = Math.round(accent[0] * glow)
        raw[px + 1] = Math.round(accent[1] * glow)
        raw[px + 2] = Math.round(accent[2] * glow)
        raw[px + 3] = 255
      } else {
        raw[px] = bg[0]
        raw[px + 1] = bg[1]
        raw[px + 2] = bg[2]
        raw[px + 3] = 255
      }
    }
  }

  const compressed = deflateSync(raw)

  // PNG construction
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  function chunk(type, data) {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const typeB = Buffer.from(type, 'ascii')
    const crcData = Buffer.concat([typeB, data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(crcData) >>> 0)
    return Buffer.concat([len, typeB, data, crc])
  }

  // CRC32
  const crcTable = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crcTable[n] = c
  }
  function crc32(buf) {
    let crc = 0xffffffff
    for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
    return crc ^ 0xffffffff
  }

  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 6  // color type: RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync('public/icons', { recursive: true })
writeFileSync('public/icons/icon-192.png', createPNG(192))
writeFileSync('public/icons/icon-512.png', createPNG(512))
console.log('Generated public/icons/icon-192.png and public/icons/icon-512.png')
