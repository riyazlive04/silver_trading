import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-background via-background to-secondary/60 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-lg font-semibold tracking-tight">
            SD
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Sirah Digital</h1>
          <p className="text-sm text-muted-foreground">Commodity Trading Desk — internal access only</p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
