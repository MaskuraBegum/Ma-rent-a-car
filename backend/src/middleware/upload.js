import multer from "multer";
import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const uploader = multer({
  storage: multer.memoryStorage(), // the file is passed straight on to Cloudinary, nothing is saved on the server
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB
  fileFilter: (req, file, cb) => (TYPES.includes(file.mimetype) ? cb(null, true) : cb(new Error("Only JPG, PNG or WEBP images are allowed"))),
});

let ready = false;
function setup() {
  if (ready) return;
  if (!process.env.CLOUDINARY_URL) throw new Error("Set CLOUDINARY_URL in .env to upload images");
  cloudinary.config(true); // read CLOUDINARY_URL now that .env is loaded
  cloudinary.config({ secure: true });
  ready = true;
}

const send = (buffer) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          public_id: `maa-rent-a-car/${crypto.randomUUID()}`,
          resource_type: "image",
          transformation: [{ width: 1000, height: 1000, crop: "limit", quality: "auto" }], // keeps files small
        },
        (err, result) => (err ? reject(err) : resolve(result))
      )
      .end(buffer);
  });

// our own images only: .../maa-rent-a-car/<id>.jpg  ->  maa-rent-a-car/<id>
const publicIdOf = (url) => (typeof url === "string" ? url.match(/(maa-rent-a-car\/[\w-]+)\.\w+$/)?.[1] : null);
const destroy = (url) => {
  const p = publicIdOf(url);
  return p ? cloudinary.uploader.destroy(p).catch(() => {}) : null;
};

// Reads one image field and puts its Cloudinary address into req.body[field].
// Send the file to add or replace the image; send remove_<field>=true to delete it.
// On an edit that succeeds, the old image is deleted from Cloudinary.
export const imageUpload = (field, Model) => [
  uploader.single(field),
  async (req, res, next) => {
    try {
      const remove = req.body?.[`remove_${field}`] === "true";
      // multipart forms send empty fields as "", so treat them as missing
      for (const k of Object.keys(req.body || {})) if (req.body[k] === "") delete req.body[k];
      delete req.body[`remove_${field}`];

      let newUrl = null;
      if (req.file) {
        setup();
        newUrl = (await send(req.file.buffer)).secure_url;
        req.body[field] = newUrl;
      } else if (remove) {
        req.body[field] = null;
      }

      // an edit that changes the image: remember the old one and delete it once the save worked
      if ((newUrl || remove) && req.method === "PATCH" && Model) {
        const old = (await Model.findById(req.params.id).select(field).lean())?.[field];
        res.on("finish", () => {
          if (old && res.statusCode < 400) destroy(old);
          else if (newUrl && res.statusCode >= 400) destroy(newUrl); // the save failed: do not keep the new upload
        });
      } else if (newUrl) {
        res.on("finish", () => res.statusCode >= 400 && destroy(newUrl)); // a create that failed
      }
      next();
    } catch (e) {
      next(e);
    }
  },
];