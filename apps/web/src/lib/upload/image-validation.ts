// Server-side image upload validation.
//
// Never trust the client-provided `file.type` header: the actual buffer is
// sniffed for magic bytes and the sniffed type is what gets sent downstream.

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MiB

export type ImageMediaType = "image/jpeg" | "image/png" | "image/webp";

export type ImageValidationResult =
  | { ok: true; mediaType: ImageMediaType; bytes: Buffer }
  | { ok: false; status: number; error: string };

type Signature = { type: ImageMediaType; match: (b: Buffer) => boolean };

const SIGNATURES: Signature[] = [
  {
    type: "image/jpeg",
    match: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    type: "image/png",
    match: (b) =>
      b.length > 8 &&
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {
    type: "image/webp",
    match: (b) =>
      b.length > 12 &&
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && // RIFF
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50, // WEBP
  },
];

export function sniffImageType(bytes: Buffer): ImageMediaType | null {
  for (const sig of SIGNATURES) {
    if (sig.match(bytes)) return sig.type;
  }
  return null;
}

export async function validateImageUpload(file: File | null): Promise<ImageValidationResult> {
  if (!file) {
    return { ok: false, status: 400, error: "Nenhuma imagem enviada." };
  }
  if (file.size === 0) {
    return { ok: false, status: 400, error: "Arquivo vazio." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, status: 413, error: "Imagem muito grande (máx. 5 MB)." };
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const mediaType = sniffImageType(bytes);
  if (!mediaType) {
    return {
      ok: false,
      status: 400,
      error: "Formato de imagem não suportado. Use JPEG, PNG ou WebP.",
    };
  }
  return { ok: true, mediaType, bytes };
}
