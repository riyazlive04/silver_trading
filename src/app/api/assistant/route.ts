import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireSession } from "@/lib/auth-guard";
import { getFeatureFlags } from "@/lib/settings";
import { ASSISTANT_TOOLS, runAssistantTool } from "@/lib/ai/tools";

const SYSTEM_PROMPT = `You are the portfolio assistant for Sirah Digital's commodity (silver) trading desk, used \
internally by staff and admins. Answer questions about the investment portfolio using the provided tools — never \
guess numbers, always call a tool to get real data. Be concise and use Indian Rupee formatting as given by the \
tools. You can only read data; you cannot create, edit, or delete anything. If asked to do something outside \
answering portfolio questions, politely decline.`;

const MAX_TOOL_ROUNDS = 4;

export async function POST(req: NextRequest) {
  await requireSession();

  const flags = await getFeatureFlags();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!flags.aiSuiteEnabled) {
    return NextResponse.json({ error: "The AI suite is currently disabled by a super admin." }, { status: 403 });
  }
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured on the server." }, { status: 503 });
  }

  const body = await req.json();
  const userMessages: Anthropic.MessageParam[] = Array.isArray(body?.messages) ? body.messages : [];
  if (userMessages.length === 0) {
    return NextResponse.json({ error: "No messages provided." }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });
  const messages: Anthropic.MessageParam[] = [...userMessages];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await client.messages.create({
      model: "claude-sonnet-5-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: ASSISTANT_TOOLS,
      messages,
    });

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );

    if (toolUseBlocks.length === 0 || response.stop_reason !== "tool_use") {
      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((b) => b.text)
        .join("\n");
      return NextResponse.json({ reply: text });
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUseBlocks.map(async (block) => ({
        type: "tool_result" as const,
        tool_use_id: block.id,
        content: JSON.stringify(await runAssistantTool(block.name, block.input)),
      }))
    );

    messages.push({ role: "user", content: toolResults });
  }

  return NextResponse.json(
    { error: "The assistant took too many steps to answer. Try a more specific question." },
    { status: 500 }
  );
}
