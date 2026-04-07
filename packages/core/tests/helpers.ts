export function isValidPng(buf: Buffer): boolean {
  return (
    buf[0] === 0x89 &&
    buf[1] === 0x50 && // P
    buf[2] === 0x4e && // N
    buf[3] === 0x47    // G
  )
}

export function getPngDimensions(buf: Buffer): { width: number; height: number } {
  return {
    width:  buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  }
}
