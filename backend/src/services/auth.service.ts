import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { UserModel, UserRow, toPublicUser } from '../models/user.model';
import { AuthUser } from '../types';
import { ApiError } from '../utils/ApiError';

const SALT_ROUNDS = 12;

function signToken(user: UserRow): string {
  const payload: AuthUser = { id: user.id, email: user.email, role: user.role };
  return jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn } as SignOptions);
}

export const AuthService = {
  hashPassword: (plain: string) => bcrypt.hash(plain, SALT_ROUNDS),

  async register(input: { firstName: string; lastName: string; email: string; password: string }) {
    if (await UserModel.findByEmail(input.email)) {
      throw ApiError.conflict('An account with this email already exists.');
    }
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    // Role is NEVER taken from the request: public registration always creates a USER.
    const id = await UserModel.create({
      firstName: input.firstName, lastName: input.lastName, email: input.email, passwordHash, role: 'USER',
    });
    const user = (await UserModel.findById(id))!;
    return { token: signToken(user), user: toPublicUser(user) };
  },

  async login(email: string, password: string, adminOnly = false) {
    const user = await UserModel.findByEmail(email);
    // Same message for unknown email / wrong password / wrong portal: avoids account enumeration.
    const invalid = ApiError.unauthorized('Invalid email or password.');
    if (!user) throw invalid;
    if (!(await bcrypt.compare(password, user.password_hash))) throw invalid;
    if (adminOnly && user.role !== 'ADMIN') throw invalid;
    if (!user.is_active) throw ApiError.forbidden('This account has been deactivated.');
    return { token: signToken(user), user: toPublicUser(user) };
  },

  async me(userId: number) {
    const user = await UserModel.findById(userId);
    if (!user) throw ApiError.notFound('User not found.');
    return toPublicUser(user);
  },
};
