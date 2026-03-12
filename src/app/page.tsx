import Script from "next/script";

export default function HomePage() {
  return (
    <>
      <main className="app">
        <section className="panel">
          <header className="hero">
            <div>
              <p className="eyebrow">Мини-аркада</p>
              <h1>Выберите игру</h1>
              <p id="hero-subtitle" className="hero__subtitle">
                Шесть классических игр в одном окне: Змейка, Тетрис, 2048, Арканоид, Мемори и Pong.
              </p>
            </div>
            <div className="scoreboard scoreboard--wide" aria-live="polite">
              <div className="scoreboard__item">
                <span id="primary-score-label" className="scoreboard__label">Игра</span>
                <strong id="primary-score-value">Меню</strong>
              </div>
              <div className="scoreboard__item">
                <span id="secondary-score-label" className="scoreboard__label">Статус</span>
                <strong id="secondary-score-value">Готово</strong>
              </div>
            </div>
          </header>

          <div className="toolbar">
            <p id="status" className="status">Откройте любую игру из меню ниже.</p>
            <div className="actions">
              <button id="menu-button" type="button">Главное меню</button>
              <button id="restart-button" type="button">Новая игра</button>
              <button id="pause-button" type="button">Пауза</button>
            </div>
          </div>

          <section id="menu-screen" className="screen screen--active" aria-label="Меню выбора игр">
            <div className="menu-grid">
              <button className="menu-card" type="button" data-select-game="snake">
                <span className="menu-card__eyebrow">Классика</span>
                <strong>Змейка</strong>
                <span>Растите, собирайте еду и не врезайтесь в стены.</span>
              </button>
              <button className="menu-card" type="button" data-select-game="tetris">
                <span className="menu-card__eyebrow">Пазл</span>
                <strong>Тетрис</strong>
                <span>Собирайте линии и не дайте стакану заполниться.</span>
              </button>
              <button className="menu-card" type="button" data-select-game="2048">
                <span className="menu-card__eyebrow">Логика</span>
                <strong>2048</strong>
                <span>Складывайте одинаковые плитки и доберитесь до 2048.</span>
              </button>
              <button className="menu-card" type="button" data-select-game="arkanoid">
                <span className="menu-card__eyebrow">Аркада</span>
                <strong>Арканоид</strong>
                <span>Отбивайте мяч, ломайте блоки и берегите жизни.</span>
              </button>
              <button className="menu-card" type="button" data-select-game="memory">
                <span className="menu-card__eyebrow">Память</span>
                <strong>Мемори</strong>
                <span>Открывайте пары карточек и очищайте поле за минимум ходов.</span>
              </button>
              <button className="menu-card" type="button" data-select-game="pong">
                <span className="menu-card__eyebrow">Дуэль</span>
                <strong>Pong</strong>
                <span>Удерживайте ракетку, переигрывайте ИИ и не теряйте мячи.</span>
              </button>
            </div>
          </section>

          <section id="game-screen" className="screen" aria-label="Экран игры">
            <div className="game-frame">
              <div id="snake-view" className="game-view">
                <div id="snake-board" className="board board--snake" role="grid" aria-live="polite" />
              </div>

              <div id="tetris-view" className="game-view">
                <div className="split-layout">
                  <div id="tetris-board" className="board board--tetris" role="grid" aria-live="polite" />
                  <aside className="side-card">
                    <p className="side-card__label">Следующая фигура</p>
                    <div id="tetris-next" className="mini-board" aria-live="polite" />
                    <p className="side-card__label">Линии</p>
                    <strong id="tetris-lines">0</strong>
                  </aside>
                </div>
              </div>

              <div id="game2048-view" className="game-view">
                <div id="game2048-board" className="board board--2048" aria-live="polite" />
              </div>

              <div id="arkanoid-view" className="game-view">
                <canvas id="arkanoid-canvas" className="arcade-canvas" width={480} height={320} />
              </div>

              <div id="memory-view" className="game-view">
                <div id="memory-board" className="board board--memory" aria-live="polite" />
              </div>

              <div id="pong-view" className="game-view">
                <canvas id="pong-canvas" className="arcade-canvas" width={480} height={320} />
              </div>
            </div>

            <section className="controls" aria-label="Экранные кнопки управления">
              <div id="control-pad" className="controls__grid">
                <button className="control" type="button" data-control="up">↑</button>
                <button className="control" type="button" data-control="left">←</button>
                <button className="control" type="button" data-control="down">↓</button>
                <button className="control" type="button" data-control="right">→</button>
              </div>
            </section>

            <section className="help">
              <p id="help-text">Выберите игру, чтобы увидеть управление.</p>
            </section>

            <section id="leaderboard-panel" className="leaderboard">
              <div className="leaderboard__header">
                <div>
                  <h2 id="leaderboard-title">Топ-10</h2>
                  <p id="leaderboard-metric" className="leaderboard__metric">Лучшие результаты этой игры.</p>
                </div>
                <p id="leaderboard-connection" className="leaderboard__connection leaderboard__connection--idle">
                  Сервер: не проверен
                </p>
              </div>
              <p id="leaderboard-empty" className="leaderboard__empty">Пока нет сохраненных результатов.</p>
              <ol id="leaderboard-list" className="leaderboard__list" />
              <form id="leaderboard-form" className="leaderboard__form is-hidden">
                <label className="leaderboard__label" htmlFor="leaderboard-name">Ваше имя</label>
                <div className="leaderboard__form-row">
                  <input
                    id="leaderboard-name"
                    className="leaderboard__input"
                    type="text"
                    maxLength={12}
                    placeholder="Игрок"
                    autoComplete="nickname"
                  />
                  <button type="submit">Сохранить результат</button>
                </div>
              </form>
            </section>
          </section>
        </section>
      </main>

      <Script src="/snake-game.js" strategy="afterInteractive" />
    </>
  );
}
