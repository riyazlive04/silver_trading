"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createStaffUser, updateStaffUser } from "@/lib/actions/users";

type EditableRole = "ADMIN" | "STAFF";

interface ExistingUser {
  id: string;
  name: string;
  email: string;
  role: EditableRole | "SUPER_ADMIN";
  isActive: boolean;
}

export function UserDialog({ user }: { user?: ExistingUser }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const initialRole: EditableRole = user && user.role !== "SUPER_ADMIN" ? user.role : "STAFF";

  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      role: initialRole,
      isActive: user?.isActive ?? true,
      password: "",
    },
  });

  const role = watch("role");
  const isActive = watch("isActive");

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      if (user) {
        await updateStaffUser({
          id: user.id,
          name: values.name,
          role: values.role,
          isActive: values.isActive,
          password: values.password || undefined,
        });
        toast.success("User updated.");
      } else {
        if (!values.password) {
          toast.error("Set a password for the new user.");
          return;
        }
        await createStaffUser({
          name: values.name,
          email: values.email,
          role: values.role,
          password: values.password,
        });
        toast.success("User created.");
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save user.");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {user ? (
          <Button variant="outline" size="sm">
            <Pencil className="size-4" />
            Edit
          </Button>
        ) : (
          <Button>
            <Plus className="size-4" />
            New User
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{user ? "Edit user" : "Add a staff/admin user"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" disabled={!!user} {...register("email")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setValue("role", v as EditableRole)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STAFF">Staff</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">{user ? "New password (optional)" : "Password"}</Label>
            <Input id="password" type="password" {...register("password")} />
          </div>
          {user && (
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <Label htmlFor="isActive" className="font-normal">
                Account active
              </Label>
              <Switch id="isActive" checked={isActive} onCheckedChange={(v) => setValue("isActive", v)} />
            </div>
          )}
          <Button type="submit" disabled={submitting} className="self-end">
            {submitting ? "Saving..." : user ? "Save changes" : "Create user"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
