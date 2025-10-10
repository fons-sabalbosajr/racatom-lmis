import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/UserAccount.js';

dotenv.config({ override: true });

async function main() {
  const MONGO_URI = process.env.MONGO_URI;
  const DB_NAME = process.env.MONGO_DB_NAME; // optional; can be undefined
  if (!MONGO_URI) {
    console.error('Missing MONGO_URI in .env');
    process.exit(1);
  }
  await mongoose.connect(MONGO_URI, DB_NAME ? { dbName: DB_NAME } : undefined);

  const Username = process.env.SEED_ADMIN_USERNAME || 'admin';
  const Password = process.env.SEED_ADMIN_PASSWORD || 'admin123';
  const Email = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';

  const existing = await User.findOne({ Username });
  if (existing) {
    console.log(`User '${Username}' already exists. Nothing to do.`);
    await mongoose.disconnect();
    process.exit(0);
  }

  const hashed = await bcrypt.hash(Password, 10);
  const user = new User({
    SystemID: 'RCT-U1001-AD',
    FullName: 'System Administrator',
    Position: 'Administrator',
    Email,
    Username,
    Password: hashed,
    Designation: 'Administrator',
    isVerified: true,
  });

  await user.save();
  console.log('Seeded admin user:');
  console.log({ Username, Password, Email });

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
