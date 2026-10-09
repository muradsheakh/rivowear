import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import multer from "multer";
import { config } from "../config.js";

export const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR ?? "uploads");
mkdirSync(UPLOAD_DIR, { recursive: true });

const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export const imageUpload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    // The original file name is never used, so nobody can write odd paths or extensions.
    filename: (_request, file, callback) => callback(null, `${randomUUID()}.${EXTENSIONS[file.mimetype] ?? "bin"}`),
  }),
  limits: { fileSize: 4 * 1024 * 1024, files: 8 },
  fileFilter: (_request, file, callback) => {
    if (EXTENSIONS[file.mimetype]) callback(null, true);
    else callback(new Error("Only JPG, PNG or WebP images are allowed."));
  },
});

export const uploadUrl = (filename: string) => `${config.publicApiUrl}/uploads/${filename}`;
export const isOwnUpload = (url: string) => url.startsWith(`${config.publicApiUrl}/uploads/`);
