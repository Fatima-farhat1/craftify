import { pool } from '../config/db';
import { UserModel } from '../models/user.model';
import { AuthService } from '../services/auth.service';

async function seed() {
  if (await UserModel.adminExists()) {
    console.log('Admin already exists. Nothing to do.');
    return;
  }
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!email || password.length < 8) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (8+ chars) in .env');

  await UserModel.create({
    firstName: process.env.ADMIN_FIRST_NAME || 'Craftify',
    lastName: process.env.ADMIN_LAST_NAME || 'Admin',
    email,
    passwordHash: await AuthService.hashPassword(password),
    role: 'ADMIN',
  });
  console.log(`Admin created: ${email}`);
}

seed().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => pool.end());
