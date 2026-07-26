;(() => {
  let state;
  let statusOpen = false;
  let moreOpen = false;
  let companionsOpen = false;
  let companionQuery = '';
  let selectedAction = null;
  let historyVisibleCount = 2;
  let statusTab = 'status';
  let trainingGame = null;
  let trainingGameId = 0;
  let trainingTransitionTimer = null;
  const formAssetStatus = new Map();

  const BRASILIA_TIME_ZONE = 'America/Sao_Paulo';
  const SHINY_UNLOCK_DAYS = 30;
  const COMPANION_RESULT_LIMIT = 36;

  function readStoredState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch {
      return null;
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getDex(id) {
    const target = id || (state && state.selected) || 'bulbasaur';
    return DEX.find(mon => mon.id === target) || DEX[0];
  }

  function getForms(mon) {
    return Array.isArray(mon.forms) && mon.forms.length
      ? mon.forms
      : [{ id: mon.id, name: mon.name, unlockLevel: 1, img: mon.img, sprite: mon.sprite }];
  }

  function formVisual(form, palette = 'normal') {
    return palette === 'shiny' && form.shiny ? form.shiny : form;
  }

  function formAssetKey(mon, form, palette = 'normal') {
    return `${mon.id}:${form.id}:${palette}`;
  }

  function getForm(mon, formId) {
    return getForms(mon).find(form => form.id === formId) || getForms(mon)[0];
  }

  function getAppearance(mon, pet) {
    const form = getForm(mon, pet && pet.activeAppearance);
    const palette = pet && pet.appearancePalette === 'shiny' && isShinyUnlocked(pet)
      ? 'shiny'
      : 'normal';
    const visual = formVisual(form, palette);
    return {
      ...mon,
      ...form,
      ...visual,
      id: form.id,
      name: form.name,
      type: form.type || mon.type,
      typeClass: form.typeClass || mon.typeClass,
      moodLine: form.moodLine || mon.moodLine,
      palette,
    };
  }

  function isFormAssetReady(mon, form, palette = 'normal') {
    if (form.assetReady && (palette === 'normal' || form.shiny)) return true;
    return formAssetStatus.get(formAssetKey(mon, form, palette)) === true;
  }

  function initializeFormAssetStatus() {
    DEX.forEach(mon => {
      getForms(mon).forEach(form => {
        if (!form.assetReady) return;
        formAssetStatus.set(formAssetKey(mon, form, 'normal'), true);
        if (form.shiny) formAssetStatus.set(formAssetKey(mon, form, 'shiny'), true);
      });
    });
  }

  function checkFormAssets() {
    const checks = DEX.flatMap(mon => getForms(mon).filter(form => !form.assetReady).flatMap(form => {
      const palettes = form.shiny ? ['normal', 'shiny'] : ['normal'];
      return palettes.map(palette => new Promise(resolve => {
        const visual = formVisual(form, palette);
        const image = new Image();
        image.onload = () => {
          formAssetStatus.set(formAssetKey(mon, form, palette), true);
          resolve();
        };
        image.onerror = () => {
          formAssetStatus.set(formAssetKey(mon, form, palette), false);
          resolve();
        };
        image.src = visual.sprite ? visual.sprite.src : visual.img;
      }));
    }));
    Promise.all(checks).then(() => render());
  }

  function getPet() {
    if (!state.pets[state.selected]) {
      state.pets[state.selected] = systemDefaultPet(getDex(), Object.keys(state.pets).length);
    }
    return state.pets[state.selected];
  }

  function showToast(message) {
    const toast = document.querySelector('[data-toast]');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function formatTime(ts) {
    const date = new Date(ts);
    return date.toLocaleTimeString('pt-BR', {
      timeZone: BRASILIA_TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function brasiliaClock() {
    const parts = new Intl.DateTimeFormat('pt-BR', {
      timeZone: BRASILIA_TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    const hour = Number(values.hour);
    return {
      label: `${values.hour}:${values.minute}`,
      phase: hour >= 6 && hour < 18 ? 'day' : 'night',
    };
  }

  function goBack() {
    showToast('Voltando para o perfil...');
    setTimeout(() => {
      if (history.length > 1) history.back();
    }, 380);
  }
  const RULES = {
    maxOfflineHours: 24,
    decayPerHour: { hunger: 4, happiness: 2, energy: 3 },
    play: { happiness: 12, energy: -12, hunger: -5 },
    sleepTickMs: 30 * 60 * 1000,
    sleepEnergyPerTick: 10,
    wakeEnergy: 80,
    trainDurationMs: 10 * 60 * 1000,
    trainCost: { energy: 20, hunger: 10 },
    trainXp: 30,
  };

  const FOOD_ITEMS = [
    { id: 'apple', label: 'Maçã', icon: '🍎', rarity: 'common', hunger: 25, happiness: 2, bond: 1 },
    { id: 'berry', label: 'Berry', icon: '🫐', rarity: 'common', hunger: 25, happiness: 2, bond: 1 },
    { id: 'biscuit', label: 'Biscoito', icon: '🍪', rarity: 'common', hunger: 25, happiness: 2, bond: 1 },
    { id: 'candy', label: 'Doce', icon: '🍬', rarity: 'common', hunger: 25, happiness: 2, bond: 1 },
    { id: 'rareFruit', label: 'Fruta rara', icon: '✨', rarity: 'rare', hunger: 40, happiness: 5, bond: 2 },
  ];

  const FOOD_BY_ID = Object.fromEntries(FOOD_ITEMS.map(food => [food.id, food]));
  let foodOpen = false;
  let dailyRewardMessage = null;

  function systemDefaultBag() {
    return { apple: 2, berry: 2, biscuit: 2, candy: 1, rareFruit: 0 };
  }

  function todayKey() {
    const date = new Date();
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
  }

  function systemDefaultPet(mon, index = 0) {
    return {
      dexId: mon.id,
      customName: mon.name,
      level: 1,
      xp: 0,
      hunger: clamp(78 - index * 3),
      happiness: clamp(72 + index * 2),
      energy: 82,
      bond: clamp(10 + index * 4),
      activeSince: now(),
      activeAppearance: getForms(mon)[0].id,
      appearancePalette: 'normal',
      evolutionDecisions: {},
      sleeping: false,
      sleepStartedAt: null,
      lastSleepTick: null,
      training: null,
      lastUpdate: now(),
      lastAction: 'Pronto para começar a jornada.',
      history: [{ at: now(), text: 'Entrou no gramado.', icon: '🌿' }],
    };
  }

  function systemInitialState() {
    return {
      selected: 'bulbasaur',
      session: 21,
      bag: systemDefaultBag(),
      daily: { lastFoodGrant: null },
      pets: Object.fromEntries(DEX.slice(0, 1).map((mon, index) => [mon.id, systemDefaultPet(mon, index)])),
    };
  }

  function migrateBag(bag = {}) {
    return { ...systemDefaultBag(), ...bag };
  }

  function migrateRestCopy(text, name) {
    const replacements = {
      [`${name} dormiu sozinho porque ficou cansado.`]: `${name} começou a descansar porque ficou cansado.`,
      [`${name} aceitou dormir.`]: `${name} começou a descansar.`,
      [`${name} acordou com energia renovada.`]: `${name} terminou o descanso com energia renovada.`,
      [`${name} acordou e está pronto para brincar.`]: `${name} terminou o descanso e está pronto para brincar.`,
    };
    return replacements[text] || text;
  }

  function migratePet(pet, id, index = 0) {
    const mon = getDex(id);
    const fresh = systemDefaultPet(mon, index);
    const migrated = { ...fresh, ...pet };
    migrated.dexId = id;
    migrated.customName = migrated.customName || mon.name;
    migrated.level = Math.max(1, Number(migrated.level) || 1);
    migrated.xp = Math.max(0, Number(migrated.xp) || 0);
    migrated.hunger = clamp(migrated.hunger ?? fresh.hunger);
    migrated.happiness = clamp(migrated.happiness ?? fresh.happiness);
    migrated.energy = clamp(migrated.energy ?? fresh.energy);
    migrated.bond = clamp(migrated.bond ?? fresh.bond);
    migrated.activeAppearance = getForms(mon).some(form => form.id === migrated.activeAppearance)
      ? migrated.activeAppearance
      : getForms(mon)[0].id;
    migrated.evolutionDecisions = migrated.evolutionDecisions && typeof migrated.evolutionDecisions === 'object'
      ? migrated.evolutionDecisions
      : {};
    migrated.sleeping = Boolean(migrated.sleeping);
    migrated.sleepStartedAt = migrated.sleepStartedAt || null;
    migrated.lastSleepTick = migrated.lastSleepTick || null;
    migrated.training = migrated.training && migrated.training.endsAt ? migrated.training : null;
    if (migrated.training && !migrated.training.startedAt) migrated.training.startedAt = now();
    migrated.lastUpdate = migrated.lastUpdate || now();
    migrated.lastAction = migrateRestCopy(migrated.lastAction || fresh.lastAction, migrated.customName);
    migrated.history = Array.isArray(migrated.history) && migrated.history.length
      ? migrated.history.slice(0, 12).map(item => ({
        ...item,
        text: migrateRestCopy(item.text, migrated.customName),
      }))
      : fresh.history;
    const historyTimes = migrated.history.map(item => Number(item.at)).filter(Number.isFinite);
    migrated.activeSince = Number(pet && pet.activeSince)
      || (historyTimes.length ? Math.min(...historyTimes) : now());
    migrated.appearancePalette = migrated.appearancePalette === 'shiny' && isShinyUnlocked(migrated)
      ? 'shiny'
      : 'normal';
    delete migrated.health;
    return migrated;
  }

  function systemMigrateState(current) {
    const base = systemInitialState();
    const migrated = {
      ...base,
      ...current,
      bag: migrateBag(current && current.bag),
      daily: { ...base.daily, ...(current && current.daily) },
      pets: { ...base.pets, ...((current && current.pets) || {}) },
    };
    migrated.pets = Object.fromEntries(
      Object.entries(migrated.pets).map(([id, pet], index) => [id, migratePet(pet, id, index)])
    );
    return migrated;
  }

  function addFoodToBag(appState, foodId, count = 1) {
    appState.bag = migrateBag(appState.bag);
    appState.bag[foodId] = Math.max(0, (appState.bag[foodId] || 0) + count);
  }

  function randomCommonFoodId() {
    const common = FOOD_ITEMS.filter(food => food.rarity === 'common');
    return common[Math.floor(Math.random() * common.length)].id;
  }

  function claimDailyLoginReward(appState) {
    const key = todayKey();
    appState.daily = appState.daily || {};
    if (appState.daily.lastFoodGrant === key) return null;

    const drops = [];
    for (let i = 0; i < 3; i += 1) {
      const foodId = Math.random() < 0.12 ? 'rareFruit' : randomCommonFoodId();
      drops.push(foodId);
      addFoodToBag(appState, foodId, 1);
    }
    appState.daily.lastFoodGrant = key;

    const summary = drops
      .map(id => FOOD_BY_ID[id].label)
      .reduce((acc, label) => ({ ...acc, [label]: (acc[label] || 0) + 1 }), {});
    return `Login diário: +${Object.entries(summary).map(([label, count]) => `${count} ${label}`).join(', ')}.`;
  }

  function systemXpNeeded(pet) {
    return 100 + pet.level * 10;
  }

  function systemAddHistory(pet, icon, text) {
    pet.history = [{ at: now(), icon, text }, ...(pet.history || [])].slice(0, 12);
  }

  function systemAddXp(pet, amount) {
    pet.xp += amount;
    let leveled = false;
    while (pet.xp >= systemXpNeeded(pet)) {
      pet.xp -= systemXpNeeded(pet);
      pet.level += 1;
      leveled = true;
    }
    if (leveled) {
      systemAddHistory(pet, '⭐', `${pet.customName} subiu para o nível ${pet.level}.`);
      showToast(`${pet.customName} subiu para o nível ${pet.level}!`);
    }
  }

  function activeDaysFor(pet) {
    const elapsed = Math.max(0, now() - Number(pet.activeSince || now()));
    return Math.floor(elapsed / (24 * 60 * 60 * 1000)) + 1;
  }

  function isShinyUnlocked(pet) {
    return activeDaysFor(pet) >= SHINY_UNLOCK_DAYS;
  }

  function isFormUnlocked(pet, form) {
    return pet.level >= (form.unlockLevel || 1);
  }

  function getEvolutionOffer(mon, pet) {
    return getForms(mon).find(form => (
      (form.unlockLevel || 1) > 1
      && isFormUnlocked(pet, form)
      && isFormAssetReady(mon, form)
      && !pet.evolutionDecisions[form.id]
    )) || null;
  }

  function applyAppearance(mon, pet, form) {
    const defaultNames = getForms(mon).map(item => item.name);
    if (defaultNames.includes(pet.customName)) pet.customName = form.name;
    pet.activeAppearance = form.id;
  }

  function selectAppearance(formId) {
    const pet = getPet();
    const mon = getDex();
    const form = getForm(mon, formId);
    const palette = pet.appearancePalette === 'shiny' ? 'shiny' : 'normal';
    if (!isFormUnlocked(pet, form)) {
      showToast(`${form.name} será liberado no nível ${form.unlockLevel}.`);
      return;
    }
    if (!isFormAssetReady(mon, form, palette)) {
      const visual = formVisual(form, palette);
      showToast(`Adicione ${visual.img.split('/').pop()} para usar essa aparência.`);
      return;
    }

    applyAppearance(mon, pet, form);
    pet.lastAction = `${form.name} está usando a aparência ${palette === 'shiny' ? 'Shiny' : 'normal'}.`;
    saveState();
    render();
    showToast(`Aparência alterada para ${form.name}${palette === 'shiny' ? ' Shiny' : ''}.`);
  }

  function selectPalette(palette) {
    const pet = getPet();
    const mon = getDex();
    const form = getForm(mon, pet.activeAppearance);
    const nextPalette = palette === 'shiny' ? 'shiny' : 'normal';

    if (nextPalette === 'shiny' && !isShinyUnlocked(pet)) {
      const remaining = Math.max(0, SHINY_UNLOCK_DAYS - activeDaysFor(pet));
      showToast(`Shiny libera com ${SHINY_UNLOCK_DAYS} dias de vínculo. Faltam ${remaining}.`);
      return;
    }
    if (!isFormAssetReady(mon, form, nextPalette)) {
      showToast(`A aparência ${nextPalette === 'shiny' ? 'Shiny' : 'normal'} ainda não tem sprite.`);
      return;
    }
    if (pet.appearancePalette === nextPalette) return;

    pet.appearancePalette = nextPalette;
    pet.lastAction = nextPalette === 'shiny'
      ? `${pet.customName} revelou sua aparência Shiny.`
      : `${pet.customName} voltou para sua aparência normal.`;
    systemAddHistory(pet, nextPalette === 'shiny' ? '✨' : '🌿', pet.lastAction);
    saveState();
    render();
    showToast(pet.lastAction);
  }

  function chooseEvolution(formId, choice) {
    const pet = getPet();
    const mon = getDex();
    const form = getForm(mon, formId);
    if (!isFormUnlocked(pet, form) || !isFormAssetReady(mon, form)) return;

    pet.evolutionDecisions[form.id] = choice;
    if (choice === 'evolve') {
      const previousName = pet.customName;
      applyAppearance(mon, pet, form);
      pet.lastAction = `${previousName} escolheu evoluir para ${form.name}.`;
      systemAddHistory(pet, '✨', pet.lastAction);
    } else {
      pet.lastAction = `${form.name} foi liberado, mas ${pet.customName} continuará com a forma atual.`;
      systemAddHistory(pet, '🌱', pet.lastAction);
    }
    saveState();
    render();
    showToast(choice === 'evolve'
      ? `${form.name} agora está em uso.`
      : `${form.name} ficou disponível em Aparência.`);
  }

  function rollTrainingReward(appState) {
    const roll = Math.random();
    if (roll < 0.7) {
      const foodId = randomCommonFoodId();
      addFoodToBag(appState, foodId, 1);
      return `Ganhou 1 ${FOOD_BY_ID[foodId].label}.`;
    }
    if (roll < 0.95) {
      const first = randomCommonFoodId();
      const second = randomCommonFoodId();
      addFoodToBag(appState, first, 1);
      addFoodToBag(appState, second, 1);
      return 'Ganhou 2 comidas comuns.';
    }
    addFoodToBag(appState, 'rareFruit', 1);
    return 'Ganhou 1 Fruta rara.';
  }

  function trainingTargetCenter(round) {
    return [38, 50, 62][Math.max(0, Math.min(2, round - 1))];
  }

  function startTrainingGame() {
    clearTimeout(trainingTransitionTimer);
    trainingGameId += 1;
    trainingGame = {
      id: trainingGameId,
      round: 1,
      totalRounds: 3,
      score: 0,
      results: [],
      locked: false,
      markerPercent: null,
      feedback: null,
    };
    statusOpen = false;
    moreOpen = false;
    foodOpen = false;
  }

  function cancelTrainingGame() {
    clearTimeout(trainingTransitionTimer);
    trainingGame = null;
    render();
    showToast('Treino cancelado sem gastar energia.');
  }

  function finishTrainingGame(gameId) {
    if (!trainingGame || trainingGame.id !== gameId) return;
    const game = trainingGame;
    const pet = getPet();
    const reward = rollTrainingReward(state);

    pet.energy = clamp(pet.energy - RULES.trainCost.energy);
    pet.hunger = clamp(pet.hunger - RULES.trainCost.hunger);
    pet.happiness = clamp(pet.happiness + 4);
    systemAddXp(pet, game.score);
    pet.lastAction = `${pet.customName} concluiu o treino com ${game.score} XP. ${reward}`;
    systemAddHistory(pet, '🏅', pet.lastAction);
    pet.lastUpdate = now();

    trainingGame = null;
    selectedAction = 'train';
    saveState();
    render();
    showToast(pet.lastAction);
    setTimeout(() => {
      if (selectedAction !== 'train') return;
      selectedAction = null;
      render();
    }, 650);
  }

  function hitTrainingTarget() {
    if (!trainingGame || trainingGame.locked) return;
    const track = document.querySelector('[data-training-track]');
    const marker = document.querySelector('[data-training-marker]');
    if (!track || !marker) return;

    const trackRect = track.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    const markerCenter = markerRect.left + markerRect.width / 2;
    const markerPercent = clamp(((markerCenter - trackRect.left) / trackRect.width) * 100);
    const distance = Math.abs(markerPercent - trainingTargetCenter(trainingGame.round));

    let result = { label: 'Quase!', points: 4, tone: 'near' };
    if (distance <= 8) result = { label: 'Perfeito!', points: 12, tone: 'perfect' };
    else if (distance <= 18) result = { label: 'Bom!', points: 8, tone: 'good' };

    const activeId = trainingGame.id;
    trainingGame.score += result.points;
    trainingGame.results.push(result);
    trainingGame.markerPercent = markerPercent;
    trainingGame.feedback = result;
    trainingGame.locked = true;
    render();

    trainingTransitionTimer = setTimeout(() => {
      if (!trainingGame || trainingGame.id !== activeId) return;
      if (trainingGame.round >= trainingGame.totalRounds) {
        finishTrainingGame(activeId);
        return;
      }
      trainingGame.round += 1;
      trainingGame.locked = false;
      trainingGame.markerPercent = null;
      trainingGame.feedback = null;
      render();
    }, 720);
  }

  function startSleep(pet, automatic = false) {
    if (pet.sleeping) return;
    pet.sleeping = true;
    pet.sleepStartedAt = now();
    pet.lastSleepTick = now();
    pet.training = null;
    pet.lastAction = automatic
      ? `${pet.customName} começou a descansar porque ficou cansado.`
      : `${pet.customName} começou a descansar.`;
    systemAddHistory(pet, '💤', pet.lastAction);
  }

  function wakePet(pet) {
    if (!pet.sleeping) return;
    pet.sleeping = false;
    pet.sleepStartedAt = null;
    pet.lastSleepTick = null;
    pet.lastAction = pet.energy < 10
      ? `${pet.customName} levantou, mas ainda está cansado e precisa descansar.`
      : `${pet.customName} terminou o descanso e está pronto para brincar.`;
    systemAddHistory(pet, '☀️', pet.lastAction);
  }

  function processSleep(pet, timestamp = now()) {
    if (!pet.sleeping) return;
    const lastTick = pet.lastSleepTick || pet.sleepStartedAt || timestamp;
    const ticks = Math.floor((timestamp - lastTick) / RULES.sleepTickMs);
    if (ticks > 0) {
      pet.energy = clamp(pet.energy + ticks * RULES.sleepEnergyPerTick);
      pet.lastSleepTick = lastTick + ticks * RULES.sleepTickMs;
    }
    if (pet.energy >= RULES.wakeEnergy) {
      pet.energy = clamp(Math.max(pet.energy, RULES.wakeEnergy));
      pet.sleeping = false;
      pet.sleepStartedAt = null;
      pet.lastSleepTick = null;
      pet.lastAction = `${pet.customName} terminou o descanso com energia renovada.`;
      systemAddHistory(pet, '☀️', pet.lastAction);
    }
  }

  function processTraining(pet, appState, timestamp = now()) {
    if (!pet.training || timestamp < pet.training.endsAt) return;
    const reward = rollTrainingReward(appState);
    pet.training = null;
    systemAddXp(pet, RULES.trainXp);
    pet.lastAction = `${pet.customName} terminou o treino. +${RULES.trainXp} XP. ${reward}`;
    systemAddHistory(pet, '🏅', pet.lastAction);
  }

  function systemApplyOfflineDecay(pet, appState = state) {
    const timestamp = now();
    const elapsedHours = Math.min(
      RULES.maxOfflineHours,
      Math.max(0, (timestamp - (pet.lastUpdate || timestamp)) / 3600000)
    );

    if (elapsedHours >= 0.01) {
      pet.hunger = clamp(pet.hunger - elapsedHours * RULES.decayPerHour.hunger);
      pet.happiness = clamp(pet.happiness - elapsedHours * RULES.decayPerHour.happiness);
      if (!pet.sleeping) {
        pet.energy = clamp(pet.energy - elapsedHours * RULES.decayPerHour.energy);
      }
      pet.lastUpdate = timestamp;
    }

    processTraining(pet, appState, timestamp);
    processSleep(pet, timestamp);
  }

  function syncAllPets(appState = state) {
    for (const pet of Object.values(appState.pets)) systemApplyOfflineDecay(pet, appState);
  }

  function busyMessage(pet) {
    if (pet.training) return `${pet.customName} está treinando agora.`;
    if (pet.sleeping) return `${pet.customName} está descansando.`;
    return null;
  }

  function needsRest(pet) {
    return !pet.sleeping && pet.energy < 10;
  }

  function feedPet(foodId) {
    const pet = getPet();
    const food = FOOD_BY_ID[foodId];
    systemApplyOfflineDecay(pet);

    const busy = busyMessage(pet);
    if (busy) {
      showToast(busy);
      return;
    }
    if (!food || !state.bag || (state.bag[foodId] || 0) <= 0) {
      showToast('A mochila está sem essa comida.');
      return;
    }
    if (pet.hunger > 90) {
      showToast(`${pet.customName} já está satisfeito.`);
      return;
    }

    state.bag[foodId] -= 1;
    pet.hunger = clamp(pet.hunger + food.hunger);
    pet.happiness = clamp(pet.happiness + food.happiness);
    pet.lastAction = `${pet.customName} comeu ${food.label}.`;
    systemAddHistory(pet, food.icon, pet.lastAction);
    pet.lastUpdate = now();
    selectedAction = 'feed';
    saveState();
    render();
    showToast(pet.lastAction);
    setTimeout(() => {
      if (selectedAction !== 'feed') return;
      selectedAction = null;
      render();
    }, 600);
  }

  const SYSTEM_ACTIONS = {
    play: {
      label: 'Brincar',
      short: 'Brincar',
      icon: '✨',
      run(pet) {
        const busy = busyMessage(pet);
        if (busy) return busy;
        if (pet.energy < 10) return 'Seu companheiro está cansado demais para brincar.';

        pet.happiness = clamp(pet.happiness + RULES.play.happiness);
        pet.energy = clamp(pet.energy + RULES.play.energy);
        pet.hunger = clamp(pet.hunger + RULES.play.hunger);
        pet.lastAction = `${pet.customName} brincou com você.`;
        systemAddHistory(pet, '✨', pet.lastAction);
        return null;
      },
    },
    sleep: {
      label: 'Descansar',
      short: 'Descansar',
      icon: '💤',
      run(pet) {
        if (pet.training) return `${pet.customName} está treinando agora.`;
        if (pet.sleeping) {
          wakePet(pet);
          return null;
        }
        if (pet.energy < 50) {
          startSleep(pet, false);
          return null;
        }

        const refusalChance = pet.energy > 75 ? 0.9 : 0.55;
        if (Math.random() < refusalChance) return `${pet.customName} não precisa descansar agora.`;
        startSleep(pet, false);
        return null;
      },
    },
    train: {
      label: 'Treinar',
      short: 'Treino',
      icon: '🏅',
      run(pet) {
        const busy = busyMessage(pet);
        if (busy) return busy;
        if (pet.energy <= 30) return 'Seu companheiro está cansado demais para treinar.';
        if (pet.hunger <= 20) return 'Seu companheiro precisa comer antes de treinar.';

        startTrainingGame();
        return false;
      },
    },
  };

  function systemDoAction(key) {
    const pet = getPet();
    systemApplyOfflineDecay(pet);
    selectedAction = key === 'sleep' && pet.sleeping ? 'wake' : key;
    const message = SYSTEM_ACTIONS[key].run(pet);
    pet.lastUpdate = now();
    const shouldAnimate = !trainingGame;
    if (trainingGame) selectedAction = null;
    saveState();
    render();
    if (message !== false) showToast(message || pet.lastAction);
    if (shouldAnimate) {
      const actionToClear = selectedAction;
      setTimeout(() => {
        if (selectedAction !== actionToClear) return;
        selectedAction = null;
        render();
      }, 540);
    }
  }

  function systemMoodFor(pet) {
    if (pet.training) return { label: 'Treinando', icon: '🏅', className: 'focused', note: `treina por mais ${formatDuration(pet.training.endsAt - now())}.` };
    if (pet.sleeping) return { label: 'Descansando', icon: '💤', className: 'sleepy', note: 'está recuperando energia.' };
    if (pet.hunger < 25) return { label: 'Com fome', icon: '🍎', className: 'danger', note: 'precisa comer antes de novas aventuras.' };
    if (pet.energy < 20) return { label: 'Cansado', icon: '💤', className: 'sleepy', note: 'quer descansar um pouco.' };
    if (pet.happiness < 35) return { label: 'Carente', icon: '💛', className: 'warning', note: 'quer atenção.' };

    const avg = (pet.hunger + pet.happiness + pet.energy) / 3;
    if (avg >= 82) return { label: 'Animado', icon: '✨', className: 'happy', note: 'está animado!' };
    return { label: 'Tranquilo', icon: '🌿', className: 'calm', note: 'está tranquilo.' };
  }

  function formatDuration(ms) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes <= 0) return `${seconds}s`;
    return `${minutes}min ${String(seconds).padStart(2, '0')}s`;
  }

  function systemStatBar(name, value, icon) {
    const safe = clamp(value);
    return `
      <div class="stat-row">
        <div class="stat-label"><span>${icon}</span>${name}</div>
        <div class="stat-track"><i style="width:${safe}%"></i></div>
        <strong>${safe}</strong>
      </div>`;
  }

  function systemBondDays(pet) {
    const days = activeDaysFor(pet);
    return `
      <div class="stat-row bond-days-row">
        <div class="stat-label"><span>🤝</span>Vínculo</div>
        <div class="bond-days-value"><strong>${days} ${days === 1 ? 'dia' : 'dias'}</strong><small>juntos</small></div>
      </div>`;
  }

  function renderPokemonVisual(mon, className = '', label = mon.name, hidden = false) {
    if (mon.sprite) {
      const maxFrame = Math.max(mon.sprite.frameWidth, mon.sprite.frameHeight);
      const classes = ['pokemon-sprite', className].filter(Boolean).join(' ');
      const style = [
        `--sprite-url:url(${mon.sprite.src})`,
        `--frame-width:${mon.sprite.frameWidth}px`,
        `--frame-height:${mon.sprite.frameHeight}px`,
        `--sheet-width:${mon.sprite.sheetWidth}px`,
        `--sheet-shift:-${mon.sprite.sheetWidth}px`,
        `--sprite-frames:${mon.sprite.frames}`,
        `--preview-scale:${Math.min(1, 42 / maxFrame).toFixed(3)}`,
        `--mini-scale:${Math.min(1, 30 / maxFrame).toFixed(3)}`,
        `--evolution-scale:${Math.min(2, 76 / maxFrame).toFixed(3)}`,
      ].join(';');
      const aria = hidden ? 'aria-hidden="true"' : `role="img" aria-label="${label}"`;
      return `<span class="${classes}" style="${style}" ${aria}></span>`;
    }

    return `<img class="${className}" src="${mon.img}" alt="${hidden ? '' : label}" ${hidden ? 'aria-hidden="true"' : ''} loading="lazy">`;
  }

  function stageVisualStyle(mon) {
    if (!mon.sprite) return '';
    const maxFrame = Math.max(mon.sprite.frameWidth, mon.sprite.frameHeight);
    const scale = Math.min(5.45, 207 / maxFrame);
    return `style="--sprite-stage-scale:${scale.toFixed(3)};--sprite-stage-scale-compact:${(scale * .98).toFixed(3)};--sprite-stage-scale-small:${(scale * .89).toFixed(3)};--sprite-stage-scale-short:${(scale * .92).toFixed(3)};width:${mon.sprite.frameWidth}px;height:${mon.sprite.frameHeight}px"`;
  }

  function bagCount() {
    return Object.values(migrateBag(state.bag)).reduce((total, count) => total + count, 0);
  }

  function renderFoodTray(pet) {
    return `
      <div class="food-tray">
        <div class="tray-head">
          <div><small>Mochila</small><b>Comidas disponíveis</b></div>
          <span>${bagCount()} itens</span>
        </div>
        <div class="food-grid">
          ${FOOD_ITEMS.map(food => {
            const count = (state.bag && state.bag[food.id]) || 0;
            return `
              <button class="food-item ${food.rarity}" type="button" data-feed-food="${food.id}" ${count <= 0 ? 'disabled' : ''}>
                <span>${food.icon}</span>
                <b>${food.label}</b>
                <small>${food.rarity === 'rare' ? '+40 fome' : '+25 fome'} · x${count}</small>
              </button>`;
          }).join('')}
        </div>
        ${pet.hunger > 90 ? `<p class="tray-note">${pet.customName} já está satisfeito.</p>` : ''}
      </div>`;
  }

  function renderAppearancePanel(mon, pet) {
    const forms = getForms(mon);
    const days = activeDaysFor(pet);
    const shinyUnlocked = isShinyUnlocked(pet);
    const palette = pet.appearancePalette === 'shiny' && shinyUnlocked ? 'shiny' : 'normal';
    const currentForm = getForm(mon, pet.activeAppearance);
    const currentShinyReady = isFormAssetReady(mon, currentForm, 'shiny');
    return `
      <div class="appearance-panel">
        <div class="palette-block">
          <div class="palette-heading">
            <small>${shinyUnlocked ? 'Shiny liberado' : `${Math.min(days, SHINY_UNLOCK_DAYS)}/${SHINY_UNLOCK_DAYS} dias de vínculo`}</small>
          </div>
          <div class="palette-segment" role="group" aria-label="Cor da aparência">
            <button type="button" data-palette="normal" class="${palette === 'normal' ? 'active' : ''}"
              aria-pressed="${palette === 'normal'}">
              <span class="palette-dot normal"></span><b>Normal</b>
            </button>
            <button type="button" data-palette="shiny" class="${palette === 'shiny' ? 'active' : ''}"
              aria-pressed="${palette === 'shiny'}" ${(!shinyUnlocked || !currentShinyReady) ? 'disabled' : ''}>
              <span class="palette-dot shiny"></span><b>Shiny</b>
              ${!shinyUnlocked ? '<i aria-hidden="true">30</i>' : ''}
            </button>
          </div>
        </div>
        <p class="appearance-note">O nível e os cuidados são compartilhados entre todas as formas.</p>
        <div class="appearance-list">
          ${forms.map(form => {
            const unlocked = isFormUnlocked(pet, form);
            const assetReady = isFormAssetReady(mon, form, palette);
            const selected = pet.activeAppearance === form.id;
            const visual = formVisual(form, palette);
            const appearance = { ...mon, ...form, ...visual, id: form.id, name: form.name, palette };
            let stateLabel = 'Disponível';
            if (selected) stateLabel = 'Em uso';
            else if (!unlocked) stateLabel = `Nível ${form.unlockLevel}`;
            else if (!assetReady) stateLabel = 'Sprite pendente';

            return `
              <button class="appearance-option ${selected ? 'selected' : ''} ${!assetReady ? 'missing' : ''}" type="button"
                data-appearance="${form.id}" ${(!unlocked || !assetReady || selected) ? 'disabled' : ''}
                aria-label="${selected ? `${form.name} em uso` : `Usar aparência ${form.name}`}">
                <span class="appearance-preview">
                  ${assetReady ? renderPokemonVisual(appearance, 'form-sprite', form.name) : '<b>?</b>'}
                </span>
                <span class="appearance-copy">
                  <b>${form.name}</b>
                  <small>${assetReady ? `Nível ${form.unlockLevel} · ${palette === 'shiny' ? 'Shiny' : 'Normal'}` : visual.img.split('/').pop()}</small>
                </span>
                <span class="appearance-state">${stateLabel}</span>
              </button>`;
          }).join('')}
        </div>
      </div>`;
  }

  function renderEvolutionOffer(mon, pet, form) {
    if (!form) return '';
    const appearance = { ...mon, ...form, id: form.id, name: form.name };
    return `
      <div class="evolution-overlay" role="dialog" aria-modal="true" aria-labelledby="evolution-title">
        <div class="evolution-panel">
          <small>Evolução disponível</small>
          <span class="evolution-preview">${renderPokemonVisual(appearance, 'evolution-sprite', form.name)}</span>
          <h2 id="evolution-title">${pet.customName} pode evoluir</h2>
          <p>${form.name} foi liberado no nível ${form.unlockLevel}. Seu nível ${pet.level} e todos os cuidados continuarão iguais.</p>
          <button class="evolution-primary" type="button" data-evolution-choice="evolve" data-evolution-form="${form.id}">
            <span>✨</span><b>Evoluir para ${form.name}</b>
          </button>
          <button class="evolution-secondary" type="button" data-evolution-choice="later" data-evolution-form="${form.id}">
            Continuar como ${pet.customName}
          </button>
          <small class="evolution-hint">A aparência de ${form.name} continuará disponível na Pokébola.</small>
        </div>
      </div>`;
  }

  function renderTrainingGame(pet) {
    if (!trainingGame) return '';
    const targetCenter = trainingTargetCenter(trainingGame.round);
    const targetWidth = 24;
    const targetLeft = targetCenter - targetWidth / 2;
    const markerStop = trainingGame.markerPercent ?? 6;
    const resultSlots = Array.from({ length: trainingGame.totalRounds }, (_, index) => {
      const result = trainingGame.results[index];
      return `<span class="${result ? result.tone : ''}" aria-label="${result ? result.label : `Rodada ${index + 1}`}">${result ? result.points : index + 1}</span>`;
    }).join('');

    return `
      <div class="training-overlay" role="dialog" aria-modal="true" aria-labelledby="training-title">
        <div class="training-panel">
          <button class="training-close" type="button" data-training-cancel aria-label="Fechar treino">×</button>
          <div class="training-heading">
            <small>Treino de precisão</small>
            <h2 id="training-title">Acerte a área verde</h2>
            <p>Toque em “Parar” quando a Pokébola estiver sobre o alvo.</p>
          </div>
          <div class="training-meta">
            <b>Rodada ${trainingGame.round} de ${trainingGame.totalRounds}</b>
            <strong>${trainingGame.score} XP</strong>
          </div>
          <div class="training-track ${trainingGame.locked ? 'locked' : ''}" data-training-track>
            <span class="training-target" style="left:${targetLeft}%;width:${targetWidth}%"></span>
            <i class="training-marker" data-training-marker style="--marker-stop:${markerStop}%"><span></span></i>
          </div>
          <div class="training-feedback ${trainingGame.feedback ? trainingGame.feedback.tone : ''}" aria-live="polite">
            ${trainingGame.feedback
              ? `<b>${trainingGame.feedback.label}</b><span>+${trainingGame.feedback.points} XP</span>`
              : '<b>Observe o ritmo</b><span>O alvo muda a cada rodada</span>'}
          </div>
          <div class="training-rounds" aria-label="Resultado das rodadas">${resultSlots}</div>
          <button class="training-hit" type="button" data-training-hit ${trainingGame.locked ? 'disabled' : ''}>
            <span>◎</span><b>Parar!</b>
          </button>
          <small class="training-cost">Ao concluir: -20 energia, -10 fome</small>
        </div>
      </div>`;
  }

  function renderActivityCard(pet) {
    if (pet.training) {
      const pct = Math.max(0, Math.min(100, ((now() - pet.training.startedAt) / RULES.trainDurationMs) * 100));
      return `
        <div class="activity-card">
          <div class="activity-copy"><span>🏅</span><div><b>Treino em andamento</b><small>Termina em ${formatDuration(pet.training.endsAt - now())}</small></div></div>
          <div class="activity-bar"><i style="width:${pct}%"></i></div>
        </div>`;
    }
    if (pet.sleeping) {
      return `
        <div class="activity-card sleeping-card">
          <div class="activity-copy"><span>💤</span><div><b>Descansando</b><small>Energia +10 a cada 30 minutos. Você também pode encerrar o descanso.</small></div></div>
          <div class="activity-bar"><i style="width:${pet.energy}%"></i></div>
        </div>`;
    }
    return `
      <div class="activity-card">
        <div class="activity-copy"><span>🌿</span><div><b>Ciclo de cuidado</b><small>Comer, treinar, brincar e descansar.</small></div></div>
      </div>`;
  }

  function systemRecentHistory(pet) {
    const history = pet.history || [];
    const items = history.slice(0, historyVisibleCount);
    if (!items.length) return '<p class="empty-history">Nenhum cuidado registrado ainda.</p>';

    const hasMore = history.length > items.length;
    return `
      <div class="history-list compact-history">${items.map(item => `
        <div class="history-item">
          <span>${item.icon || '•'}</span>
          <p>${item.text}<small>${formatTime(item.at)}</small></p>
        </div>`).join('')}</div>
      ${hasMore ? `<button class="history-more" type="button" data-history-more>Ver mais ${Math.min(3, history.length - items.length)}</button>` : `<p class="history-end">Fim do histórico recente</p>`}`;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function normalizeCompanionSearch(value) {
    return String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  function companionSearchData() {
    const rawQuery = companionQuery.trim();
    const numericMatch = rawQuery.match(/^#?0*(\d+)$/);
    const query = normalizeCompanionSearch(rawQuery);
    let matches;
    if (numericMatch) {
      const dexNumber = Number(numericMatch[1]);
      matches = DEX.filter(mon => mon.dexNumber === dexNumber);
    } else if (query) {
      matches = DEX.filter(mon => {
        const paddedNumber = String(mon.dexNumber || '').padStart(3, '0');
        const haystack = [
          mon.name,
          mon.id,
          mon.dexNumber,
          paddedNumber,
        ].map(normalizeCompanionSearch);
        return haystack.some(value => value.includes(query));
      });
    } else {
      const selected = getDex();
      matches = [selected, ...DEX.filter(mon => mon.id !== selected.id)];
    }
    return {
      total: matches.length,
      visible: matches.slice(0, COMPANION_RESULT_LIMIT),
    };
  }

  function systemMiniCompanion(mon) {
    const pet = state.pets[mon.id] || systemDefaultPet(mon);
    systemApplyOfflineDecay(pet);
    const mood = systemMoodFor(pet);
    const low = pet.hunger < 30 || pet.energy < 18 || pet.happiness < 30;
    const appearance = getAppearance(mon, pet);
    const dexLabel = mon.dexNumber ? `#${String(mon.dexNumber).padStart(3, '0')}` : mon.id;
    return `
      <button class="companion-row ${state.selected === mon.id ? 'active' : ''}" type="button" data-select="${mon.id}" aria-label="Selecionar ${mon.name}">
        <span class="mini-orb ${low ? 'needs-care' : ''}">${renderPokemonVisual(appearance, 'mini-sprite', appearance.name)}</span>
        <span class="companion-copy"><b>${mon.name}</b><small>${dexLabel} · ${mood.icon} ${mood.label} · Nv. ${pet.level}</small></span>
        <span class="companion-chevron">›</span>
      </button>`;
  }

  function companionResultsMarkup() {
    const results = companionSearchData();
    return {
      summary: companionQuery.trim()
        ? `${results.total} ${results.total === 1 ? 'resultado' : 'resultados'}`
        : `${DEX.length} espécies cadastradas`,
      html: results.visible.length
        ? results.visible.map(systemMiniCompanion).join('')
        : '<div class="companion-empty"><b>Nenhum Pokémon encontrado</b><small>Tente outro nome ou número.</small></div>',
    };
  }

  function bindCompanionRows(scope = document) {
    scope.querySelectorAll('[data-select]').forEach(btn => {
      btn.addEventListener('click', () => systemSelectPet(btn.dataset.select));
    });
  }

  function updateCompanionResults() {
    const list = document.querySelector('[data-companion-results]');
    const summary = document.querySelector('[data-companion-summary]');
    if (!list || !summary) return;
    const results = companionResultsMarkup();
    list.innerHTML = results.html;
    summary.textContent = results.summary;
    bindCompanionRows(list);
  }

  function systemSelectPet(id) {
    if (!state.pets[id]) state.pets[id] = systemDefaultPet(getDex(id), Object.keys(state.pets).length);
    state.selected = id;
    companionQuery = '';
    companionsOpen = false;
    moreOpen = false;
    foodOpen = false;
    saveState();
    render();
    showToast(`${getDex(id).name} agora está no gramado.`);
  }

  function systemRender() {
    const pet = getPet();
    const species = getDex();
    systemApplyOfflineDecay(pet);
    saveState();

    const mon = getAppearance(species, pet);
    const mood = systemMoodFor(pet);
    const xpPercent = Math.min(100, (pet.xp / systemXpNeeded(pet)) * 100);
    const needsCare = pet.hunger < 30 || pet.energy < 18 || pet.happiness < 30;
    const hungry = pet.hunger < 30;
    const anyNeedsCare = Object.values(state.pets).some(p => p.hunger < 30 || p.energy < 18 || p.happiness < 30);
    const restRequired = needsRest(pet);
    const careLocked = pet.sleeping || restRequired;
    const foodLocked = pet.sleeping;
    const selectedImgStyle = selectedAction ? ` action-${selectedAction}` : '';
    const sheetExpanded = moreOpen || foodOpen;
    const hasCompanions = DEX.length > 1;
    const companionResults = hasCompanions && companionsOpen ? companionResultsMarkup() : null;
    const clock = brasiliaClock();
    const evolutionOffer = getEvolutionOffer(species, pet);

    root.innerHTML = `
      <section class="phone-shell">
        <header class="topbar" aria-label="Resumo do companheiro">
          <button class="pokeball-button ${needsCare ? 'alert' : ''}" type="button" data-status-toggle aria-label="Abrir painel do companheiro">
            <span class="pokeball-icon"><i></i></span>
            ${needsCare ? '<em></em>' : ''}
          </button>
          <div class="name-block">
            <div class="name-line">
              <strong>${pet.customName}</strong>
              <span class="type-pill ${mon.typeClass}">${mon.type}</span>
              ${mon.palette === 'shiny' ? '<span class="shiny-badge">Shiny</span>' : ''}
            </div>
            <div class="xp-bar" aria-label="Experiência"><i style="width:${xpPercent}%"></i></div>
          </div>
          <div class="level-card">
            <span>Nv.</span>
            <strong>${pet.level}</strong>
          </div>
        </header>

        <aside class="status-dropdown ${statusOpen ? 'open' : ''}" aria-live="polite">
          <div class="status-card">
            <div class="drop-arrow"></div>
            <div class="status-head">
              <span class="status-avatar">${renderPokemonVisual(mon, 'avatar-sprite', mon.name)}</span>
              <div><small>Painel do companheiro</small><h2>${pet.customName}</h2></div>
              <button class="close-panel" type="button" data-status-toggle aria-label="Fechar status">×</button>
            </div>
            <div class="status-tabs" role="tablist" aria-label="Seções do painel">
              <button type="button" role="tab" data-status-tab="status" class="${statusTab === 'status' ? 'active' : ''}" aria-selected="${statusTab === 'status'}">Status</button>
              <button type="button" role="tab" data-status-tab="appearance" class="${statusTab === 'appearance' ? 'active' : ''}" aria-selected="${statusTab === 'appearance'}">Aparência</button>
            </div>
            ${statusTab === 'status' ? `
              ${needsCare ? `<div class="status-alert"><b>${hungry ? '🍎 Está com fome!' : '⚠ Precisa de atenção!'}</b><span>Bloqueios leves, sem vida e sem morte.</span></div>` : `<div class="status-alert good"><b>✨ Tudo certo!</b><span>${pet.customName} está bem cuidado.</span></div>`}
              <div class="status-grid">
                ${systemStatBar('Fome', pet.hunger, '🍎')}
                ${systemStatBar('Felicidade', pet.happiness, '✨')}
                ${systemStatBar('Energia', pet.energy, '💤')}
                ${systemBondDays(pet)}
              </div>
              <div class="status-meta">
                <span>XP ${pet.xp}/${systemXpNeeded(pet)}</span>
                <span>Mochila ${bagCount()} itens</span>
              </div>
              <div class="last-action"><b>Última ação</b><p>${pet.lastAction}</p></div>
            ` : renderAppearancePanel(species, pet)}
          </div>
        </aside>

        <main class="camp-area ${mood.className} phase-${clock.phase}" data-brasilia-time="${clock.label}">
          <div class="time-light" aria-hidden="true"></div>
          <div class="mood-pill ${needsCare ? 'need' : ''}"><span>${mood.icon}</span><b>${mood.label}</b></div>
          <button class="pet-stage ${selectedImgStyle} ${pet.sleeping ? 'is-sleeping' : pet.energy < 20 ? 'is-tired' : ''}" type="button" data-status-toggle aria-label="Abrir status de ${pet.customName}">
            <span class="pet-aura"></span>
            ${pet.sleeping
              ? '<span class="resting-pokeball" aria-hidden="true"><i></i></span>'
              : `<span class="stage-sprite-wrap" ${stageVisualStyle(mon)}>${renderPokemonVisual(mon, 'stage-sprite', mon.name, true)}</span>`}
            <span class="pet-shadow"></span>
          </button>
          <div class="speech"><b>${mood.icon} ${mood.note}</b><br>${pet.customName} ${mon.moodLine}</div>
        </main>

        ${hasCompanions ? `<button class="companions-fab ${anyNeedsCare ? 'alert' : ''}" type="button" data-companions-toggle aria-label="Abrir companheiros">
          <span class="stacked-faces">
            ${DEX.slice(0,3).map(m => renderPokemonVisual(m, 'stack-sprite', m.name, true)).join('')}
          </span>
          <i>+</i>
        </button>` : ''}

        <section class="care-sheet ${sheetExpanded ? 'expanded' : ''}" aria-label="Cuidar do Tamagotchi">
          <button class="more-toggle" type="button" data-more-toggle aria-expanded="${moreOpen}">
            <span>${moreOpen ? '⌄' : '⌃'}</span>
            <b>${moreOpen ? 'Fechar' : 'Mais'}</b>
          </button>

          ${foodOpen && !foodLocked ? renderFoodTray(pet) : ''}

          <div class="more-panel" ${moreOpen ? '' : 'inert'}>
            ${renderActivityCard(pet)}
            <div class="more-card history-card">
              <div class="more-title"><span>📜</span><b>Histórico</b></div>
              ${systemRecentHistory(pet)}
            </div>
            <div class="more-actions">
              ${hasCompanions ? '<button type="button" class="soft-option" data-companions-toggle><span>👥</span>Companheiros</button>' : ''}
              <button type="button" class="soft-option" data-go-back><span>↩</span>Voltar</button>
            </div>
          </div>

          <div class="action-dock">
            <button class="action-btn action-feed-btn ${foodOpen ? 'active' : ''}" data-food-toggle type="button" aria-label="Abrir mochila de comidas" ${foodLocked ? 'disabled' : ''}>
              <span>🎒</span><b>Comida</b>
            </button>
            ${Object.entries(SYSTEM_ACTIONS).map(([key, action]) => {
              const endingRest = key === 'sleep' && pet.sleeping;
              const label = endingRest ? 'Levantar' : action.short;
              const icon = endingRest ? '☀️' : action.icon;
              const disabled = key !== 'sleep' && careLocked;
              return `
                <button class="action-btn action-${key}-btn ${endingRest ? 'action-wake-btn' : ''} ${selectedAction === (endingRest ? 'wake' : key) ? 'active' : ''}" data-action="${key}" type="button" aria-label="${label}" ${disabled ? 'disabled' : ''}>
                  <span>${icon}</span><b>${label}</b>
                </button>`;
            }).join('')}
          </div>
        </section>

        ${renderTrainingGame(pet)}
        ${renderEvolutionOffer(species, pet, evolutionOffer)}

        ${hasCompanions && companionsOpen ? `<aside class="companions-drawer open" aria-label="Lista de companheiros">
          <div class="drawer-card">
            <div class="drawer-head">
              <div><small>Equipe do perfil</small><h2>Companheiros</h2></div>
              <button type="button" class="close-panel" data-companions-toggle aria-label="Fechar companheiros">×</button>
            </div>
            <label class="companion-search">
              <span aria-hidden="true">⌕</span>
              <input type="search" data-companion-search value="${escapeHtml(companionQuery)}" placeholder="Nome ou ID" autocomplete="off" spellcheck="false">
            </label>
            <div class="companion-results-meta" data-companion-summary>${companionResults.summary}</div>
            <div class="companions-list" data-companion-results>${companionResults.html}</div>
          </div>
        </aside>` : ''}
      </section>
    `;

    document.querySelectorAll('[data-action]').forEach(btn => btn.addEventListener('click', () => systemDoAction(btn.dataset.action)));
    document.querySelectorAll('[data-status-tab]').forEach(btn => btn.addEventListener('click', () => {
      statusTab = btn.dataset.statusTab;
      render();
    }));
    document.querySelectorAll('[data-appearance]').forEach(btn => btn.addEventListener('click', () => selectAppearance(btn.dataset.appearance)));
    document.querySelectorAll('[data-palette]').forEach(btn => btn.addEventListener('click', () => selectPalette(btn.dataset.palette)));
    document.querySelectorAll('[data-evolution-choice]').forEach(btn => btn.addEventListener('click', () => chooseEvolution(btn.dataset.evolutionForm, btn.dataset.evolutionChoice)));
    document.querySelectorAll('[data-training-hit]').forEach(btn => btn.addEventListener('click', hitTrainingTarget));
    document.querySelectorAll('[data-training-cancel]').forEach(btn => btn.addEventListener('click', cancelTrainingGame));
    document.querySelectorAll('[data-feed-food]').forEach(btn => btn.addEventListener('click', () => feedPet(btn.dataset.feedFood)));
    document.querySelectorAll('[data-food-toggle]').forEach(btn => btn.addEventListener('click', () => {
      foodOpen = !foodOpen;
      moreOpen = false;
      statusOpen = false;
      render();
      if (foodOpen && bagCount() <= 0) showToast('A mochila está vazia.');
    }));
    bindCompanionRows();
    const companionSearchInput = document.querySelector('[data-companion-search]');
    if (companionSearchInput) {
      companionSearchInput.addEventListener('input', () => {
        companionQuery = companionSearchInput.value;
        updateCompanionResults();
      });
    }
    document.querySelectorAll('[data-history-more]').forEach(btn => btn.addEventListener('click', () => { historyVisibleCount += 3; render(); }));
    document.querySelectorAll('[data-status-toggle]').forEach(btn => btn.addEventListener('click', () => { statusOpen = !statusOpen; companionsOpen = false; render(); }));
    document.querySelectorAll('[data-more-toggle]').forEach(btn => btn.addEventListener('click', () => { moreOpen = !moreOpen; foodOpen = false; statusOpen = false; render(); }));
    document.querySelectorAll('[data-companions-toggle]').forEach(btn => btn.addEventListener('click', () => {
      companionsOpen = !companionsOpen;
      statusOpen = false;
      render();
      if (companionsOpen) requestAnimationFrame(() => document.querySelector('[data-companion-search]')?.focus());
    }));
    document.querySelectorAll('[data-go-back]').forEach(btn => btn.addEventListener('click', goBack));
  }

  const render = systemRender;
  initializeFormAssetStatus();
  state = systemMigrateState(readStoredState());
  dailyRewardMessage = claimDailyLoginReward(state);
  syncAllPets(state);
  saveState();
  render();
  checkFormAssets();
  if (dailyRewardMessage) setTimeout(() => showToast(dailyRewardMessage), 300);
  setInterval(() => {
    syncAllPets(state);
    saveState();
    render();
  }, 10000);
})();












