import { readExifDay } from "@/lib/exif";

const MAX_SIDE = 1600;

export type PreparedPhoto = { blob: Blob; takenOn: string | null };

// Runs on the phone before upload: reads the capture date from the original's
// metadata, then redraws the photo at most 1600px wide as a JPEG (which also
// drops location data and other metadata, so only pixels are stored).
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  let takenOn: string | null = null;
  try {
    takenOn = readExifDay(await file.slice(0, 131072).arrayBuffer());
  } catch {
    takenOn = null;
  }

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("no canvas");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) throw new Error("could not encode");
  return { blob, takenOn };
}
