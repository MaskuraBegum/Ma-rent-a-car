import bcrypt from "bcrypt";
import Admin from "../models/Admin.js";
import { signIn } from "../middleware/auth.js";

const view = (a) => ({ id: a._id, name: a.name, email: a.email, isActive: a.isActive, lastLoginAt: a.lastLoginAt, createdAt: a.createdAt });
const hash = (p) => bcrypt.hash(p, 12);

export const list = async (req, res) => res.json((await Admin.find().sort({ createdAt: 1 })).map(view));

export const create = async (req, res) => {
  const { name, email, password } = req.body;
  const admin = await Admin.create({ name, email, passwordHash: await hash(password) });
  res.status(201).json(view(admin));
};

export const setActive = async (req, res) => {
  const admin = await Admin.findById(req.params.id);
  if (!admin) return res.status(404).json({ message: "Admin not found" });
  const { isActive } = req.body;
  if (!isActive) {
    if (String(admin._id) === String(req.admin._id)) return res.status(400).json({ message: "You cannot deactivate your own account" });
    const others = await Admin.countDocuments({ isActive: true, _id: { $ne: admin._id } });
    if (!others) return res.status(400).json({ message: "At least one active admin is needed" });
    admin.tokenVersion += 1; // signs them out everywhere
  }
  admin.isActive = isActive;
  await admin.save();
  res.json(view(admin));
};

export const resetPassword = async (req, res) => {
  const admin = await Admin.findById(req.params.id);
  if (!admin) return res.status(404).json({ message: "Admin not found" });
  admin.passwordHash = await hash(req.body.password);
  admin.tokenVersion += 1; // old logins stop working
  await admin.save();
  if (String(admin._id) === String(req.admin._id)) signIn(res, admin); // stay signed in on this device
  res.json({ ok: true });
};