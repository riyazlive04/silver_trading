"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { saveOpenAIApiKey } from "@/lib/actions/settings";

export function ApiKeyForm({
  maskedApiKey,
  hasStoredApiKey,
}: {
  maskedApiKey: string | null;
  hasStoredApiKey: boolean;
}) {
  const router = useRouter();
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSave = async () => {
    if (!apiKeyInput) return;
    setSubmitting(true);
    try {
      await saveOpenAIApiKey({ openaiApiKey: apiKeyInput });
      toast.success("OpenAI API key saved.");
      setApiKeyInput("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the API key.");
    } finally {
      setSubmitting(false);
    }
  };

  const onClear = async () => {
    setSubmitting(true);
    try {
      await saveOpenAIApiKey({ clearOpenaiApiKey: true });
      toast.success("Stored API key cleared.");
      setApiKeyInput("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not clear the API key.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="size-4" />
          OpenAI API Key
        </CardTitle>
        <CardDescription>
          Powers the AI cover notes and portfolio assistant. Stored encrypted and never shown in full again
          after saving.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Label htmlFor="openaiApiKey">
          {hasStoredApiKey ? `Currently set: ${maskedApiKey}` : "Not configured"}
        </Label>
        <div className="flex gap-2">
          <Input
            id="openaiApiKey"
            type="password"
            autoComplete="off"
            placeholder={hasStoredApiKey ? "Enter a new key to replace it" : "sk-..."}
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
          />
          <Button type="button" disabled={submitting || !apiKeyInput} onClick={onSave}>
            {submitting ? "Saving..." : "Save"}
          </Button>
          {hasStoredApiKey && (
            <Button type="button" variant="outline" disabled={submitting} onClick={onClear}>
              Clear
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
