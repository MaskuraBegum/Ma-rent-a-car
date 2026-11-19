// Creates the admin, or resets the password of an existing one.
//   node scripts/create-admin.mjs "Full Name" admin@example.com "a-strong-password"
import "dotenv/config";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Admin from "../models/Admin.js";

const [name, emailRaw, password] = process.argv.slice(2);
if (!name || !emailRaw || !password) {
  console.log('Usage: node scripts/create-admin.mjs "Full Name" admin@example.com "password"');
  process.exit(1);
}
const email = emailRaw.trim().toLowerCase();
if (!/^\S+@\S+\.\S+$/.test(email)) {
  console.log("That email does not look right.");
  process.exit(1);
}
if (password.length < 8) {
  console.log("Use a password of at least 8 characters.");
  process.exit(1);
}

await connectDB();
const passwordHash = await bcrypt.hash(password, 12);
const existing = await Admin.findOne({ email });
if (existing) {
  existing.name = name;
  existing.passwordHash = passwordHash;
  existing.isActive = true;
  existing.tokenVersion += 1; // signs out every old login
  await existing.save();
  console.log(`Password reset for ${email}.`);
} else {
  await Admin.create({ name, email, passwordHash });
  console.log(`Admin created: ${email}`);
}
await mongoose.disconnect();