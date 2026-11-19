
import bcrypt from "bcrypt";
import Admin from "../models/Admin.js";
import { signIn, signOut } from "../middleware/auth.js";

const ROUNDS = 12;
// compared against when the email is unknown, so a wrong email and a wrong password take the same time
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", ROUNDS);
const view = (a) => ({ id: a._id, name: a.name, email: a.email, role: a.role });

export const login = async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email });
  const ok = await bcrypt.compare(password, admin?.passwordHash || DUMMY_HASH);
  if (!admin || !ok || !admin.isActive) return res.status(401).json({ message: "Wrong email or password" });
  admin.lastLoginAt = new Date();
  await admin.save();
  signIn(res, admin);
  res.json(view(admin));
};

export const logout = (req, res) => {
  signOut(res);
  res.json({ ok: true });
};

export const me = (req, res) => res.json(view(req.admin));

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const admin = await Admin.findById(req.admin._id);
  if (!(await bcrypt.compare(currentPassword, admin.passwordHash))) return res.status(400).json({ message: "The current password is wrong" });
  if (currentPassword === newPassword) return res.status(400).json({ message: "Choose a new password that is different" });
  admin.passwordHash = await bcrypt.hash(newPassword, ROUNDS);
  admin.tokenVersion += 1; // signs out every other device
  await admin.save();
  signIn(res, admin); // this device stays signed in
  res.json({ ok: true });
};
