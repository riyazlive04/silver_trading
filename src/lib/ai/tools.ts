import type { OpenAI } from "openai";
import { prisma } from "@/lib/prisma";
import { formatINR, formatDate } from "@/lib/format";

/**
 * Whitelisted, read-only query functions the assistant can call. Each is a safe,
 * parameterized Prisma query — the model never gets raw SQL access.
 */

async function getAUMSummary() {
  const [active, aum, closed, cancelled] = await Promise.all([
    prisma.investment.count({ where: { status: "ACTIVE" } }),
    prisma.investment.aggregate({ where: { status: "ACTIVE" }, _sum: { principalAmount: true } }),
    prisma.investment.count({ where: { status: "CLOSED" } }),
    prisma.investment.count({ where: { status: "CANCELLED" } }),
  ]);
  return {
    activeInvestments: active,
    totalAUM: formatINR(aum._sum.principalAmount ?? 0),
    closedInvestments: closed,
    cancelledInvestments: cancelled,
  };
}

async function getUpcomingPayouts(args: { days: number }) {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + Math.min(Math.max(args.days, 1), 365));

  const entries = await prisma.repaymentEntry.findMany({
    where: { dueDate: { gte: now, lte: end }, status: "PENDING", investment: { status: "ACTIVE" } },
    include: { investment: { include: { client: true } } },
    orderBy: { dueDate: "asc" },
    take: 50,
  });

  return {
    count: entries.length,
    totalAmount: formatINR(entries.reduce((sum, e) => sum + e.totalPayout, 0)),
    entries: entries.map((e) => ({
      client: e.investment.client.name,
      dueDate: formatDate(e.dueDate),
      amount: formatINR(e.totalPayout),
    })),
  };
}

async function getInvestmentsMaturingBetween(args: { startDate: string; endDate: string }) {
  const start = new Date(args.startDate);
  const end = new Date(args.endDate);

  const investments = await prisma.investment.findMany({
    where: { status: "ACTIVE", maturityDate: { gte: start, lte: end } },
    include: { client: true },
    orderBy: { maturityDate: "asc" },
    take: 50,
  });

  return {
    count: investments.length,
    investments: investments.map((inv) => ({
      client: inv.client.name,
      principal: formatINR(inv.principalAmount),
      maturityDate: formatDate(inv.maturityDate),
      tenureYears: inv.tenureYears,
    })),
  };
}

async function getClientPortfolio(args: { clientName: string }) {
  const clients = await prisma.client.findMany({
    where: { name: { contains: args.clientName } },
    include: { investments: true },
    take: 5,
  });

  return {
    matches: clients.map((client) => ({
      name: client.name,
      phone: client.phone,
      investments: client.investments.map((inv) => ({
        principal: formatINR(inv.principalAmount),
        tenureYears: inv.tenureYears,
        status: inv.status,
        maturityDate: formatDate(inv.maturityDate),
      })),
    })),
  };
}

async function getOverduePayouts() {
  const now = new Date();
  const entries = await prisma.repaymentEntry.findMany({
    where: { dueDate: { lt: now }, status: "PENDING", investment: { status: "ACTIVE" } },
    include: { investment: { include: { client: true } } },
    orderBy: { dueDate: "asc" },
    take: 50,
  });

  return {
    count: entries.length,
    totalAmount: formatINR(entries.reduce((sum, e) => sum + e.totalPayout, 0)),
    entries: entries.map((e) => ({
      client: e.investment.client.name,
      dueDate: formatDate(e.dueDate),
      amount: formatINR(e.totalPayout),
    })),
  };
}

export const ASSISTANT_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_aum_summary",
      description: "Get total assets under management and counts of active/closed/cancelled investments.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_upcoming_payouts",
      description: "List payouts due in the next N days across all active investments.",
      parameters: {
        type: "object",
        properties: { days: { type: "number", description: "How many days ahead to look." } },
        required: ["days"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_investments_maturing_between",
      description: "List active investments maturing within a date range.",
      parameters: {
        type: "object",
        properties: {
          startDate: { type: "string", description: "ISO date, inclusive." },
          endDate: { type: "string", description: "ISO date, inclusive." },
        },
        required: ["startDate", "endDate"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_client_portfolio",
      description: "Look up a client by (partial) name and list all of their investments.",
      parameters: {
        type: "object",
        properties: { clientName: { type: "string" } },
        required: ["clientName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_overdue_payouts",
      description: "List payouts that are past their due date and still marked pending.",
      parameters: { type: "object", properties: {} },
    },
  },
];

const HANDLERS: Record<string, (args: never) => Promise<unknown>> = {
  get_aum_summary: getAUMSummary,
  get_upcoming_payouts: getUpcomingPayouts as (args: never) => Promise<unknown>,
  get_investments_maturing_between: getInvestmentsMaturingBetween as (args: never) => Promise<unknown>,
  get_client_portfolio: getClientPortfolio as (args: never) => Promise<unknown>,
  get_overdue_payouts: getOverduePayouts,
};

export async function runAssistantTool(name: string, input: unknown): Promise<unknown> {
  const handler = HANDLERS[name];
  if (!handler) return { error: `Unknown tool: ${name}` };
  try {
    return await handler(input as never);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Tool execution failed." };
  }
}
