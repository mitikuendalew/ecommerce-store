import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { users } from "../../db/schema";
import { AppError, unauthorized } from "@/lib/errors";
import { signToken } from "@/lib/auth";
import type { LoginInput, RegisterInput } from "@/lib/validators";

const safeUserSelect = {
  id: users.id,
  email: users.email,
  name: users.name,
  role: users.role,
  createdAt: users.createdAt,
};

const findByEmail = async (email: string) => (await db.select().from(users).where(eq(users.email, email)))[0];
const findById = async (id: string) => (await db.select().from(users).where(eq(users.id, id)))[0];

// Compared against when the email doesn't exist, so response time doesn't reveal which emails are registered.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hash("not-a-real-password", 12));

export async function registerUser(input: RegisterInput) {
  const exists = await findByEmail(input.email);
  if (exists) throw new AppError(409, "EMAIL_TAKEN", "An account with this email already exists");

  const passwordHash = await bcrypt.hash(input.password, 12);

  // Role is never taken from client input — new accounts are CUSTOMER, except the store owner's
  // email from the ADMIN_EMAIL env var, which is the only way to bootstrap an admin.
  // (A race between the check above and this insert is caught by the unique index → 409 via the error mapper.)
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      name: input.name,
      passwordHash,
      role: adminEmail && input.email === adminEmail ? "ADMIN" : "CUSTOMER",
    })
    .returning(safeUserSelect);

  const token = await signToken({ userId: user.id, role: user.role });
  return { user, token };
}

export async function loginUser(input: LoginInput) {
  const user = await findByEmail(input.email);

  const valid = await bcrypt.compare(input.password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !valid) throw unauthorized("Invalid email or password");

  const token = await signToken({ userId: user.id, role: user.role });
  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt },
    token,
  };
}

export async function getCurrentUser(userId: string) {
  const [user] = await db.select(safeUserSelect).from(users).where(eq(users.id, userId));
  if (!user) throw unauthorized("Account no longer exists");
  return user;
}

export async function updateProfile(userId: string, name: string) {
  const [user] = await db.update(users).set({ name }).where(eq(users.id, userId)).returning(safeUserSelect);
  if (!user) throw unauthorized("Account no longer exists");
  return user;
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await findById(userId);
  if (!user) throw unauthorized("Account no longer exists");

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new AppError(400, "WRONG_PASSWORD", "Your current password is incorrect");

  await db
    .update(users)
    .set({ passwordHash: await bcrypt.hash(newPassword, 12) })
    .where(eq(users.id, userId));
}
