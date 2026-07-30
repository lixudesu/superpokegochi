;(() => {
  const host = document.querySelector('[data-minigame-root]');
  if (!host) return;

  const GAME_INFO = {
    catch: {
      title: 'Chuva de Frutas',
      description: 'Sobreviva por 50 segundos: pegue frutas, evite sujeiras e não deixe frutas caírem.',
    },
    memory: {
      title: 'Memória de Frutas',
      description: 'Encontre oito pares. Você tem seis vidas e as posições não mudam.',
    },
  };

  const CATCH_HAZARDS = [
    { assetUrl: 'assets/items/dirt-1.png', id: 'dirt-1', label: 'sujeira' },
    { assetUrl: 'assets/items/dirt-2.png', id: 'dirt-2', label: 'sujeira' },
    { assetUrl: 'assets/items/dirt-3.png', id: 'dirt-3', label: 'sujeira' },
  ];

  let session = null;
  let cleanupTasks = [];

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function shuffle(items) {
    const next = [...items];
    for (let index = next.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    }
    return next;
  }

  function addCleanup(task) {
    cleanupTasks.push(task);
    return task;
  }

  function clearGame() {
    cleanupTasks.splice(0).forEach(task => {
      try {
        task();
      } catch {
        // A completed game may already have released a timer or listener.
      }
    });
  }

  function rewardStatusText() {
    if (!session) return 'Recompensa disponível';
    const remaining = Math.max(0, Number(session.config.rewardReadyAt) - Date.now());
    if (remaining <= 0) return 'Fruta disponível';
    const minutes = Math.max(1, Math.ceil(remaining / 60000));
    return `Nova fruta em ${minutes} min`;
  }

  function memoryLockText() {
    if (!session) return GAME_INFO.memory.description;
    const remaining = Math.max(0, Number(session.config.memoryLockedUntil) - Date.now());
    if (remaining <= 0) return GAME_INFO.memory.description;
    const minutes = Math.max(1, Math.ceil(remaining / 60000));
    if (minutes >= 60) return 'Bloqueado por 1 hora após perder as seis vidas.';
    return `Disponível novamente em ${minutes} min.`;
  }

  function shellMarkup(title, content, contentClass = '') {
    const cooldown = session && Number(session.config.rewardReadyAt) > Date.now();
    return `
      <section class="minigame-app" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <header class="minigame-topbar">
          <div class="minigame-title">
            <small>Brincar com ${escapeHtml(session.config.companionName)}</small>
            <h1>${escapeHtml(title)}</h1>
          </div>
          <div class="minigame-reward-state ${cooldown ? 'cooldown' : ''}" data-minigame-reward-status>
            ${rewardStatusText()}
          </div>
        </header>
        <main class="minigame-content ${contentClass}">${content}</main>
        <footer class="minigame-footer">
          <button class="minigame-exit" type="button" data-minigame-exit>
            <img src="${escapeHtml(session.config.backIconUrl)}" alt="" aria-hidden="true">
            Voltar ao Tamagotchi
          </button>
        </footer>
      </section>`;
  }

  function bindShell() {
    const exitButton = host.querySelector('[data-minigame-exit]');
    if (exitButton) exitButton.addEventListener('click', close);
  }

  function startRewardClock() {
    const interval = setInterval(() => {
      const status = host.querySelector('[data-minigame-reward-status]');
      if (!status || !session) return;
      const cooldown = Number(session.config.rewardReadyAt) > Date.now();
      status.textContent = rewardStatusText();
      status.classList.toggle('cooldown', cooldown);
      const memoryButton = host.querySelector('[data-minigame-start="memory"]');
      const memoryCopy = host.querySelector('[data-memory-lock-copy]');
      if (memoryButton && memoryCopy) {
        const memoryLocked = Number(session.config.memoryLockedUntil) > Date.now();
        const unavailable = memoryLocked || session.config.canPlay === false;
        memoryButton.disabled = unavailable;
        memoryButton.classList.toggle('locked', memoryLocked);
        memoryCopy.textContent = memoryLocked
          ? memoryLockText()
          : session.config.canPlay === false
            ? 'Seu companheiro precisa descansar.'
            : GAME_INFO.memory.description;
      }
    }, 1000);
    addCleanup(() => clearInterval(interval));
  }

  function hubArt(gameId) {
    const foods = session.config.foods;
    if (gameId === 'catch') {
      return `
        <span class="minigame-choice-art catch" aria-hidden="true">
          <img src="${escapeHtml(foods[0].assetUrl)}" alt="">
          <img src="${escapeHtml(foods[1].assetUrl)}" alt="">
        </span>`;
    }
    return `
      <span class="minigame-choice-art memory" aria-hidden="true">
        ${foods.slice(0, 4).map(food => `<img src="${escapeHtml(food.assetUrl)}" alt="">`).join('')}
      </span>`;
  }

  function renderHub() {
    if (!session) return;
    clearGame();
    session.currentGame = null;
    const content = `
      <section class="minigame-hub">
        <p class="minigame-hub-copy">
          Chuva de Frutas custa 8 de energia e Memória de Frutas custa 6. A energia é cobrada ao iniciar.
          O treino continua sendo a atividade que mais fortalece seu companheiro.
        </p>
        <div class="minigame-list">
          ${Object.entries(GAME_INFO).map(([gameId, info]) => {
            const memoryLocked = gameId === 'memory' && Number(session.config.memoryLockedUntil) > Date.now();
            const noEnergy = session.config.canPlay === false;
            const disabled = memoryLocked || noEnergy;
            return `
            <button class="minigame-choice ${memoryLocked ? 'locked' : ''}" type="button" data-minigame-start="${gameId}" ${disabled ? 'disabled' : ''}>
              ${hubArt(gameId)}
              <span class="minigame-choice-copy">
                <b>${info.title}</b>
                <span ${gameId === 'memory' ? 'data-memory-lock-copy' : ''}>${memoryLocked ? memoryLockText() : noEnergy ? 'Seu companheiro precisa descansar.' : info.description}</span>
              </span>
              <span class="minigame-choice-arrow" aria-hidden="true">›</span>
            </button>
          `}).join('')}
        </div>
      </section>`;
    host.innerHTML = shellMarkup('Escolha um minigame', content);
    bindShell();
    host.querySelectorAll('[data-minigame-start]').forEach(button => {
      button.addEventListener('click', () => startGame(button.dataset.minigameStart));
    });
    startRewardClock();
  }

  function startGame(gameId) {
    if (!session || !GAME_INFO[gameId]) return;
    if (session.config.canPlay === false) return;
    if (gameId === 'memory' && Number(session.config.memoryLockedUntil) > Date.now()) return;
    if (typeof session.config.onStart === 'function') {
      const startState = session.config.onStart({ gameId });
      if (!startState || startState.started === false) {
        session.config.canPlay = false;
        renderHub();
        return;
      }
      if (typeof startState.canPlayAgain === 'boolean') {
        session.config.canPlay = startState.canPlayAgain;
      }
    }
    clearGame();
    session.currentGame = gameId;
    session.finished = false;
    if (gameId === 'catch') startCatchGame();
    if (gameId === 'memory') startMemoryGame();
  }

  function resultRewardMarkup(reward) {
    if (!reward || !reward.earned) {
      return `<div class="minigame-result-reward no-reward">${escapeHtml(reward?.message || 'Jogue novamente para conquistar a recompensa.')}</div>`;
    }
    return `
      <div class="minigame-result-reward">
        <img src="${escapeHtml(reward.food.assetUrl)}" alt="">
        <span>+1 ${escapeHtml(reward.food.label)} · +${reward.xp} XP</span>
      </div>`;
  }

  async function finishGame(result) {
    if (!session || session.finished) return;
    session.finished = true;
    clearGame();

    let reward;
    try {
      reward = await session.config.onComplete(result);
    } catch {
      reward = { earned: false, message: 'Não foi possível salvar a recompensa agora.' };
    }

    if (!session) return;
    if (reward && Number.isFinite(Number(reward.rewardReadyAt))) {
      session.config.rewardReadyAt = Number(reward.rewardReadyAt);
    }
    if (reward && Number.isFinite(Number(reward.memoryLockedUntil))) {
      session.config.memoryLockedUntil = Math.max(0, Number(reward.memoryLockedUntil));
    }
    if (reward && typeof reward.canPlayAgain === 'boolean') {
      session.config.canPlay = reward.canPlayAgain;
    }
    const rewardStatus = host.querySelector('[data-minigame-reward-status]');
    if (rewardStatus) {
      const cooldown = Number(session.config.rewardReadyAt) > Date.now();
      rewardStatus.textContent = rewardStatusText();
      rewardStatus.classList.toggle('cooldown', cooldown);
    }

    const stage = host.querySelector('[data-minigame-stage]');
    if (!stage) return;
    const retryLocked = result.gameId === 'memory' && Number(session.config.memoryLockedUntil) > Date.now();
    const retryUnavailable = retryLocked || session.config.canPlay === false;
    stage.insertAdjacentHTML('beforeend', `
      <div class="minigame-result">
        <div class="minigame-result-card">
          <h2>${result.success ? 'Muito bem!' : 'Quase lá!'}</h2>
          <p>${escapeHtml(result.summary)}</p>
          ${resultRewardMarkup(reward)}
          <div class="minigame-result-actions">
            <button class="secondary" type="button" data-minigame-games>Outros jogos</button>
            <button class="primary" type="button" data-minigame-retry ${retryUnavailable ? 'disabled' : ''}>${retryLocked ? 'Tente em 1 hora' : session.config.canPlay === false ? 'Sem energia' : 'Jogar novamente'}</button>
          </div>
        </div>
      </div>`);
    host.querySelector('[data-minigame-games]')?.addEventListener('click', renderHub);
    host.querySelector('[data-minigame-retry]')?.addEventListener('click', () => startGame(result.gameId));
  }

  function startCatchGame() {
    const content = `
      <section class="minigame-stage minigame-sky" data-minigame-stage>
        <img class="catch-scenery" src="minigames/assets/catch-scenery.svg" alt="" aria-hidden="true">
        <div class="minigame-hud catch-hud">
          <span>Pontos<br><b data-catch-score>0</b></span>
          <span>Tempo<br><b data-catch-time>50</b></span>
          <span>Chances<br><b><span data-catch-lives>3</span><svg class="catch-heart" viewBox="0 0 32 30" aria-hidden="true"><path d="M16 27.2 3.8 15A8 8 0 0 1 15.1 3.7l.9.9.9-.9A8 8 0 0 1 28.2 15L16 27.2Z"/></svg></b></span>
        </div>
        <div class="catch-basket" aria-hidden="true"><span></span></div>
      </section>`;
    host.innerHTML = shellMarkup(GAME_INFO.catch.title, content);
    bindShell();
    startRewardClock();

    const stage = host.querySelector('[data-minigame-stage]');
    const scoreNode = host.querySelector('[data-catch-score]');
    const timeNode = host.querySelector('[data-catch-time]');
    const livesNode = host.querySelector('[data-catch-lives]');
    const fallingItems = new Map();
    const startedAt = performance.now();
    const durationMs = 50000;
    let score = 0;
    let lives = 3;
    let lastSpawnAt = startedAt;
    let spawnDelay = 1450;
    let animationFrame = 0;

    function updateLives() {
      livesNode.textContent = String(Math.max(0, lives));
    }

    function removeItem(id) {
      const item = fallingItems.get(id);
      if (!item) return;
      item.element.remove();
      fallingItems.delete(id);
    }

    function loseLife() {
      lives -= 1;
      updateLives();
      stage.classList.remove('catch-damage');
      void stage.offsetWidth;
      stage.classList.add('catch-damage');
      if (navigator.vibrate) navigator.vibrate(35);
    }

    function spawnItem(timestamp, difficulty) {
      const hazardChance = .12 + difficulty * .14;
      const isHazard = Math.random() < hazardChance;
      const item = isHazard
        ? CATCH_HAZARDS[Math.floor(Math.random() * CATCH_HAZARDS.length)]
        : session.config.foods[Math.floor(Math.random() * session.config.foods.length)];
      const element = document.createElement('button');
      const id = `falling-${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
      const startX = 12 + Math.random() * 76;
      const endX = 12 + Math.random() * 76;
      const startY = Math.max(280, stage.clientHeight - 48);
      const peakY = stage.clientHeight * (.24 + Math.random() * .14);
      element.type = 'button';
      element.className = `catch-fruit${isHazard ? ' catch-hazard' : ''}`;
      element.setAttribute('aria-label', isHazard ? 'Perigo: não toque na sujeira' : `Pegar ${item.label}`);
      element.style.left = `${startX}%`;
      element.style.top = `${startY}px`;
      element.innerHTML = `
        ${isHazard ? '<span class="catch-hazard-alert" aria-hidden="true">!</span>' : '<img class="catch-fruit-wings" src="minigames/assets/fruit-wings.svg" alt="" aria-hidden="true">'}
        <img class="catch-fruit-pixel" src="${escapeHtml(item.assetUrl)}" alt="">
      `;
      function collectItem(event) {
        if (event.type === 'pointerdown') event.preventDefault();
        const fallingItem = fallingItems.get(id);
        if (!fallingItem || fallingItem.caught) return;
        fallingItem.caught = true;
        fallingItem.caughtAt = performance.now();
        fallingItem.caughtY = fallingItem.y;
        fallingItem.lastAt = fallingItem.caughtAt;
        if (fallingItem.isHazard) {
          loseLife();
          element.classList.add('hazard-hit');
          return;
        }
        score += 1;
        scoreNode.textContent = String(score);
        element.classList.add('collected');
      }
      element.addEventListener('pointerdown', collectItem);
      element.addEventListener('click', collectItem);
      stage.appendChild(element);
      fallingItems.set(id, {
        caught: false,
        caughtY: startY,
        element,
        endX,
        isHazard,
        lastAt: timestamp,
        peakY,
        startTime: timestamp,
        startX,
        startY,
        duration: Math.max(2300, 3400 - difficulty * 850 - Math.min(200, score * 4)),
        y: startY,
      });
    }

    function spawnWave(timestamp, difficulty) {
      const capacity = Math.floor(5 + difficulty * 3);
      const availableSlots = Math.max(0, capacity - fallingItems.size);
      if (availableSlots <= 0) return;
      const waveRoll = Math.random();
      let waveSize = 1;
      if (difficulty >= .75) {
        if (waveRoll < .12) waveSize = 3;
        else if (waveRoll < .65) waveSize = 2;
      } else if (difficulty >= .3 && waveRoll < .36) {
        waveSize = 2;
      }
      for (let index = 0; index < Math.min(waveSize, availableSlots); index += 1) {
        spawnItem(timestamp + index * 0.01, difficulty);
      }
    }

    function endCatchGame(survivedFullTime) {
      cancelAnimationFrame(animationFrame);
      const success = survivedFullTime && lives > 0;
      const performanceXp = 12
        + Math.min(12, Math.floor(score / 2))
        + Math.max(0, lives - 1) * 3;
      void finishGame({
        gameId: 'catch',
        score,
        success,
        xp: success ? Math.min(30, performanceXp) : 0,
        summary: success
          ? `Você sobreviveu aos 50 segundos e pegou ${score} frutas.`
          : `Você pegou ${score} frutas, mas perdeu as três vidas antes dos 50 segundos.`,
      });
    }

    function frame(timestamp) {
      if (!session || session.finished) return;
      const elapsed = timestamp - startedAt;
      const remaining = Math.max(0, Math.ceil((durationMs - elapsed) / 1000));
      timeNode.textContent = String(remaining);

      if (elapsed >= durationMs || lives <= 0) {
        endCatchGame(elapsed >= durationMs);
        return;
      }

      if (timestamp - lastSpawnAt >= spawnDelay) {
        const difficulty = Math.min(1, elapsed / durationMs);
        spawnWave(timestamp, difficulty);
        lastSpawnAt = timestamp;
        spawnDelay = Math.max(740, 1500 - difficulty * 660 - Math.min(100, score * 1.5));
      }

      fallingItems.forEach((item, id) => {
        if (item.caught) {
          const deltaSeconds = Math.min(.04, Math.max(.001, (timestamp - item.lastAt) / 1000));
          item.lastAt = timestamp;
          item.caughtY -= (item.isHazard ? 180 : 520) * deltaSeconds;
          item.y = item.caughtY;
          item.element.style.top = `${item.y}px`;
          if (item.y < -70 || (item.isHazard && timestamp - item.caughtAt > 280)) removeItem(id);
          return;
        }

        const progress = (timestamp - item.startTime) / item.duration;
        if (progress >= 1) {
          removeItem(id);
          if (!item.isHazard) loseLife();
          return;
        }
        const x = item.startX + (item.endX - item.startX) * progress;
        const y = item.startY - (4 * progress * (1 - progress)) * (item.startY - item.peakY);
        item.y = y;
        item.element.style.left = `${x}%`;
        item.element.style.top = `${y}px`;
      });
      animationFrame = requestAnimationFrame(frame);
    }

    spawnWave(startedAt, 0);
    animationFrame = requestAnimationFrame(frame);
    addCleanup(() => cancelAnimationFrame(animationFrame));
    addCleanup(() => fallingItems.forEach(item => item.element.remove()));
  }

  function startMemoryGame() {
    const pairTarget = 8;
    const selectedFoods = shuffle(session.config.foods).slice(0, pairTarget);
    const deck = shuffle([...selectedFoods, ...selectedFoods].map((food, index) => ({
      ...food,
      cardId: `${food.id}-${index}`,
    })));
    const content = `
      <section class="minigame-stage memory-stage" data-minigame-stage>
        <div class="minigame-hud">
          <span>Jogadas<br><b data-memory-moves>0</b></span>
          <span>Pares<br><b data-memory-pairs>0/${pairTarget}</b></span>
          <span>Vidas<br><b data-memory-lives>6</b></span>
          <span>Tempo<br><b data-memory-time>00:00</b></span>
        </div>
        <div class="memory-board" role="grid" aria-label="Cartas do jogo da memória">
          ${deck.map((food, index) => `
            <button class="memory-card" type="button" data-memory-card="${index}" data-food-id="${food.id}" data-food-label="${escapeHtml(food.label)}" aria-label="Virar carta ${index + 1}">
              <span class="memory-card-inner">
                <span class="memory-card-face memory-card-back" aria-hidden="true">?</span>
                <span class="memory-card-face memory-card-front" aria-hidden="true">
                  <img src="${escapeHtml(food.assetUrl)}" alt="">
                </span>
              </span>
            </button>
          `).join('')}
        </div>
      </section>`;
    host.innerHTML = shellMarkup(GAME_INFO.memory.title, content);
    bindShell();
    startRewardClock();

    const cards = [...host.querySelectorAll('[data-memory-card]')];
    const movesNode = host.querySelector('[data-memory-moves]');
    const pairsNode = host.querySelector('[data-memory-pairs]');
    const livesNode = host.querySelector('[data-memory-lives]');
    const timeNode = host.querySelector('[data-memory-time]');
    const startedAt = Date.now();
    let openCards = [];
    let moves = 0;
    let pairs = 0;
    let lives = 6;
    let locked = false;

    const timer = setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAt) / 1000);
      const minutes = Math.floor(seconds / 60);
      timeNode.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }, 1000);
    addCleanup(() => clearInterval(timer));

    function completeMemoryGame() {
      const seconds = Math.floor((Date.now() - startedAt) / 1000);
      const moveBonus = moves <= 10 ? 6 : moves <= 13 ? 4 : moves <= 17 ? 2 : 0;
      const xp = Math.min(30, 12 + lives * 2 + moveBonus);
      void finishGame({
        gameId: 'memory',
        score: Math.max(1, 32 - moves),
        success: true,
        xp,
        summary: `Você encontrou os ${pairTarget} pares em ${moves} jogadas e ${seconds} segundos.`,
      });
    }

    function flipCard(card) {
      if (locked || card.classList.contains('flipped') || card.classList.contains('matched')) return;
      card.classList.add('flipped');
      card.setAttribute('aria-label', `Carta revelada: ${card.dataset.foodLabel || 'fruta'}`);
      openCards.push(card);
      if (openCards.length < 2) return;

      moves += 1;
      movesNode.textContent = String(moves);
      const [first, second] = openCards;
      if (first.dataset.foodId === second.dataset.foodId) {
        first.classList.add('matched');
        second.classList.add('matched');
        first.setAttribute('aria-label', `${first.dataset.foodLabel || 'Fruta'}, par encontrado`);
        second.setAttribute('aria-label', `${second.dataset.foodLabel || 'Fruta'}, par encontrado`);
        first.disabled = true;
        second.disabled = true;
        openCards = [];
        pairs += 1;
        pairsNode.textContent = `${pairs}/${pairTarget}`;
        if (pairs === pairTarget) setTimeout(completeMemoryGame, 350);
        return;
      }

      locked = true;
      lives -= 1;
      livesNode.textContent = String(Math.max(0, lives));
      const board = host.querySelector('.memory-board');
      board?.classList.remove('mistake');
      void board?.offsetWidth;
      board?.classList.add('mistake');

      function coverBoard() {
        cards.forEach((visibleCard, index) => {
          visibleCard.classList.remove('flipped', 'matched');
          visibleCard.disabled = false;
          visibleCard.setAttribute('aria-label', `Virar carta ${index + 1}`);
        });
        openCards = [];
        pairs = 0;
        pairsNode.textContent = `0/${pairTarget}`;
        board?.classList.remove('mistake');
      }

      if (lives <= 0) {
        const lockUntil = Date.now() + 60 * 60 * 1000;
        const lockTimer = setTimeout(() => {
          coverBoard();
          void finishGame({
            gameId: 'memory',
            lockUntil,
            score: pairs,
            success: false,
            xp: 0,
            summary: 'Você perdeu as seis vidas. O jogo ficará disponível novamente em 1 hora.',
          });
        }, 720);
        addCleanup(() => clearTimeout(lockTimer));
        return;
      }
      const mismatchTimer = setTimeout(() => {
        coverBoard();
        locked = false;
      }, 720);
      addCleanup(() => clearTimeout(mismatchTimer));
    }

    cards.forEach(card => card.addEventListener('click', () => flipCard(card)));
  }

  function open(config) {
    close(false);
    session = {
      config: {
        ...config,
        canPlay: config.canPlay !== false,
        foods: Array.isArray(config.foods) ? config.foods.filter(Boolean) : [],
        memoryLockedUntil: Number(config.memoryLockedUntil) || 0,
        rewardReadyAt: Number(config.rewardReadyAt) || 0,
      },
      currentGame: null,
      finished: false,
    };
    renderHub();
  }

  function close(notify = true) {
    const previous = session;
    clearGame();
    session = null;
    host.innerHTML = '';
    if (notify && previous && typeof previous.config.onExit === 'function') {
      previous.config.onExit();
    }
  }

  window.SuperPokegochiMinigames = {
    close,
    isOpen: () => Boolean(session),
    open,
  };
})();
