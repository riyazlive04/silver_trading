import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { auth } from "@/auth";
import { getFeatureFlags, getOpenAIApiKey } from "@/lib/settings";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AssistantChat } from "@/components/assistant/assistant-chat";

export default async function AssistantPage() {
  const [session, flags, apiKey] = await Promise.all([auth(), getFeatureFlags(), getOpenAIApiKey()]);
  const hasApiKey = !!apiKey;
  const isSuperAdmin = session?.user.role === "SUPER_ADMIN";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Assistant</h1>
        <p className="text-sm text-muted-foreground">Ask natural-language questions about the portfolio.</p>
      </div>

      {!flags.aiSuiteEnabled ? (
        <Alert variant="destructive">
          <ShieldAlert className="size-4" />
          <AlertTitle>AI Suite is disabled</AlertTitle>
          <AlertDescription>
            A super admin has turned off the AI suite under Settings → Platform. Ask them to re-enable it to use
            the assistant.
          </AlertDescription>
        </Alert>
      ) : !hasApiKey ? (
        <Alert variant="destructive">
          <ShieldAlert className="size-4" />
          <AlertTitle>OpenAI API key not configured</AlertTitle>
          <AlertDescription>
            {isSuperAdmin ? (
              <>
                Add one under{" "}
                <Link href="/settings/platform" className="underline">
                  Settings → Platform
                </Link>
                .
              </>
            ) : (
              "Ask a super admin to add one under Settings → Platform."
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <AssistantChat />
      )}
    </div>
  );
}
