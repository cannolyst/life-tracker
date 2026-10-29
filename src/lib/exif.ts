// Reads the capture date out of a JPEG's EXIF block ("2026:10:29 18:42:07").
// Returns a "YYYY-MM-DD" day key, or null when there is no readable date.
// Only the first 128 KB are needed, since EXIF sits at the start of the file.
export function readExifDay(buffer: ArrayBuffer): string | null {
  const view = new DataView(buffer);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null;

  let offset = 2;
  while (offset + 4 < view.byteLength) {
    if (view.getUint8(offset) !== 0xff) return null;
    const marker = view.getUint8(offset + 1);
    const size = view.getUint16(offset + 2);
    if (marker === 0xe1 && offset + 10 < view.byteLength && view.getUint32(offset + 4) === 0x45786966) {
      return dayFromTiff(view, offset + 10, Math.min(view.byteLength, offset + 2 + size));
    }
    if (marker === 0xda) return null; // start of image data: no EXIF before it
    offset += 2 + size;
  }
  return null;
}

function dayFromTiff(view: DataView, start: number, end: number): string | null {
  if (start + 8 > end) return null;
  const little = view.getUint16(start) === 0x4949;
  if (!little && view.getUint16(start) !== 0x4d4d) return null;
  const u16 = (o: number) => view.getUint16(o, little);
  const u32 = (o: number) => view.getUint32(o, little);

  const readDate = (entryOffset: number): string | null => {
    const count = u32(entryOffset + 4);
    if (count < 10 || count > 32) return null;
    const valueAt = count > 4 ? start + u32(entryOffset + 8) : entryOffset + 8;
    if (valueAt + 10 > end) return null;
    let text = "";
    for (let i = 0; i < 10; i++) text += String.fromCharCode(view.getUint8(valueAt + i));
    const match = /^(\d{4}):(\d{2}):(\d{2})$/.exec(text);
    return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
  };

  const readIfd = (ifdOffset: number): { dates: Record<number, string>; exifPointer: number | null } => {
    const out = { dates: {} as Record<number, string>, exifPointer: null as number | null };
    const base = start + ifdOffset;
    if (base + 2 > end) return out;
    const entries = u16(base);
    for (let i = 0; i < entries; i++) {
      const entry = base + 2 + i * 12;
      if (entry + 12 > end) break;
      const tag = u16(entry);
      if (tag === 0x8769) out.exifPointer = u32(entry + 8);
      if (tag === 0x9003 || tag === 0x9004 || tag === 0x0132) {
        const day = readDate(entry);
        if (day) out.dates[tag] = day;
      }
    }
    return out;
  };

  const main = readIfd(u32(start + 4));
  const exif = main.exifPointer !== null ? readIfd(main.exifPointer) : null;
  // DateTimeOriginal, then DateTimeDigitized, then the file's modified date.
  return exif?.dates[0x9003] ?? exif?.dates[0x9004] ?? main.dates[0x0132] ?? null;
}
