import multer from "multer";
import crypto from "crypto";
import fs from "fs";

fs.mkdirSync("uploads", { recursive: true });

const EXT = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

const uploader = multer({
  storage: multer.diskStorage({
    destination: "uploads",
    filename: (req, file, cb) =>
      cb(null, crypto.randomUUID() + EXT[file.mimetype]),
  }),
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB
  fileFilter: (req, file, cb) =>
    EXT[file.mimetype]
      ? cb(null, true)
      : cb(new Error("Only JPG, PNG or WEBP images are allowed")),
});

// Reads one image field, then puts its URL path into req.body[field]
export const imageUpload = (field) => [
  uploader.single(field),
  (req, res, next) => {
    // multipart forms send empty fields as "", so treat them as missing
    for (const k of Object.keys(req.body || {})) {
      if (req.body[k] === "") delete req.body[k];
    }
    if (req.file) req.body[field] = `/uploads/${req.file.filename}`;
    next();
  },
];