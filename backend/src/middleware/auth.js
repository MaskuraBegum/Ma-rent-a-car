import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

const COOKIE = "token";
const MAX_AGE_MS = 12 * 60 * 60 * 1000; // one working day

export const cookieOptions = () => ({
  httpOnly: true, // the page's JavaScript cannot read it
  sameSite: process.env.COOKIE_SAMESITE || "lax", // "none" only if the site and the API are on different domains
  secure: process.env.NODE_ENV === "production" || process.env.COOKIE_SAMESITE === "none",
  maxAge: MAX_AGE_MS,
  path: "/",
});

export function signIn(res, admin) {
  const token = jwt.sign({ sub: String(admin._id), v: admin.tokenVersion }, process.env.JWT_SECRET, { expiresIn: "12h" });
  res.cookie(COOKIE, token, cookieOptions());
}
export const signOut = (res) => res.clearCookie(COOKIE, { ...cookieOptions(), maxAge: undefined });

const deny = (res) => res.status(401).json({ message: "Please sign in" });

// Everything behind this needs a signed-in, active admin
export async function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = req.cookies?.[COOKIE] || (header.startsWith("Bearer ") ? header.slice(7) : null);
  if (!token) return deny(res);
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return deny(res);
  }
  const admin = await Admin.findById(payload.sub).select("name email role isActive tokenVersion");
  if (!admin || !admin.isActive || admin.tokenVersion !== payload.v) return deny(res);
  req.admin = admin;
  next();
}