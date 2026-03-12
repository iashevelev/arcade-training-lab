export const uiGames = ["snake", "tetris", "2048", "arkanoid", "memory"] as const;

export type UiGame = (typeof uiGames)[number];
export type DbGame = "snake" | "tetris" | "game2048" | "arkanoid" | "memory";

export const gameMap: Record<UiGame, DbGame> = {
  snake: "snake",
  tetris: "tetris",
  "2048": "game2048",
  arkanoid: "arkanoid",
  memory: "memory",
};

export function isUiGame(value: string): value is UiGame {
  return uiGames.includes(value as UiGame);
}
