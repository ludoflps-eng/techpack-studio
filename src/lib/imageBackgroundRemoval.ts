/** Longest-edge cap (px) for a stored logo image — keeps localStorage usage reasonable, since the
 *  whole pack (including every embedded image) is persisted as JSON in the browser's local
 *  storage, which has a modest per-origin quota (commonly a few MB). */
const MAX_STORED_DIMENSION = 1200;

export interface ProcessedLogo {
  imageDataUrl: string;
  naturalWidthPx: number;
  naturalHeightPx: number;
}

/** Loads `src` into an <img>, so its natural pixel dimensions become available. */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read that as an image.'));
    img.src = src;
  });
}

/** Downscales `img` (if it exceeds MAX_STORED_DIMENSION) onto a canvas and returns it as a PNG
 *  data URL, preserving transparency — the last step after background removal, so a full-
 *  resolution photo doesn't bloat the pack's saved size. */
function toDownscaledDataUrl(img: HTMLImageElement): { dataUrl: string; width: number; height: number } {
  const scale = Math.min(1, MAX_STORED_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');
  ctx.drawImage(img, 0, 0, width, height);
  return { dataUrl: canvas.toDataURL('image/png'), width, height };
}

/** Removes the background from `image` — fully client-side, via an in-browser ML model (no
 *  server, no API key), consistent with the rest of this app's local-first storage — and returns
 *  a size-capped PNG data URL ready to store on a LogoSpec, along with its final pixel
 *  dimensions. The first call in a browser session downloads the segmentation model (a one-time
 *  fetch the browser then caches), so it can take noticeably longer than subsequent calls.
 *
 *  Accepts a freshly picked `File`/`Blob`, or a data URL `string`. Note this is only meant to run
 *  once per picture (on upload) — feeding an already-processed, mostly-transparent image back
 *  through the ML model a second time tends to make results *worse*, not better: the model was
 *  trained on ordinary photos, and an image that's already mostly transparent (or flattened onto
 *  an opaque backdrop for inference, since the model needs 3-channel input) isn't something it
 *  handles predictably. For cleaning up a faint residual fringe on an already-processed picture,
 *  use `tightenImageEdges` instead — a deterministic pixel operation, not another model pass. */
export async function removeImageBackground(image: File | Blob | string): Promise<ProcessedLogo> {
  // Dynamically imported rather than statically — this pulls in the ~24MB onnxruntime-web WASM
  // runtime as its own lazily-loaded chunk, so it's only ever fetched when someone actually
  // uploads a picture, not as part of the app's normal page-load bundle.
  const { removeBackground } = await import('@imgly/background-removal');
  const blob = await removeBackground(image, {
    // The smallest/fastest of the three bundled models — a lighter download and good enough
    // quality for logos and line art, which is the primary use case here.
    model: 'isnet_quint8',
    output: { format: 'image/png' },
  });
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await loadImage(objectUrl);
    const { dataUrl, width, height } = toDownscaledDataUrl(img);
    return { imageDataUrl: dataUrl, naturalWidthPx: width, naturalHeightPx: height };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Below this alpha (out of 255), a pixel is treated as leftover background fringe rather than
 *  real subject — faint enough that it's visually indistinguishable from "removed" on most
 *  garment colors, but non-zero enough that it can still read as a faint edge on close
 *  inspection. */
const FRINGE_ALPHA_THRESHOLD = 64;

/** Zeroes the alpha of any pixel that is itself opaque (post-threshold) but 4-connected-adjacent
 *  to a fully transparent pixel — a one-pixel erosion of the opaque region. A pixel right at the
 *  edge of the cutout is usually still a blend of subject and background color (that's exactly
 *  what a soft/anti-aliased edge is), so shaving that ring off tends to remove the last of the
 *  fringe color even where its alpha was already high enough to survive the threshold pass.
 *  Mutates `data` (an RGBA `Uint8ClampedArray`) in place. */
function erodeOpaqueEdge(data: Uint8ClampedArray, width: number, height: number) {
  const alphaBefore = new Uint8Array(width * height);
  for (let i = 0; i < alphaBefore.length; i++) alphaBefore[i] = data[i * 4 + 3];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (alphaBefore[idx] === 0) continue; // already transparent, nothing to erode
      const left = x > 0 ? alphaBefore[idx - 1] : 0;
      const right = x < width - 1 ? alphaBefore[idx + 1] : 0;
      const up = y > 0 ? alphaBefore[idx - width] : 0;
      const down = y < height - 1 ? alphaBefore[idx + width] : 0;
      if (left === 0 || right === 0 || up === 0 || down === 0) {
        data[idx * 4 + 3] = 0;
      }
    }
  }
}

/** Cleans up a faint residual background fringe on a picture that's ALREADY had its background
 *  removed — a deterministic pixel operation (alpha-threshold, then a one-pixel erosion of the
 *  opaque edge), not another pass through the ML model. Unlike re-running `removeImageBackground`
 *  on an already-transparent image (which can misjudge the subject boundary and make things
 *  worse — see its doc comment), this only ever removes pixels that were already faint, so it's
 *  predictable and safe to run more than once: each pass can shave a little more off the edge,
 *  but a picture with a clean edge already is essentially unchanged by it. */
export async function tightenImageEdges(dataUrl: string): Promise<ProcessedLogo> {
  const img = await loadImage(dataUrl);
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');
  ctx.drawImage(img, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < FRINGE_ALPHA_THRESHOLD) data[i] = 0;
  }
  erodeOpaqueEdge(data, width, height);
  ctx.putImageData(imageData, 0, 0);

  return { imageDataUrl: canvas.toDataURL('image/png'), naturalWidthPx: width, naturalHeightPx: height };
}

/** The tight bounding box of a background-removed picture's actual visible content, as fractions
 *  (0-1) of the full image canvas — i.e. what's left after removing the background, which is
 *  often smaller than the full canvas (there can be a transparent margin around the subject, e.g.
 *  from a non-square source photo). Used to report/measure a picture by the size of its real
 *  artwork rather than its underlying file dimensions. */
export interface ContentBounds {
  leftFrac: number;
  topFrac: number;
  rightFrac: number;
  bottomFrac: number;
}

/** Below this alpha (out of 255), a pixel doesn't count as visible content when measuring a
 *  picture's real bounding box — consistent with FRINGE_ALPHA_THRESHOLD, so a stray near-
 *  transparent fringe pixel out past the subject doesn't inflate the measured size. */
const CONTENT_ALPHA_THRESHOLD = 64;

/** Scans `dataUrl`'s alpha channel for the tight bounding box of its non-transparent content. */
export async function findContentBounds(dataUrl: string): Promise<ContentBounds> {
  const img = await loadImage(dataUrl);
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');
  ctx.drawImage(img, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] >= CONTENT_ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) {
    // No content survived the threshold (a fully transparent image) — fall back to the full
    // canvas rather than reporting a degenerate zero-size box.
    return { leftFrac: 0, topFrac: 0, rightFrac: 1, bottomFrac: 1 };
  }
  return {
    leftFrac: minX / width,
    topFrac: minY / height,
    rightFrac: (maxX + 1) / width,
    bottomFrac: (maxY + 1) / height,
  };
}
