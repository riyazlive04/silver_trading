"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { clientSchema, type ClientInput } from "@/lib/validations/client";
import { logAudit } from "@/lib/audit";

export async function createClient(input: ClientInput) {
  const session = await requireSession();
  const data = clientSchema.parse(input);

  const client = await prisma.client.create({
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      address: data.address || null,
      panNumber: data.panNumber || null,
      notes: data.notes || null,
      createdById: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "CREATE_CLIENT",
    entityType: "Client",
    entityId: client.id,
    after: client,
  });

  revalidatePath("/clients");
  return client;
}

export async function updateClient(id: string, input: ClientInput) {
  const session = await requireSession();
  const data = clientSchema.parse(input);

  const before = await prisma.client.findUniqueOrThrow({ where: { id } });
  const after = await prisma.client.update({
    where: { id },
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      address: data.address || null,
      panNumber: data.panNumber || null,
      notes: data.notes || null,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "UPDATE_CLIENT",
    entityType: "Client",
    entityId: id,
    before,
    after,
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return after;
}
