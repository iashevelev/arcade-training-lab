import { GameKey } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { gameMap, isUiGame } from "@/lib/games";
import { prisma } from "@/lib/prisma";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_COUNT = 15;
const RATE_LIMIT_MIN_INTERVAL_MS = 4 * 1000;
const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;

const rateLimitStore = new Map<string, number[]>();
const duplicateStore = new Map<string, number>();

const postSchema = z.object({
  game: z.string(),
  name: z.string().trim().min(1).max(12),
  score: z.number().int().min(0).max(1_000_000),
});

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return request.headers.get("x-real-ip") || "unknown";
}

function sanitizeName(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 12);
}

function checkRateLimit(key: string, now: number) {
  const recent = (rateLimitStore.get(key) || []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  const last = recent[recent.length - 1];

  if (last && now - last < RATE_LIMIT_MIN_INTERVAL_MS) {
    return "Слишком часто. Подождите пару секунд и попробуйте снова.";
  }

  if (recent.length >= RATE_LIMIT_COUNT) {
    return "Слишком много попыток за короткое время. Попробуйте позже.";
  }

  recent.push(now);
  rateLimitStore.set(key, recent);
  return null;
}

function checkDuplicate(key: string, now: number) {
  const previous = duplicateStore.get(key);
  if (previous && now - previous < DUPLICATE_WINDOW_MS) {
    return "Похожий результат уже был недавно сохранен.";
  }

  duplicateStore.set(key, now);
  return null;
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(request: NextRequest) {
  const game = request.nextUrl.searchParams.get("game");

  if (!game || !isUiGame(game)) {
    return NextResponse.json({ error: "Invalid game" }, { status: 400, headers: corsHeaders });
  }

  const entries = await prisma.leaderboardEntry.findMany({
    where: { game: gameMap[game] as GameKey },
    orderBy: [{ score: "desc" }, { createdAt: "asc" }],
    take: 10,
  });

  return NextResponse.json(entries, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const json = await request.json();
  const parsed = postSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400, headers: corsHeaders }
    );
  }

  const { game, score } = parsed.data;
  const name = sanitizeName(parsed.data.name);

  if (!isUiGame(game)) {
    return NextResponse.json({ error: "Invalid game" }, { status: 400, headers: corsHeaders });
  }

  const now = Date.now();
  const ip = getClientIp(request);
  const rateLimitMessage = checkRateLimit(`${ip}:${game}`, now);
  if (rateLimitMessage) {
    return NextResponse.json({ error: rateLimitMessage }, { status: 429, headers: corsHeaders });
  }

  const duplicateMessage = checkDuplicate(`${ip}:${game}:${name}:${score}`, now);
  if (duplicateMessage) {
    return NextResponse.json({ error: duplicateMessage }, { status: 409, headers: corsHeaders });
  }

  const entry = await prisma.leaderboardEntry.create({
    data: {
      game: gameMap[game] as GameKey,
      name,
      score,
    },
  });

  return NextResponse.json(entry, { status: 201, headers: corsHeaders });
}