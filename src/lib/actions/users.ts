"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { createUserSchema, updateUserSchema, type CreateUserInput, type UpdateUserInput } from "@/lib/validations/user";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;

export async function createStaffUser(input: CreateUserInput) {
  const session = await requireRole([...ADMIN_ROLES]);
  const data = createUserSchema.parse(input);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error("A user with that email already exists.");

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
      passwordHash: await bcrypt.hash(data.password, 10),
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "CREATE_USER",
    entityType: "User",
    entityId: user.id,
    after: { name: user.name, email: user.email, role: user.role },
  });

  revalidatePath("/settings/users");
  return user;
}

export async function updateStaffUser(input: UpdateUserInput) {
  const session = await requireRole([...ADMIN_ROLES]);
  const data = updateUserSchema.parse(input);

  const before = await prisma.user.findUniqueOrThrow({ where: { id: data.id } });
  if (before.role === "SUPER_ADMIN") {
    throw new Error("The super admin account can't be edited here.");
  }

  const user = await prisma.user.update({
    where: { id: data.id },
    data: {
      name: data.name,
      role: data.role,
      isActive: data.isActive,
      ...(data.password ? { passwordHash: await bcrypt.hash(data.password, 10) } : {}),
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "UPDATE_USER",
    entityType: "User",
    entityId: user.id,
    before: { name: before.name, role: before.role, isActive: before.isActive },
    after: { name: user.name, role: user.role, isActive: user.isActive },
  });

  revalidatePath("/settings/users");
  return user;
}
