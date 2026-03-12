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

const postSchema = z.object({
  game: z.string(),
  name: z.string().trim().min(1).max(12),
  score: z.number().int().min(0).max(1_000_000),
});

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

  const { game, name, score } = parsed.data;

  if (!isUiGame(game)) {
    return NextResponse.json({ error: "Invalid game" }, { status: 400, headers: corsHeaders });
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