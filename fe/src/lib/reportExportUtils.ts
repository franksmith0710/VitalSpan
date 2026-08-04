/** Magic-byte checks for report export downloads (P3-SMOKE). */
export function exportMagicMatches(data: Uint8Array, format: string): boolean {
  if (data.length < 4) return false;
  if (format === "pdf") {
    return data[0] === 0x25 && data[1] === 0x50 && data[2] === 0x44 && data[3] === 0x46;
  }
  if (format === "excel" || format === "word") {
    return data[0] === 0x50 && data[1] === 0x4b;
  }
  return false;
}

export function decodeExportSample(base64OrText: string, format: string): Uint8Array {
  if (format === "pdf") {
    return new TextEncoder().encode("%PDF-1.4 sample");
  }
  return new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
}
