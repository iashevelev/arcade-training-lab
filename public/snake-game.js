(() => {
  const LEADERBOARD_API_BASE = (window.ARCADE_API_BASE || "").replace(/\/$/, "");

  const dom = {
    menuScreen: document.querySelector("#menu-screen"),
    gameScreen: document.querySelector("#game-screen"),
    menuButtons: document.querySelectorAll("[data-select-game]"),
    title: document.querySelector("h1"),
    subtitle: document.querySelector("#hero-subtitle"),
    status: document.querySelector("#status"),
    help: document.querySelector("#help-text"),
    primaryLabel: document.querySelector("#primary-score-label"),
    primaryValue: document.querySelector("#primary-score-value"),
    secondaryLabel: document.querySelector("#secondary-score-label"),
    secondaryValue: document.querySelector("#secondary-score-value"),
    menuButton: document.querySelector("#menu-button"),
    restartButton: document.querySelector("#restart-button"),
    pauseButton: document.querySelector("#pause-button"),
    controlButtons: document.querySelectorAll("[data-control]"),
    leaderboardTitle: document.querySelector("#leaderboard-title"),
    leaderboardMetric: document.querySelector("#leaderboard-metric"),
    leaderboardEmpty: document.querySelector("#leaderboard-empty"),
    leaderboardList: document.querySelector("#leaderboard-list"),
    leaderboardForm: document.querySelector("#leaderboard-form"),
    leaderboardName: document.querySelector("#leaderboard-name"),
    leaderboardConnection: document.querySelector("#leaderboard-connection"),
    controlPad: document.querySelector("#control-pad"),
    views: {
      snake: document.querySelector("#snake-view"),
      tetris: document.querySelector("#tetris-view"),
      2048: document.querySelector("#game2048-view"),
      arkanoid: document.querySelector("#arkanoid-view"),
      memory: document.querySelector("#memory-view")
    }
  };

  if (!dom.menuScreen || !dom.gameScreen) {
    return;
  }

  let currentGameId = null;
  let currentGame = null;
  let pendingResult = null;
  let leaderboardSubmitting = false;

  const leaderboardCache = new Map();
  const leaderboardLoading = new Set();
  const leaderboardLoaded = new Set();
  const leaderboardErrors = new Map();

  function setLeaderboardConnection(state, message) {
    if (!dom.leaderboardConnection) {
      return;
    }
    dom.leaderboardConnection.textContent = message;
    dom.leaderboardConnection.className = `leaderboard__connection leaderboard__connection--${state}`;
  }

  function isEditableTarget(target) {
    if (!target || !(target instanceof Element)) {
      return false;
    }
    const tagName = target.tagName;
    return tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT" || target.isContentEditable;
  }

  const updateUi = () => {
    if (!currentGame) {
      dom.title.textContent = "Выберите игру";
      dom.subtitle.textContent = "Пять классических игр в одном окне: Змейка, Тетрис, 2048, Арканоид и Мемори.";
      dom.status.textContent = "Откройте любую игру из меню ниже.";
      dom.help.textContent = "Выберите игру, чтобы увидеть управление.";
      dom.primaryLabel.textContent = "Игра";
      dom.primaryValue.textContent = "Меню";
      dom.secondaryLabel.textContent = "Статус";
      dom.secondaryValue.textContent = "Готово";
      dom.menuButton.disabled = true;
      dom.restartButton.disabled = true;
      dom.pauseButton.disabled = true;
      dom.pauseButton.classList.add("is-hidden");
      dom.controlPad.classList.remove("is-hidden");
      updateLeaderboardUi(null, null);
      setLeaderboardConnection("idle", "Сервер: не проверен");
      return;
    }

    const snapshot = currentGame.getSnapshot();
    dom.title.textContent = snapshot.title;
    dom.subtitle.textContent = snapshot.subtitle;
    dom.status.textContent = snapshot.status;
    dom.help.textContent = snapshot.help;
    dom.primaryLabel.textContent = snapshot.primaryLabel;
    dom.primaryValue.textContent = String(snapshot.primaryValue);
    dom.secondaryLabel.textContent = snapshot.secondaryLabel;
    dom.secondaryValue.textContent = String(snapshot.secondaryValue);
    dom.menuButton.disabled = false;
    dom.restartButton.disabled = false;
    dom.pauseButton.disabled = !snapshot.canPause;
    dom.pauseButton.classList.toggle("is-hidden", !snapshot.showPause);
    dom.pauseButton.textContent = snapshot.pauseLabel || "Пауза";
    dom.controlPad.classList.toggle("is-hidden", snapshot.showControls === false);
    updateLeaderboardUi(currentGameId, snapshot.title);
  };

  const setScreen = (mode) => {
    const menuActive = mode === "menu";
    dom.menuScreen.classList.toggle("screen--active", menuActive);
    dom.gameScreen.classList.toggle("screen--active", !menuActive);
  };

  const setActiveView = (gameId) => {
    Object.entries(dom.views).forEach(([id, view]) => {
      view.classList.toggle("game-view--active", id === gameId);
    });
  };

  const showMenu = () => {
    if (currentGame && currentGame.deactivate) {
      currentGame.deactivate();
    }
    currentGameId = null;
    currentGame = null;
    pendingResult = null;
    leaderboardSubmitting = false;
    setScreen("menu");
    updateUi();
  };

  const games = {
    snake: createSnakeGame({
      board: document.querySelector("#snake-board"),
      onUpdate: updateUi,
      onResult: (score) => queueLeaderboardEntry("snake", score)
    }),
    tetris: createTetrisGame({
      board: document.querySelector("#tetris-board"),
      nextBoard: document.querySelector("#tetris-next"),
      linesValue: document.querySelector("#tetris-lines"),
      onUpdate: updateUi,
      onResult: (score) => queueLeaderboardEntry("tetris", score)
    }),
    2048: create2048Game({
      board: document.querySelector("#game2048-board"),
      onUpdate: updateUi,
      onResult: (score) => queueLeaderboardEntry("2048", score)
    }),
    arkanoid: createArkanoidGame({
      canvas: document.querySelector("#arkanoid-canvas"),
      onUpdate: updateUi,
      onResult: (score) => queueLeaderboardEntry("arkanoid", score)
    }),
    memory: createMemoryGame({
      board: document.querySelector("#memory-board"),
      onUpdate: updateUi,
      onResult: (score) => queueLeaderboardEntry("memory", score)
    })
  };

  const selectGame = (gameId) => {
    if (currentGame && currentGame.deactivate) {
      currentGame.deactivate();
    }
    currentGameId = gameId;
    currentGame = games[gameId];
    pendingResult = null;
    leaderboardSubmitting = false;
    setScreen("game");
    setActiveView(gameId);
    currentGame.activate();
    updateUi();
  };

  dom.menuButtons.forEach((button) => {
    button.addEventListener("click", () => selectGame(button.dataset.selectGame));
  });

  dom.menuButton.addEventListener("click", showMenu);
  dom.restartButton.addEventListener("click", () => currentGame && currentGame.restart());
  dom.pauseButton.addEventListener("click", () => currentGame && currentGame.togglePause());
  dom.controlButtons.forEach((button) => {
    button.addEventListener("click", () => currentGame && currentGame.handleControl(button.dataset.control));
  });

  dom.leaderboardForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!pendingResult || !currentGameId || pendingResult.gameId !== currentGameId || leaderboardSubmitting) {
      return;
    }

    const name = sanitizePlayerName(dom.leaderboardName.value);
    leaderboardSubmitting = true;
    leaderboardErrors.delete(currentGameId);
    updateUi();

    try {
      await submitLeaderboardEntry(currentGameId, name, pendingResult.score);
      pendingResult = null;
      dom.leaderboardName.value = "";
      await refreshLeaderboard(currentGameId, true);
    } catch (error) {
      leaderboardErrors.set(currentGameId, "Не удалось сохранить результат на сервере.");
    } finally {
      leaderboardSubmitting = false;
      updateUi();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (isEditableTarget(event.target)) {
      return;
    }
    if (currentGame && currentGame.handleKey(event)) {
      updateUi();
    }
  });

  document.addEventListener("keyup", (event) => {
    if (isEditableTarget(event.target)) {
      return;
    }
    if (currentGame && currentGame.handleKeyUp && currentGame.handleKeyUp(event)) {
      updateUi();
    }
  });

  showMenu();

  function queueLeaderboardEntry(gameId, score) {
    if (!score || score <= 0) {
      return;
    }
    if (pendingResult && pendingResult.gameId === gameId && pendingResult.score === score) {
      return;
    }
    pendingResult = { gameId, score };
    leaderboardErrors.delete(gameId);
    if (currentGameId === gameId) {
      updateUi();
    }
  }

  function updateLeaderboardUi(gameId, title) {
    if (!gameId || !title) {
      dom.leaderboardTitle.textContent = "Топ-10";
      dom.leaderboardMetric.textContent = "Лучшие результаты этой игры.";
      dom.leaderboardList.replaceChildren();
      dom.leaderboardEmpty.classList.remove("is-hidden");
      dom.leaderboardForm.classList.add("is-hidden");
      setLeaderboardConnection("idle", "Сервер: не проверен");
      return;
    }

    dom.leaderboardTitle.textContent = `Топ-10: ${title}`;
    renderLeaderboard(gameId);
    void refreshLeaderboard(gameId, false);
  }

  async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function fetchWithRetry(url, options = {}, timeoutMs = 12000, retries = 1, retryDelayMs = 1500) {
    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await fetchWithTimeout(url, options, timeoutMs);
      } catch (error) {
        lastError = error;
        if (attempt === retries) {
          break;
        }
        await new Promise((resolve) => window.setTimeout(resolve, retryDelayMs));
      }
    }
    throw lastError || new Error("Network request failed");
  }

  function renderLeaderboard(gameId) {
    const entries = leaderboardCache.get(gameId) || [];
    const isPending = pendingResult && pendingResult.gameId === gameId;
    const isLoading = leaderboardLoading.has(gameId);
    const isLoaded = leaderboardLoaded.has(gameId);
    const errorMessage = leaderboardErrors.get(gameId);

    const listFragment = document.createDocumentFragment();
    entries.forEach((entry) => {
      const item = document.createElement("li");
      item.className = "leaderboard__item";

      const name = document.createElement("span");
      name.className = "leaderboard__name";
      name.textContent = entry.name;

      const score = document.createElement("span");
      score.className = "leaderboard__score";
      score.textContent = `${entry.score} очк.`;

      item.append(name, score);
      listFragment.appendChild(item);
    });

    dom.leaderboardList.replaceChildren(listFragment);
    dom.leaderboardEmpty.classList.toggle("is-hidden", entries.length > 0 || isLoading);
    const canSubmitPending = isPending && !errorMessage;
    dom.leaderboardForm.classList.toggle("is-hidden", !canSubmitPending);

    if (errorMessage) {
      setLeaderboardConnection("offline", "Сервер: недоступен");
      dom.leaderboardMetric.textContent = isPending
        ? `${errorMessage} Форма сохранения скрыта, пока сервер не вернется.`
        : errorMessage;
      return;
    }

    if (isLoading) {
      setLeaderboardConnection("loading", "Сервер: проверяем");
      dom.leaderboardMetric.textContent = leaderboardSubmitting
        ? "Сохраняем результат на сервере..."
        : "Загружаем общий топ с сервера...";
      return;
    }

    if (isLoaded) {
      setLeaderboardConnection("online", "Сервер: онлайн");
      dom.leaderboardMetric.textContent = isPending
        ? `Ваш результат: ${pendingResult.score} очк. Введите имя для общего топа.`
        : "Общий топ-10 хранится на сервере.";
      return;
    }

    setLeaderboardConnection("idle", "Сервер: не проверен");
    dom.leaderboardMetric.textContent = isPending
      ? `Ваш результат: ${pendingResult.score} очк. Введите имя для общего топа.`
      : "Лучшие результаты этой игры.";
  }

  async function refreshLeaderboard(gameId, force) {
    if (!gameId) {
      return;
    }
    if (leaderboardLoading.has(gameId) || (!force && leaderboardLoaded.has(gameId))) {
      return;
    }

    leaderboardLoading.add(gameId);
    leaderboardErrors.delete(gameId);
    if (currentGameId === gameId) {
      renderLeaderboard(gameId);
    }

    try {
      const response = await fetchWithRetry(`${LEADERBOARD_API_BASE}/api/leaderboard?game=${encodeURIComponent(gameId)}`);
      if (!response.ok) {
        throw new Error(`Leaderboard GET failed: ${response.status}`);
      }

      const payload = await response.json();
      const entries = Array.isArray(payload)
        ? payload
            .filter((entry) => entry && typeof entry.name === "string" && typeof entry.score === "number")
            .map((entry) => ({ name: sanitizePlayerName(entry.name), score: entry.score }))
        : [];

      leaderboardCache.set(gameId, entries.slice(0, 10));
      leaderboardLoaded.add(gameId);
    } catch (error) {
      leaderboardErrors.set(gameId, "Серверный топ пока недоступен. Проверьте, что приложение запущено.");
    } finally {
      leaderboardLoading.delete(gameId);
      if (currentGameId === gameId) {
        renderLeaderboard(gameId);
      }
    }
  }

  async function submitLeaderboardEntry(gameId, name, score) {
    const response = await fetchWithRetry(`${LEADERBOARD_API_BASE}/api/leaderboard`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ game: gameId, name, score })
    });

    if (!response.ok) {
      throw new Error(`Leaderboard POST failed: ${response.status}`);
    }

    return response.json();
  }

  function sanitizePlayerName(value) {
    const normalized = String(value || "").trim().replace(/\s+/g, " ").slice(0, 12);
    return normalized || "Игрок";
  }

  function createSnakeGame({ board, onUpdate, onResult }) {
    const GRID_SIZE = 16;
    const TICK_MS = 140;
    const cells = [];
    let state = initialState();
    let timer = null;

    buildBoard();
    render();

    function initialState() {
      const snake = [{ x: 4, y: 8 }, { x: 3, y: 8 }, { x: 2, y: 8 }];
      return {
        snake,
        direction: "right",
        nextDirection: "right",
        food: placeFood(snake),
        score: 0,
        best: loadBest("snake-best-score"),
        started: false,
        running: false,
        gameOver: false,
        resultHandled: false
      };
    }

    function buildBoard() {
      const fragment = document.createDocumentFragment();
      for (let index = 0; index < GRID_SIZE * GRID_SIZE; index += 1) {
        const cell = document.createElement("div");
        cell.className = "cell";
        fragment.appendChild(cell);
        cells.push(cell);
      }
      board.replaceChildren(fragment);
    }

    function placeFood(snake) {
      const occupied = new Set(snake.map((segment) => `${segment.x},${segment.y}`));
      const free = [];
      for (let y = 0; y < GRID_SIZE; y += 1) {
        for (let x = 0; x < GRID_SIZE; x += 1) {
          if (!occupied.has(`${x},${y}`)) {
            free.push({ x, y });
          }
        }
      }
      return free.length ? free[Math.floor(Math.random() * free.length)] : null;
    }

    function finalizeResult() {
      if (!state.resultHandled) {
        state.resultHandled = true;
        onResult(state.score);
      }
    }

    function startLoop() {
      stopLoop();
      timer = window.setInterval(tick, TICK_MS);
    }

    function stopLoop() {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    }

    function tick() {
      if (!state.running || state.gameOver) {
        return;
      }
      const vectors = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
      const vector = vectors[state.nextDirection];
      const head = state.snake[0];
      const nextHead = { x: head.x + vector.x, y: head.y + vector.y };
      const hitWall = nextHead.x < 0 || nextHead.y < 0 || nextHead.x >= GRID_SIZE || nextHead.y >= GRID_SIZE;
      const grows = state.food && nextHead.x === state.food.x && nextHead.y === state.food.y;
      const body = grows ? state.snake : state.snake.slice(0, -1);
      const hitSelf = body.some((segment) => segment.x === nextHead.x && segment.y === nextHead.y);
      if (hitWall || hitSelf) {
        state.running = false;
        state.gameOver = true;
        finalizeResult();
        stopLoop();
        render();
        onUpdate();
        return;
      }
      state.snake.unshift(nextHead);
      if (!grows) {
        state.snake.pop();
      } else {
        state.score += 1;
        if (state.score > state.best) {
          state.best = state.score;
          saveBest("snake-best-score", state.best);
        }
        state.food = placeFood(state.snake);
      }
      state.direction = state.nextDirection;
      render();
      onUpdate();
    }

    function queueDirection(direction) {
      const opposites = { up: "down", down: "up", left: "right", right: "left" };
      const shouldStart = !state.started;
      if (state.gameOver) {
        return;
      }
      if (shouldStart) {
        startNewGame();
      }
      if (!shouldStart && opposites[state.direction] === direction) {
        return;
      }
      state.nextDirection = direction;
    }

    function render() {
      cells.forEach((cell) => {
        cell.className = "cell";
      });
      state.snake.forEach((segment, index) => {
        const cell = cells[segment.y * GRID_SIZE + segment.x];
        if (!cell) return;
        cell.classList.add("cell--snake");
        if (index === 0) {
          cell.classList.add("cell--head");
        }
      });
      if (state.started && state.food) {
        const foodCell = cells[state.food.y * GRID_SIZE + state.food.x];
        if (foodCell) {
          foodCell.classList.add("cell--food");
        }
      }
    }

    function startNewGame() {
      stopLoop();
      state = initialState();
      state.started = true;
      state.running = true;
      render();
      startLoop();
      onUpdate();
    }

    return {
      activate() { stopLoop(); state = initialState(); render(); onUpdate(); },
      deactivate() { stopLoop(); },
      restart() { startNewGame(); },
      togglePause() {
        if (!state.started || state.gameOver) return;
        state.running = !state.running;
        state.running ? startLoop() : stopLoop();
        onUpdate();
      },
      handleKey(event) {
        const key = String(event.key || "").toLowerCase();
        if (event.code === "Space" || key === " ") {
          event.preventDefault();
          if (!state.started || state.gameOver) {
            startNewGame();
          }
          return true;
        }
        if (key === "p" || key === "з") {
          event.preventDefault();
          this.togglePause();
          return true;
        }
        const direction = { arrowup: "up", arrowdown: "down", arrowleft: "left", arrowright: "right", w: "up", a: "left", s: "down", d: "right", ц: "up", ф: "left", ы: "down", в: "right" }[key];
        if (direction) {
          event.preventDefault();
          queueDirection(direction);
          return true;
        }
        return false;
      },
      handleControl(action) {
        const direction = { up: "up", down: "down", left: "left", right: "right" }[action];
        if (direction) {
          queueDirection(direction);
          render();
          onUpdate();
        }
      },
      getSnapshot() {
        return {
          title: "Змейка",
          subtitle: "Растите, собирайте еду и не врезайтесь в стены.",
          status: state.gameOver ? "Игра окончена. Нажмите пробел или «Новая игра»." : !state.started ? "Нажмите пробел, чтобы начать игру." : state.running ? "Управляйте стрелками или WASD." : "Пауза. Нажмите P или кнопку «Пауза».",
          help: "Пробел: новая игра. Стрелки или WASD: движение. P: пауза.",
          primaryLabel: "Счет",
          primaryValue: state.score,
          secondaryLabel: "Рекорд",
          secondaryValue: state.best,
          canPause: state.started && !state.gameOver,
          showPause: true,
          pauseLabel: state.running ? "Пауза" : "Продолжить"
        };
      }
    };
  }

  function createTetrisGame({ board, nextBoard, linesValue, onUpdate, onResult }) {
    const width = 10;
    const height = 20;
    const cells = [];
    const nextCells = [];
    const colors = { I: "#79c5d3", O: "#d6b34d", T: "#8a63d2", S: "#59a95f", Z: "#d66d59", J: "#5d88d6", L: "#d69659" };
    const shapes = {
      I: [[1, 1, 1, 1]],
      O: [[1, 1], [1, 1]],
      T: [[0, 1, 0], [1, 1, 1]],
      S: [[0, 1, 1], [1, 1, 0]],
      Z: [[1, 1, 0], [0, 1, 1]],
      J: [[1, 0, 0], [1, 1, 1]],
      L: [[0, 0, 1], [1, 1, 1]]
    };
    let timer = null;
    let state = makeInitial();

    buildGrid(board, width * height, cells, "cell");
    buildGrid(nextBoard, 16, nextCells, "mini-cell");
    render();

    function makeInitial() {
      return {
        board: Array.from({ length: height }, () => Array(width).fill(null)),
        current: null,
        nextType: randomType(),
        score: 0,
        lines: 0,
        started: false,
        running: false,
        gameOver: false,
        resultHandled: false
      };
    }

    function finalizeResult() {
      if (!state.resultHandled) {
        state.resultHandled = true;
        onResult(state.score);
      }
    }

    function randomType() {
      const types = Object.keys(shapes);
      return types[Math.floor(Math.random() * types.length)];
    }

    function rotate(matrix) {
      return matrix[0].map((_, columnIndex) => matrix.map((row) => row[columnIndex]).reverse());
    }

    function buildGrid(target, count, collection, className) {
      const fragment = document.createDocumentFragment();
      for (let index = 0; index < count; index += 1) {
        const cell = document.createElement("div");
        cell.className = className;
        fragment.appendChild(cell);
        collection.push(cell);
      }
      target.replaceChildren(fragment);
    }

    function spawnPiece() {
      const type = state.nextType;
      state.nextType = randomType();
      const matrix = shapes[type].map((row) => row.slice());
      state.current = { type, matrix, x: Math.floor((width - matrix[0].length) / 2), y: 0 };
      if (collides(state.current.x, state.current.y, state.current.matrix)) {
        state.running = false;
        state.gameOver = true;
        finalizeResult();
        stopLoop();
      }
    }

    function collides(offsetX, offsetY, matrix) {
      for (let y = 0; y < matrix.length; y += 1) {
        for (let x = 0; x < matrix[y].length; x += 1) {
          if (!matrix[y][x]) continue;
          const boardX = offsetX + x;
          const boardY = offsetY + y;
          if (boardX < 0 || boardX >= width || boardY >= height) return true;
          if (boardY >= 0 && state.board[boardY][boardX]) return true;
        }
      }
      return false;
    }

    function mergePiece() {
      state.current.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value) {
            const boardY = state.current.y + y;
            if (boardY >= 0) {
              state.board[boardY][state.current.x + x] = state.current.type;
            }
          }
        });
      });
    }

    function clearLines() {
      let cleared = 0;
      state.board = state.board.filter((row) => {
        const full = row.every(Boolean);
        if (full) cleared += 1;
        return !full;
      });
      while (state.board.length < height) {
        state.board.unshift(Array(width).fill(null));
      }
      if (cleared > 0) {
        state.lines += cleared;
        state.score += [0, 100, 300, 500, 800][cleared] || 800;
        restartLoop();
      }
    }

    function speed() {
      return Math.max(120, 520 - Math.floor(state.lines / 5) * 35);
    }

    function startLoop() {
      stopLoop();
      timer = window.setInterval(tick, speed());
    }

    function stopLoop() {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    }

    function restartLoop() {
      if (state.running && !state.gameOver) {
        startLoop();
      }
    }

    function move(dx, dy) {
      if (!state.current) return false;
      const nextX = state.current.x + dx;
      const nextY = state.current.y + dy;
      if (collides(nextX, nextY, state.current.matrix)) return false;
      state.current.x = nextX;
      state.current.y = nextY;
      return true;
    }

    function tryRotate() {
      if (!state.current) return;
      const rotated = rotate(state.current.matrix);
      const kicks = [0, -1, 1, -2, 2];
      for (const kick of kicks) {
        if (!collides(state.current.x + kick, state.current.y, rotated)) {
          state.current.x += kick;
          state.current.matrix = rotated;
          return;
        }
      }
    }

    function tick() {
      if (!state.running || state.gameOver) return;
      if (!state.current) spawnPiece();
      if (!move(0, 1)) {
        mergePiece();
        clearLines();
        spawnPiece();
      }
      render();
      onUpdate();
    }

    function hardDrop() {
      while (move(0, 1)) {}
      tick();
    }

    function render() {
      cells.forEach((cell) => {
        cell.style.backgroundColor = "";
      });
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const value = state.board[y][x];
          if (value) {
            cells[y * width + x].style.backgroundColor = colors[value];
          }
        }
      }
      if (state.current) {
        state.current.matrix.forEach((row, y) => {
          row.forEach((value, x) => {
            if (!value) return;
            const boardX = state.current.x + x;
            const boardY = state.current.y + y;
            if (boardX >= 0 && boardX < width && boardY >= 0 && boardY < height) {
              cells[boardY * width + boardX].style.backgroundColor = colors[state.current.type];
            }
          });
        });
      }
      nextCells.forEach((cell) => {
        cell.style.backgroundColor = "";
      });
      const preview = shapes[state.nextType];
      preview.forEach((row, y) => row.forEach((value, x) => {
        if (value) nextCells[y * 4 + x].style.backgroundColor = colors[state.nextType];
      }));
      linesValue.textContent = String(state.lines);
    }

    function startNewGame() {
      stopLoop();
      state = makeInitial();
      state.started = true;
      state.running = true;
      spawnPiece();
      render();
      startLoop();
      onUpdate();
    }

    return {
      activate() { stopLoop(); state = makeInitial(); render(); onUpdate(); },
      deactivate() { stopLoop(); },
      restart() { startNewGame(); },
      togglePause() {
        if (!state.started || state.gameOver) return;
        state.running = !state.running;
        state.running ? startLoop() : stopLoop();
        onUpdate();
      },
      handleKey(event) {
        const key = String(event.key || "").toLowerCase();
        if ((event.code === "Space" || key === " ") && (!state.started || state.gameOver)) {
          event.preventDefault();
          startNewGame();
          return true;
        }
        if (!state.started || state.gameOver) return false;
        if (key === "p" || key === "з") {
          event.preventDefault();
          this.togglePause();
          return true;
        }
        if (!state.running) return false;
        if (event.code === "Space" || key === " ") {
          event.preventDefault();
          hardDrop();
          render();
          onUpdate();
          return true;
        }
        if (key === "arrowleft" || key === "a" || key === "ф") move(-1, 0);
        else if (key === "arrowright" || key === "d" || key === "в") move(1, 0);
        else if (key === "arrowdown" || key === "s" || key === "ы") move(0, 1);
        else if (key === "arrowup" || key === "w" || key === "ц") tryRotate();
        else return false;
        event.preventDefault();
        render();
        onUpdate();
        return true;
      },
      handleControl(action) {
        if (state.gameOver) return;
        if (!state.started) {
          startNewGame();
          return;
        }
        if (!state.running) return;
        if (action === "left") move(-1, 0);
        else if (action === "right") move(1, 0);
        else if (action === "down") move(0, 1);
        else if (action === "up") tryRotate();
        render();
        onUpdate();
      },
      getSnapshot() {
        return {
          title: "Тетрис",
          subtitle: "Собирайте линии и не дайте стакану заполниться.",
          status: state.gameOver ? "Игра окончена. Нажмите пробел или «Новая игра»." : !state.started ? "Нажмите пробел, чтобы начать партию." : state.running ? "Стрелки двигают фигуру, вверх поворачивает, пробел делает жесткий сброс." : "Пауза. Нажмите P или кнопку «Пауза».",
          help: "Пробел: старт или жесткий сброс. Стрелки/WASD: движение. Вверх: поворот. P: пауза.",
          primaryLabel: "Счет",
          primaryValue: state.score,
          secondaryLabel: "Линии",
          secondaryValue: state.lines,
          canPause: state.started && !state.gameOver,
          showPause: true,
          pauseLabel: state.running ? "Пауза" : "Продолжить"
        };
      }
    };
  }

  function create2048Game({ board, onUpdate, onResult }) {
    const size = 4;
    const cells = [];
    let state = initialState();

    buildBoard();
    render();

    function initialState() {
      const next = {
        board: Array.from({ length: size }, () => Array(size).fill(0)),
        score: 0,
        bestTile: 0,
        gameOver: false,
        won: false,
        resultHandled: false
      };
      addRandomTile(next.board);
      addRandomTile(next.board);
      next.bestTile = findMax(next.board);
      return next;
    }

    function finalizeResult() {
      if (!state.resultHandled) {
        state.resultHandled = true;
        onResult(state.score);
      }
    }

    function buildBoard() {
      const fragment = document.createDocumentFragment();
      for (let index = 0; index < size * size; index += 1) {
        const tile = document.createElement("div");
        tile.className = "tile tile--0";
        fragment.appendChild(tile);
        cells.push(tile);
      }
      board.replaceChildren(fragment);
    }

    function addRandomTile(targetBoard) {
      const empty = [];
      targetBoard.forEach((row, y) => row.forEach((value, x) => {
        if (value === 0) empty.push({ x, y });
      }));
      if (!empty.length) return;
      const spot = empty[Math.floor(Math.random() * empty.length)];
      targetBoard[spot.y][spot.x] = Math.random() < 0.9 ? 2 : 4;
    }

    function findMax(targetBoard) {
      return Math.max(...targetBoard.flat());
    }

    function cloneBoard(targetBoard) {
      return targetBoard.map((row) => row.slice());
    }

    function slideRowLeft(row) {
      const compact = row.filter((value) => value !== 0);
      let scoreGain = 0;
      for (let index = 0; index < compact.length - 1; index += 1) {
        if (compact[index] === compact[index + 1]) {
          compact[index] *= 2;
          scoreGain += compact[index];
          compact.splice(index + 1, 1);
        }
      }
      while (compact.length < size) compact.push(0);
      return { row: compact, scoreGain };
    }

    function transpose(targetBoard) {
      return targetBoard[0].map((_, column) => targetBoard.map((row) => row[column]));
    }

    function move(direction) {
      if (state.gameOver) return false;
      let working = cloneBoard(state.board);
      let moved = false;
      let gained = 0;

      const useRows = (boardRows, reverse) => boardRows.map((row) => {
        const source = reverse ? row.slice().reverse() : row.slice();
        const result = slideRowLeft(source);
        const finalRow = reverse ? result.row.slice().reverse() : result.row;
        if (finalRow.some((value, index) => value !== row[index])) moved = true;
        gained += result.scoreGain;
        return finalRow;
      });

      if (direction === "left") working = useRows(working, false);
      else if (direction === "right") working = useRows(working, true);
      else if (direction === "up") working = transpose(useRows(transpose(working), false));
      else if (direction === "down") working = transpose(useRows(transpose(working), true));

      if (!moved) {
        state.gameOver = !canMove(state.board);
        if (state.gameOver) {
          finalizeResult();
        }
        onUpdate();
        return false;
      }
      state.board = working;
      state.score += gained;
      addRandomTile(state.board);
      state.bestTile = findMax(state.board);
      if (state.bestTile >= 2048) state.won = true;
      state.gameOver = !canMove(state.board);
      if (state.gameOver) {
        finalizeResult();
      }
      render();
      onUpdate();
      return true;
    }

    function canMove(targetBoard) {
      if (targetBoard.some((row) => row.includes(0))) return true;
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const value = targetBoard[y][x];
          if ((targetBoard[y + 1] || [])[x] === value || targetBoard[y][x + 1] === value) return true;
        }
      }
      return false;
    }

    function render() {
      state.board.flat().forEach((value, index) => {
        const tile = cells[index];
        const tier = value > 2048 ? "big" : String(value);
        tile.className = `tile tile--${tier}`;
        tile.textContent = value === 0 ? "" : String(value);
      });
    }

    return {
      activate() { state = initialState(); render(); onUpdate(); },
      deactivate() {},
      restart() { state = initialState(); render(); onUpdate(); },
      togglePause() {},
      handleKey(event) {
        const key = String(event.key || "").toLowerCase();
        const direction = { arrowup: "up", arrowdown: "down", arrowleft: "left", arrowright: "right", w: "up", a: "left", s: "down", d: "right", ц: "up", ф: "left", ы: "down", в: "right" }[key];
        if (direction) {
          event.preventDefault();
          return move(direction);
        }
        if ((event.code === "Space" || key === " ") && state.gameOver) {
          event.preventDefault();
          this.restart();
          return true;
        }
        return false;
      },
      handleControl(action) { move(action); },
      getSnapshot() {
        return {
          title: "2048",
          subtitle: "Складывайте одинаковые плитки и доберитесь до 2048.",
          status: state.gameOver ? "Ходов не осталось. Нажмите «Новая игра»." : state.won ? "2048 собрано. Можно продолжать или начать заново." : "Стрелки или WASD двигают все плитки сразу.",
          help: "Стрелки или WASD: движение. «Новая игра» начинает новую партию.",
          primaryLabel: "Счет",
          primaryValue: state.score,
          secondaryLabel: "Макс. плитка",
          secondaryValue: state.bestTile,
          canPause: false,
          showPause: false,
          pauseLabel: "Пауза"
        };
      }
    };
  }


  function createMemoryGame({ board, onUpdate, onResult }) {
    const icons = ["○", "□", "△", "◇", "☆", "☼", "☂", "☎", "✈", "✂", "♫", "♞", "♣", "♠", "♥", "♦", "⚑", "⌘"];
    let state = initialState();
    let lockTimer = null;

    function initialState() {
      const deck = shuffle(icons.concat(icons)).map((value, index) => ({
        id: `${value}-${index}`,
        value,
        flipped: false,
        matched: false
      }));
      return {
        cards: deck,
        moves: 0,
        matchedPairs: 0,
        score: 0,
        started: true,
        gameOver: false,
        resultHandled: false
      };
    }

    function shuffle(values) {
      const result = values.slice();
      for (let index = result.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
      }
      return result;
    }

    function finalizeResult() {
      if (!state.resultHandled) {
        state.resultHandled = true;
        onResult(state.score);
      }
    }

    function render() {
      const fragment = document.createDocumentFragment();
      state.cards.forEach((card) => {
        const button = document.createElement("button");
        const isVisible = card.flipped || card.matched;
        button.type = "button";
        button.className = `memory-card ${isVisible ? "" : "memory-card--hidden"} ${card.matched ? "memory-card--matched" : ""}`.trim();
        button.textContent = card.value;
        button.dataset.cardId = card.id;
        button.disabled = card.matched || card.flipped || state.gameOver;
        fragment.appendChild(button);
      });
      board.replaceChildren(fragment);
    }

    function evaluateTurn() {
      const openCards = state.cards.filter((card) => card.flipped && !card.matched);
      if (openCards.length !== 2) {
        return;
      }
      state.moves += 1;
      if (openCards[0].value === openCards[1].value) {
        state.cards = state.cards.map((card) => openCards.some((openCard) => openCard.id === card.id) ? { ...card, matched: true } : card);
        state.matchedPairs += 1;
        state.score += 100;
        if (state.matchedPairs === icons.length) {
          state.gameOver = true;
          state.score += Math.max(0, 300 - state.moves * 10);
          finalizeResult();
        }
        render();
        onUpdate();
        return;
      }

      state.score = Math.max(0, state.score - 10);
      render();
      onUpdate();
      lockTimer = window.setTimeout(() => {
        state.cards = state.cards.map((card) => card.matched ? card : { ...card, flipped: false });
        lockTimer = null;
        render();
        onUpdate();
      }, 650);
    }

    function flipCard(cardId) {
      if (state.gameOver || lockTimer) {
        return;
      }
      const openCards = state.cards.filter((card) => card.flipped && !card.matched);
      if (openCards.length >= 2) {
        return;
      }
      state.cards = state.cards.map((card) => card.id === cardId ? { ...card, flipped: true } : card);
      render();
      evaluateTurn();
      onUpdate();
    }

    board.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const cardButton = target.closest("[data-card-id]");
      if (!cardButton) {
        return;
      }
      flipCard(cardButton.dataset.cardId);
    });

    render();

    return {
      activate() {
        if (lockTimer) {
          window.clearTimeout(lockTimer);
          lockTimer = null;
        }
        state = initialState();
        render();
        onUpdate();
      },
      deactivate() {
        if (lockTimer) {
          window.clearTimeout(lockTimer);
          lockTimer = null;
        }
      },
      restart() {
        if (lockTimer) {
          window.clearTimeout(lockTimer);
          lockTimer = null;
        }
        state = initialState();
        render();
        onUpdate();
      },
      togglePause() {},
      handleKey() {
        return false;
      },
      handleControl() {},
      getSnapshot() {
        return {
          title: "Мемори",
          subtitle: "Открывайте пары картинок и очищайте поле 6x6 за минимум ходов.",
          status: state.gameOver ? "Поле очищено. Нажмите «Новая игра», чтобы сыграть еще раз." : "Открывайте по две карточки и ищите совпадения.",
          help: "Управление мышью или касанием. Чем меньше ошибок и ходов, тем выше счет.",
          primaryLabel: "Счет",
          primaryValue: state.score,
          secondaryLabel: "Ходы",
          secondaryValue: state.moves,
          canPause: false,
          showPause: false,
          showControls: false,
          pauseLabel: "Пауза"
        };
      }
    };
  }
  function createArkanoidGame({ canvas, onUpdate, onResult }) {
    const context = canvas.getContext("2d");
    const paddleTop = 288;
    const paddleSpeed = 320;
    let frame = null;
    let lastTime = 0;
    let state = initialState();

    render();

    function initialState() {
      return {
        paddleX: 200,
        paddleWidth: 90,
        ballX: 240,
        ballY: 250,
        ballVX: 180,
        ballVY: -180,
        ballRadius: 8,
        score: 0,
        lives: 3,
        running: false,
        started: false,
        launched: false,
        gameOver: false,
        won: false,
        moveLeft: false,
        moveRight: false,
        resultHandled: false,
        bricks: buildBricks()
      };
    }

    function finalizeResult() {
      if (!state.resultHandled) {
        state.resultHandled = true;
        onResult(state.score);
      }
    }

    function buildBricks() {
      const bricks = [];
      const rowColors = ["#bb7f37", "#b36c2f", "#2f6b3b", "#5d88d6", "#8a63d2"];
      for (let row = 0; row < 5; row += 1) {
        for (let col = 0; col < 8; col += 1) {
          bricks.push({ x: 28 + col * 54, y: 30 + row * 24, width: 46, height: 16, alive: true, color: rowColors[row] });
        }
      }
      return bricks;
    }

    function resetBall() {
      state.ballX = state.paddleX + state.paddleWidth / 2;
      state.ballY = 250;
      state.ballVX = 180 * (Math.random() > 0.5 ? 1 : -1);
      state.ballVY = -180;
      state.launched = false;
    }

    function clampPaddle() {
      state.paddleX = Math.max(12, Math.min(canvas.width - state.paddleWidth - 12, state.paddleX));
      if (!state.launched) {
        state.ballX = state.paddleX + state.paddleWidth / 2;
      }
    }

    function movePaddleStep(direction) {
      state.paddleX += direction * 28;
      clampPaddle();
      render();
      onUpdate();
    }

    function applyPaddleMotion(delta) {
      const direction = (state.moveRight ? 1 : 0) - (state.moveLeft ? 1 : 0);
      if (direction === 0) {
        return;
      }
      state.paddleX += direction * paddleSpeed * delta;
      clampPaddle();
    }

    function startLoop() {
      stopLoop();
      lastTime = 0;
      frame = window.requestAnimationFrame(loop);
    }

    function stopLoop() {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
        frame = null;
      }
    }

    function loop(timestamp) {
      if (!lastTime) lastTime = timestamp;
      const delta = Math.min(32, timestamp - lastTime) / 1000;
      lastTime = timestamp;
      update(delta);
      render();
      if (state.running && !state.gameOver && !state.won) {
        frame = window.requestAnimationFrame(loop);
      } else {
        frame = null;
      }
    }

    function update(delta) {
      if (!state.running || state.gameOver || state.won) return;
      applyPaddleMotion(delta);
      if (!state.launched) {
        state.ballX = state.paddleX + state.paddleWidth / 2;
        return;
      }
      state.ballX += state.ballVX * delta;
      state.ballY += state.ballVY * delta;

      if (state.ballX <= state.ballRadius || state.ballX >= canvas.width - state.ballRadius) state.ballVX *= -1;
      if (state.ballY <= state.ballRadius) state.ballVY *= -1;

      if (state.ballY + state.ballRadius >= paddleTop && state.ballY + state.ballRadius <= paddleTop + 14 && state.ballX >= state.paddleX && state.ballX <= state.paddleX + state.paddleWidth && state.ballVY > 0) {
        const hitPoint = (state.ballX - (state.paddleX + state.paddleWidth / 2)) / (state.paddleWidth / 2);
        state.ballVX = 220 * hitPoint;
        state.ballVY = -Math.abs(state.ballVY);
      }

      state.bricks.forEach((brick) => {
        if (!brick.alive) return;
        if (state.ballX + state.ballRadius >= brick.x && state.ballX - state.ballRadius <= brick.x + brick.width && state.ballY + state.ballRadius >= brick.y && state.ballY - state.ballRadius <= brick.y + brick.height) {
          brick.alive = false;
          state.score += 10;
          state.ballVY *= -1;
        }
      });

      if (state.bricks.every((brick) => !brick.alive)) {
        state.won = true;
        state.running = false;
        finalizeResult();
      }

      if (state.ballY > canvas.height + state.ballRadius) {
        state.lives -= 1;
        if (state.lives <= 0) {
          state.gameOver = true;
          state.running = false;
          finalizeResult();
        }
        resetBall();
      }
      onUpdate();
    }

    function render() {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#f6f0e3";
      context.fillRect(0, 0, canvas.width, canvas.height);
      state.bricks.forEach((brick) => {
        if (!brick.alive) return;
        context.fillStyle = brick.color;
        context.fillRect(brick.x, brick.y, brick.width, brick.height);
      });
      context.fillStyle = "#2a241c";
      context.fillRect(state.paddleX, paddleTop, state.paddleWidth, 12);
      context.beginPath();
      context.fillStyle = "#bb3e2f";
      context.arc(state.ballX, state.ballY, state.ballRadius, 0, Math.PI * 2);
      context.fill();
      context.closePath();
      context.fillStyle = "#6a6255";
      context.font = "16px Segoe UI";
      if (!state.started) context.fillText("Нажмите пробел, чтобы начать Арканоид.", 108, 170);
      else if (!state.launched && !state.gameOver && !state.won) context.fillText("Пробел или ↑ запускает мяч.", 148, 170);
      else if (state.gameOver) context.fillText("Игра окончена. Нажмите пробел для новой игры.", 90, 170);
      else if (state.won) context.fillText("Все блоки разбиты. Нажмите «Новая игра».", 96, 170);
    }

    function startNewGame() {
      stopLoop();
      state = initialState();
      state.started = true;
      state.running = true;
      resetBall();
      render();
      startLoop();
      onUpdate();
    }

    function launchBall() {
      if (!state.started || state.gameOver || state.won) return;
      state.running = true;
      state.launched = true;
      startLoop();
      onUpdate();
    }

    return {
      activate() { stopLoop(); state = initialState(); render(); onUpdate(); },
      deactivate() {
        state.moveLeft = false;
        state.moveRight = false;
        stopLoop();
      },
      restart() { startNewGame(); },
      togglePause() {
        if (!state.started || state.gameOver || state.won) return;
        state.running = !state.running;
        state.running ? startLoop() : stopLoop();
        onUpdate();
      },
      handleKey(event) {
        const key = String(event.key || "").toLowerCase();
        if (event.code === "Space" || key === " ") {
          event.preventDefault();
          if (!state.started || state.gameOver || state.won) startNewGame();
          else if (!state.launched) launchBall();
          return true;
        }
        if (key === "p" || key === "з") {
          event.preventDefault();
          this.togglePause();
          return true;
        }
        if (key === "arrowleft" || key === "a" || key === "ф") {
          event.preventDefault();
          state.moveLeft = true;
          return true;
        }
        if (key === "arrowright" || key === "d" || key === "в") {
          event.preventDefault();
          state.moveRight = true;
          return true;
        }
        if (key === "arrowup" || key === "w" || key === "ц") {
          event.preventDefault();
          if (!state.started || state.gameOver || state.won) startNewGame();
          else if (!state.launched) launchBall();
          return true;
        }
        return false;
      },
      handleKeyUp(event) {
        const key = String(event.key || "").toLowerCase();
        if (key === "arrowleft" || key === "a" || key === "ф") {
          state.moveLeft = false;
          return true;
        }
        if (key === "arrowright" || key === "d" || key === "в") {
          state.moveRight = false;
          return true;
        }
        return false;
      },
      handleControl(action) {
        if (action === "left") movePaddleStep(-1);
        else if (action === "right") movePaddleStep(1);
        else if (action === "up") {
          if (!state.started || state.gameOver || state.won) startNewGame();
          else if (!state.launched) launchBall();
        }
      },
      getSnapshot() {
        return {
          title: "Арканоид",
          subtitle: "Отбивайте мяч, разбивайте блоки и берегите жизни.",
          status: state.gameOver ? "Игра окончена. Нажмите пробел или «Новая игра»." : !state.started ? "Нажмите пробел, чтобы начать." : !state.launched ? "Сместите платформу и нажмите пробел, чтобы запустить мяч." : state.running ? "Удерживайте стрелки влево/вправо для плавного движения платформы." : "Пауза. Нажмите P или кнопку «Пауза».",
          help: "Пробел: новая игра или запуск мяча. Удержание ← →: плавное движение платформы. P: пауза.",
          primaryLabel: "Счет",
          primaryValue: state.score,
          secondaryLabel: "Жизни",
          secondaryValue: state.lives,
          canPause: state.started && !state.gameOver && !state.won,
          showPause: true,
          pauseLabel: state.running ? "Пауза" : "Продолжить"
        };
      }
    };
  }

  function loadBest(key) {
    try {
      const value = Number.parseInt(window.localStorage.getItem(key) || "", 10);
      return Number.isFinite(value) ? value : 0;
    } catch (error) {
      return 0;
    }
  }

  function saveBest(key, value) {
    try {
      window.localStorage.setItem(key, String(value));
    } catch (error) {
    }
  }
})();