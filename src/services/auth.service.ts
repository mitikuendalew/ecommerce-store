import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { AppError, unauthorized } from "@/lib/errors";
import { signToken } from "@/lib/auth";
import type { LoginInput, RegisterInput } from "@/lib/validators";

const safeUserSelect = { id: true, email: true, name: true, role: true, createdAt: true } as const;

// Compared against when the email doesn't exist, so response time doesn't reveal which emails are registered.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hash("not-a-real-password", 12));

export async function registerUser(input: RegisterInput) {
  const exists = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (exists) throw new AppError(409, "EMAIL_TAKEN", "An account with this email already exists");

  const passwordHash = await bcrypt.hash(input.password, 12);

  // Role is never taken from client input — new accounts are always CUSTOMER.
  // (A race between the check above and this insert is caught by the unique index → 409 via the error mapper.)
  const user = await prisma.user.create({
    data: { email: input.email, name: input.name, passwordHash, role: "CUSTOMER" },
    select: safeUserSelect,
  });

  const token = await signToken({ userId: user.id, role: user.role });
  return { user, token };
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  const valid = await bcrypt.compare(input.password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !valid) throw unauthorized("Invalid email or password");

  const token = await signToken({ userId: user.id, role: user.role });
  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt },
    token,
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: safeUserSelect });
  if (!user) throw unauthorized("Account no longer exists");
  return user;
}

export async function updateProfile(userId: string, name: string) {
  return prisma.user.update({ where: { id: userId }, data: { name }, select: safeUserSelect });
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw unauthorized("Account no longer exists");

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new AppError(400, "WRONG_PASSWORD", "Your current password is incorrect");

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(newPassword, 12) },
  });
}
