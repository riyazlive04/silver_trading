import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";
import { PasswordOnlyLoginForm } from "@/components/auth/password-only-login-form";
import { ADMIN_LOGIN_EMAIL } from "@/lib/auth-shortcuts";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-background via-background to-secondary/60 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="size-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Sirah Digital</h1>
          <p className="text-sm text-muted-foreground">Admin access</p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <Suspense>
            <PasswordOnlyLoginForm email={ADMIN_LOGIN_EMAIL} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
