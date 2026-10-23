"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { clientSchema, type ClientInput } from "@/lib/validations/client";
import { createClient, updateClient } from "@/lib/actions/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ClientForm({
  client,
  onSuccess,
}: {
  client?: { id: string; name: string; phone: string; email: string | null; address: string | null; panNumber: string | null; notes: string | null };
  onSuccess?: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: client
      ? {
          name: client.name,
          phone: client.phone,
          email: client.email ?? "",
          address: client.address ?? "",
          panNumber: client.panNumber ?? "",
          notes: client.notes ?? "",
        }
      : undefined,
  });

  const onSubmit = async (values: ClientInput) => {
    setSubmitting(true);
    try {
      if (client) {
        await updateClient(client.id, values);
        toast.success("Client updated.");
      } else {
        await createClient(values);
        toast.success("Client added.");
      }
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" {...register("name")} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...register("phone")} />
          {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email (optional)</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="panNumber">PAN (optional)</Label>
          <Input id="panNumber" {...register("panNumber")} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="address">Address (optional)</Label>
        <Textarea id="address" rows={2} {...register("address")} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" rows={2} {...register("notes")} />
      </div>
      <Button type="submit" disabled={submitting} className="mt-1 self-end">
        {submitting ? "Saving..." : client ? "Save changes" : "Add client"}
      </Button>
    </form>
  );
}
