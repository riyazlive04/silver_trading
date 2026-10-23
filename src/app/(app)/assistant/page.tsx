import { ShieldAlert } from "lucide-react";
import { getFeatureFlags } from "@/lib/settings";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AssistantChat } from "@/components/assistant/assistant-chat";

export default async function AssistantPage() {
  const flags = await getFeatureFlags();
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

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
          <AlertTitle>Anthropic API key not configured</AlertTitle>
          <AlertDescription>
            Add <code>ANTHROPIC_API_KEY</code> to the server environment to enable the assistant.
          </AlertDescription>
        </Alert>
      ) : (
        <AssistantChat />
      )}
    </div>
  );
}
