/**
 * Changes the password of an existing user (use it to replace the public demo
 * admin password before deploying).
 *
 * Run with (from the backend folder):
 *   node seed/setAdminPassword.js admin@example.com YourNewPassword
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.log("Usage: node seed/setAdminPassword.js <email> <new-password>");
    process.exit(1);
  }
  if (password.length < 8) {
    console.log("Please use a password with at least 8 characters.");
    process.exit(1);
  }

  await connectDB();
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    console.log(`No user found with email ${email}`);
    process.exit(1);
  }
  user.passwordHash = await bcrypt.hash(password, 10);
  await user.save();
  console.log(`Password updated for ${user.email} (role: ${user.role})`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
