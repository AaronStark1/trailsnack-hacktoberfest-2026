export interface ProcessedFrame {
  storageBlob: Blob;
  thumbnailBlob: Blob;
  rgba: ArrayBuffer;
  width: number;
  height: number;
}

/** Center-crop to square, downscale to 1024px (storage) and 256px (thumbnail). */
export async function fileToSquareFrame(file: Blob): Promise<ProcessedFrame> {
  const bitmap = await createImageBitmap(file);
  try {
    return bitmapToSquareFrame(bitmap);
  } finally {
    bitmap.close();
  }
}

export function bitmapToSquareFrame(bitmap: ImageBitmap): ProcessedFrame {
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = Math.floor((bitmap.width - side) / 2);
  const sy = Math.floor((bitmap.height - side) / 2);

  const full = document.createElement("canvas");
  full.width = 1024;
  full.height = 1024;
  const fctx = full.getContext("2d", { willReadFrequently: true });
  if (!fctx) throw new Error("2D canvas unavailable");
  fctx.drawImage(bitmap, sx, sy, side, side, 0, 0, 1024, 1024);
  const imgData = fctx.getImageData(0, 0, 1024, 1024);
  const rgbaCopy = imgData.data.slice().buffer as ArrayBuffer;

  const thumb = document.createElement("canvas");
  thumb.width = 256;
  thumb.height = 256;
  const tctx = thumb.getContext("2d");
  if (!tctx) throw new Error("2D canvas unavailable");
  tctx.drawImage(full, 0, 0, 256, 256);

  return {
    storageBlob: canvasToBlob(full, "image/jpeg", 0.85),
    thumbnailBlob: canvasToBlob(thumb, "image/jpeg", 0.8),
    rgba: rgbaCopy,
    width: 1024,
    height: 1024,
  };
}

/** Synchronous canvas.toBlob wrapper (canvas contents are already rendered). */
function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Blob {
  // toBlob is async; use toDataURL path for determinism in tests and workers-free flow.
  const dataUrl = canvas.toDataURL(type, quality);
  const [head, body] = dataUrl.split(",", 2);
  const mime = /data:(.*?);/.exec(head ?? "")?.[1] ?? type;
  const bin = atob(body ?? "");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes.buffer as ArrayBuffer], { type: mime });
}

export async function videoFrameToSquare(video: HTMLVideoElement): Promise<ProcessedFrame> {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) throw new Error("Video has no frames yet");
  const side = Math.min(w, h);
  const sx = Math.floor((w - side) / 2);
  const sy = Math.floor((h - side) / 2);
  const full = document.createElement("canvas");
  full.width = 1024;
  full.height = 1024;
  const fctx = full.getContext("2d", { willReadFrequently: true });
  if (!fctx) throw new Error("2D canvas unavailable");
  fctx.drawImage(video, sx, sy, side, side, 0, 0, 1024, 1024);
  const imgData = fctx.getImageData(0, 0, 1024, 1024);
  const rgbaCopy = imgData.data.slice().buffer as ArrayBuffer;
  const thumb = document.createElement("canvas");
  thumb.width = 256;
  thumb.height = 256;
  const tctx = thumb.getContext("2d");
  if (!tctx) throw new Error("2D canvas unavailable");
  tctx.drawImage(full, 0, 0, 256, 256);
  return {
    storageBlob: canvasToBlob(full, "image/jpeg", 0.85),
    thumbnailBlob: canvasToBlob(thumb, "image/jpeg", 0.8),
    rgba: rgbaCopy,
    width: 1024,
    height: 1024,
  };
}
