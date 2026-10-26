import bcrypt from 'bcrypt';
import { UserModel, toPublicUser } from '../models/user.model';
import { ApiError } from '../utils/ApiError';
import { AuthService } from './auth.service';

export const UserService = {
  async updateProfile(userId: number, input: {
    firstName: string; lastName: string; email: string; phone?: string; address?: string; currentPassword?: string;
  }) {
    const user = (await UserModel.findById(userId))!;
    if (input.email !== user.email) {
      // Changing the login email is sensitive: require the current password.
      if (!input.currentPassword || !(await bcrypt.compare(input.currentPassword, user.password_hash))) {
        throw new ApiError(422, 'Enter your current password to change your email.');
      }
      if (await UserModel.findByEmail(input.email)) throw ApiError.conflict('An account with this email already exists.');
    }
    await UserModel.updateProfile(userId, input);
    return toPublicUser((await UserModel.findById(userId))!);
  },

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = (await UserModel.findById(userId))!;
    if (!(await bcrypt.compare(currentPassword, user.password_hash))) {
      throw new ApiError(422, 'Current password is incorrect.');
    }
    if (currentPassword === newPassword) throw new ApiError(422, 'New password must be different from the current one.');
    await UserModel.updatePassword(userId, await AuthService.hashPassword(newPassword));
  },
};
