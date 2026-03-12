# Next Training

Теперь это единое приложение `Next.js`: аркада и серверный leaderboard живут вместе.

## Локальный запуск

```powershell
cd D:\Codex\1\next-training
docker compose up -d
npm run dev
```

Открыть:
- приложение: http://localhost:3000
- API: http://localhost:3000/api/leaderboard?game=snake

## Деплой на Railway

Подходит один сервис `Node.js app` + отдельная база `PostgreSQL`.

1. Загрузите `next-training` в GitHub.
2. В Railway создайте новый проект из GitHub-репозитория.
3. В этом же проекте добавьте `PostgreSQL`.
4. В переменные приложения добавьте `DATABASE_URL` из Railway Postgres.
5. Для сервиса укажите корневую папку проекта: `next-training`, если репозиторий содержит и другие каталоги.
6. Railway сам выполнит:
   - `npm install`
   - `npm run build`
   - `npm run start`

`npm run start` уже настроен так, чтобы перед запуском приложения применялись Prisma migration через `prisma migrate deploy`.

## Что внутри

- `src/app/page.tsx` — сама мини-аркада
- `public/snake-game.js` — клиентская игровая логика
- `src/app/globals.css` — стили аркады
- `src/app/api/leaderboard/route.ts` — общий leaderboard API
- `prisma/schema.prisma` — модели `User`, `LeaderboardEntry`, enum `GameKey`
- `compose.yaml` — локальный PostgreSQL через Docker

## Что проверить после деплоя

- главная страница открывает аркаду
- leaderboard справа показывает серверный топ
- после завершения партии результат сохраняется
- после обновления страницы результаты остаются
