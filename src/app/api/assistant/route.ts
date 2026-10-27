import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { requireSession } from "@/lib/auth-guard";
import { getFeatureFlags, getOpenAIApiKey } from "@/lib/settings";
import { ASSISTANT_TOOLS, runAssistantTool } from "@/lib/ai/tools";

const SYSTEM_PROMPT = `You are the portfolio assistant for Sirah Digital's commodity (silver) trading desk, used \
internally by staff and admins. Answer questions about the investment portfolio using the provided tools — never \
guess numbers, always call a tool to get real data. Be concise and use Indian Rupee formatting as given by the \
tools. You can only read data; you cannot create, edit, or delete anything. If asked to do something outside \
answering portfolio questions, politely decline.`;

const MODEL = process.env.OPENAI_MODEL || "gpt-4o";
const MAX_TOOL_ROUNDS = 4;

export async function POST(req: NextRequest) {
  await requireSession();

  const flags = await getFeatureFlags();
  const apiKey = await getOpenAIApiKey();
  if (!flags.aiSuiteEnabled) {
    return NextResponse.json({ error: "The AI suite is currently disabled by a super admin." }, { status: 403 });
  }
  if (!apiKey) {
    return NextResponse.json(
      { error: "No OpenAI API key configured. Add one under Settings → Platform." },
      { status: 503 }
    );
  }

  const body = await req.json();
  const userMessages: ChatCompletionMessageParam[] = Array.isArray(body?.messages) ? body.messages : [];
  if (userMessages.length === 0) {
    return NextResponse.json({ error: "No messages provided." }, { status: 400 });
  }

  const client = new OpenAI({ apiKey });
  const messages: ChatCompletionMessageParam[] = [{ role: "system", content: SYSTEM_PROMPT }, ...userMessages];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await client.chat.completions.create({
      model: MODEL,
      max_completion_tokens: 1024,
      tools: ASSISTANT_TOOLS,
      messages,
    });

    const message = response.choices[0]?.message;
    const toolCalls = message?.tool_calls ?? [];

    if (toolCalls.length === 0 || response.choices[0]?.finish_reason !== "tool_calls") {
      return NextResponse.json({ reply: message?.content ?? "" });
    }

    messages.push(message);

    const toolResults = await Promise.all(
      toolCalls.map(async (call) => {
        const args = call.type === "function" ? safeParseJson(call.function.arguments) : {};
        const result = call.type === "function" ? await runAssistantTool(call.function.name, args) : { error: "Unsupported tool call type." };
        return {
          role: "tool" as const,
          tool_call_id: call.id,
          content: JSON.stringify(result),
        };
      })
    );

    messages.push(...toolResults);
  }

  return NextResponse.json(
    { error: "The assistant took too many steps to answer. Try a more specific question." },
    { status: 500 }
  );
}

function safeParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}
