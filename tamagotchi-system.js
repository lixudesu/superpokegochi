;(() => {
  let state;
  let statusOpen = false;
  let moreOpen = false;
  let companionsOpen = false;
  let companionSearchOpen = false;
  let companionQuery = '';
  let pendingCompanionSelection = null;
  let pendingArchiveCompanion = null;
  let selectedAction = null;
  let historyVisibleCount = 2;
  let statusTab = 'status';
  let battleMenuOpen = false;
  let battleMenuTab = 'train';
  let battleHistoryVisibleCount = 5;
  let trainingGame = null;
  let trainingGameId = 0;
  let trainingTransitionTimer = null;
  let battleHydrationKey = null;
  let moveEditorOpen = false;
  let moveSelectionDraft = [];
  let attributeResetOpen = false;
  let attributeResetPending = false;
  let verificationGateOpen = false;
  let socialHistoryVisibleCount = 5;
  let socialGiftSending = false;
  let socialBattleSaving = false;
  const pendingSocialGiftClaims = new Set();
  const formAssetStatus = new Map();

  const BRASILIA_TIME_ZONE = 'America/Sao_Paulo';
  const SHINY_UNLOCK_DAYS = 30;
  const COMPANION_RESULT_LIMIT = 36;
  const BRIDGE_NAME_PREFIX = 'superpokegochi:';
  const BRIDGE_HASH_PREFIX = '#state=';
  const MUSIC_VOLUME = 0.14;
  const DUCKED_MUSIC_VOLUME = 0.065;
  const SOUND_EFFECT_VOLUME = 0.24;
  const ITEM_BASE_PATH = document.documentElement.dataset.itemBase || 'assets/items/';
  const CARE_DAY_MS = 24 * 60 * 60 * 1000;
  const BOND_GRACE_PERIOD_MS = CARE_DAY_MS;
  const BOND_RESET_VALUE = 10;
  const BATTLE_ENERGY_COST = 25;
  const BATTLE_HUNGER_COST = 6;
  const MINIGAME_DAILY_GOALS = {
    catch: { label: 'Chuva de Frutas', target: 30, xp: 35 },
    memory: { label: 'Memória de Frutas', target: 1, xp: 35 },
  };
  const WORLD_RULES = {
    firstFoodDelayMs: 20 * 60 * 1000,
    firstLeafDelayMs: 75 * 1000,
    foodLifetimeMs: 10 * 60 * 1000,
    foodSpawnMaxMs: 65 * 60 * 1000,
    foodSpawnMinMs: 35 * 60 * 1000,
    leafLifetimeMs: 10 * 60 * 1000,
    leafSpawnMaxMs: 3 * 60 * 1000,
    leafSpawnMinMs: 90 * 1000,
    maxFoodDrops: 1,
    maxLeaves: 5,
    maxOfflineLeaves: 3,
    offlineLeafIntervalMs: 40 * 60 * 1000,
  };
  const MUSIC_TRACKS = [
    { file: '1-02. Theme Of Pallet Town.mp3', startAt: 0.85, endBefore: 5.35 },
    { file: '1-03. Professor Oak.mp3', startAt: 0.87, endBefore: 5.33 },
    { file: "1-04. Oak's Laboratory.mp3", startAt: 1.02, endBefore: 5.5 },
    { file: '1-09. Theme Of Pewter City.mp3', startAt: 0.66, endBefore: 5.8 },
    { file: '1-24. St. Anne.mp3', startAt: 0.83, endBefore: 6.36 },
  ];
  const MUSIC_BASE_PATH = document.documentElement.dataset.musicBase || 'assets/musics/';
  const SOUND_BASE_PATH = document.documentElement.dataset.soundBase || 'assets/sounds/';
  const SOUND_ASSET_VERSION = '20260730-battle-audio-v23';
  const SOUND_EFFECT_FILES = {
    evolution: 'evolution.mp3',
    food: 'comida.mp3',
  };
  const backgroundMusic = new Audio();
  const soundEffects = Object.fromEntries(
    Object.entries(SOUND_EFFECT_FILES).map(([name, file]) => [name, new Audio(soundEffectUrl(file))]),
  );
  let loadedMusicTrackIndex = -1;
  let musicResumeArmed = false;
  let activeSoundEffect = null;
  let queuedSoundEffect = null;
  let pendingSoundEffect = null;
  let announcedEvolutionOfferKey = null;
  const embeddedInSite = (
    window.parent !== window
    && new URLSearchParams(window.location.search).get('embedded') === '1'
  );
  let initialBridgeState = null;

  if (embeddedInSite) {
    try {
      const serializedState = window.location.hash.startsWith(BRIDGE_HASH_PREFIX)
        ? decodeURIComponent(window.location.hash.slice(BRIDGE_HASH_PREFIX.length))
        : window.name.slice(BRIDGE_NAME_PREFIX.length);
      initialBridgeState = JSON.parse(serializedState);
    } catch {
      initialBridgeState = null;
    }
  }

  function notifySite(type, detail = {}) {
    if (!embeddedInSite) return;
    window.parent.postMessage({ type: `superpokegochi:${type}`, ...detail }, window.location.origin);
  }

  function isSocialVisitorMode() {
    return embeddedInSite && state && state.social && state.social.mode === 'visitor';
  }

  function canChooseCompanion() {
    return !embeddedInSite || Boolean(
      state
      && state.social
      && state.social.mode === 'owner'
      && state.social.canChooseCompanion !== false
    );
  }

  function requestVerification() {
    if (!embeddedInSite) return;
    notifySite('verification-request');
  }

  function readStoredState() {
    if (initialBridgeState) {
      const bridged = initialBridgeState;
      initialBridgeState = null;
      return bridged;
    }

    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch {
      return null;
    }
  }

  function saveState() {
    if (!embeddedInSite) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    if (isSocialVisitorMode()) {
      return;
    }

    if (embeddedInSite && state.needsCompanionChoice && state.roster.length === 0) {
      return;
    }
    notifySite('state', { state });
  }

  function getMusicEnabled() {
    return Boolean(state && state.settings && state.settings.musicEnabled);
  }

  function getMusicTrackIndex() {
    const index = Number(state && state.settings && state.settings.musicTrackIndex);
    if (!Number.isInteger(index) || index < 0) return 0;
    return index % MUSIC_TRACKS.length;
  }

  function chooseRandomStartingMusicTrack() {
    const currentIndex = getMusicTrackIndex();
    const nextIndex = MUSIC_TRACKS.length > 1
      ? (currentIndex + 1 + Math.floor(Math.random() * (MUSIC_TRACKS.length - 1))) % MUSIC_TRACKS.length
      : 0;
    state.settings = { ...(state.settings || {}), musicTrackIndex: nextIndex };
    loadedMusicTrackIndex = -1;
  }

  function musicTrackUrl(index) {
    return new URL(`${MUSIC_BASE_PATH}${encodeURIComponent(MUSIC_TRACKS[index].file)}`, document.baseURI).href;
  }

  function soundEffectUrl(file) {
    return new URL(
      `${SOUND_BASE_PATH}${encodeURIComponent(file)}?v=${SOUND_ASSET_VERSION}`,
      document.baseURI,
    ).href;
  }

  function finishSoundEffect(sound) {
    if (activeSoundEffect !== sound) return;
    activeSoundEffect = null;
    if (queuedSoundEffect && getMusicEnabled()) {
      const nextEffect = queuedSoundEffect;
      queuedSoundEffect = null;
      void playSoundEffect(nextEffect.name, nextEffect.retryOnInteraction);
      return;
    }
    backgroundMusic.volume = MUSIC_VOLUME;
  }

  function stopSoundEffects() {
    queuedSoundEffect = null;
    pendingSoundEffect = null;
    for (const sound of Object.values(soundEffects)) {
      sound.pause();
      try {
        sound.currentTime = 0;
      } catch {
        // The browser may not have loaded the effect metadata yet.
      }
    }
    activeSoundEffect = null;
    backgroundMusic.volume = MUSIC_VOLUME;
  }

  async function playSoundEffect(name, retryOnInteraction = false) {
    if (!getMusicEnabled()) return false;
    const sound = soundEffects[name];
    if (!sound) return false;

    if (
      activeSoundEffect
      && activeSoundEffect !== sound
      && !activeSoundEffect.paused
      && !activeSoundEffect.ended
    ) {
      queuedSoundEffect = { name, retryOnInteraction };
      return true;
    }
    try {
      sound.currentTime = 0;
    } catch {
      // Playback can still start when the browser finishes loading the file.
    }
    sound.volume = SOUND_EFFECT_VOLUME;
    activeSoundEffect = sound;
    backgroundMusic.volume = DUCKED_MUSIC_VOLUME;

    try {
      await sound.play();
      return true;
    } catch {
      finishSoundEffect(sound);
      if (retryOnInteraction && getMusicEnabled()) {
        pendingSoundEffect = name;
        armMusicResume();
      }
      return false;
    }
  }

  function seekMusicToLoopStart(force = false) {
    const track = MUSIC_TRACKS[getMusicTrackIndex()];
    if (!track || !Number.isFinite(backgroundMusic.duration)) return;
    const startAt = Math.min(track.startAt, Math.max(0, backgroundMusic.duration - 0.25));
    if (force || backgroundMusic.currentTime < startAt) backgroundMusic.currentTime = startAt;
  }

  function loopCurrentMusicTrack() {
    if (!state || !getMusicEnabled()) return;
    seekMusicToLoopStart(true);
    void playBackgroundMusic();
  }

  function skipMusicOutroSilence() {
    const track = MUSIC_TRACKS[getMusicTrackIndex()];
    if (!track || !getMusicEnabled() || !Number.isFinite(backgroundMusic.duration)) return;
    if (backgroundMusic.currentTime >= backgroundMusic.duration - track.endBefore) {
      loopCurrentMusicTrack();
    }
  }

  function loadBackgroundMusic(index = getMusicTrackIndex()) {
    if (loadedMusicTrackIndex === index && backgroundMusic.src) return;
    loadedMusicTrackIndex = index;
    backgroundMusic.src = musicTrackUrl(index);
    backgroundMusic.volume = activeSoundEffect ? DUCKED_MUSIC_VOLUME : MUSIC_VOLUME;
    backgroundMusic.preload = 'auto';
  }

  function armMusicResume() {
    if (musicResumeArmed) return;
    musicResumeArmed = true;
    const resume = () => {
      document.removeEventListener('pointerdown', resume, true);
      document.removeEventListener('keydown', resume, true);
      musicResumeArmed = false;
      if (getMusicEnabled() && backgroundMusic.paused) void playBackgroundMusic();
      if (pendingSoundEffect) {
        const effectName = pendingSoundEffect;
        pendingSoundEffect = null;
        void playSoundEffect(effectName);
      }
    };
    document.addEventListener('pointerdown', resume, true);
    document.addEventListener('keydown', resume, true);
  }

  async function playBackgroundMusic(showFeedback = false) {
    if (!getMusicEnabled()) return false;
    loadBackgroundMusic();
    backgroundMusic.volume = activeSoundEffect ? DUCKED_MUSIC_VOLUME : MUSIC_VOLUME;
    if (backgroundMusic.readyState >= 1) seekMusicToLoopStart();
    try {
      await backgroundMusic.play();
      if (showFeedback) showToast('Música ligada.');
      return true;
    } catch {
      armMusicResume();
      if (showFeedback) showToast('Música ligada.');
      return false;
    }
  }

  function setMusicEnabled(enabled) {
    state.settings = {
      ...(state.settings || {}),
      musicEnabled: Boolean(enabled),
    };
    saveState();
    render();
    if (enabled) {
      void playBackgroundMusic(true);
    } else {
      backgroundMusic.pause();
      stopSoundEffects();
      showToast('Música desligada.');
    }
  }

  backgroundMusic.addEventListener('loadedmetadata', () => seekMusicToLoopStart());
  backgroundMusic.addEventListener('timeupdate', skipMusicOutroSilence);
  backgroundMusic.addEventListener('ended', loopCurrentMusicTrack);
  for (const sound of Object.values(soundEffects)) {
    sound.preload = 'auto';
    sound.volume = SOUND_EFFECT_VOLUME;
    sound.addEventListener('ended', () => finishSoundEffect(sound));
    sound.addEventListener('error', () => finishSoundEffect(sound));
  }

  function getPokegochiNotificationPreference() {
    return Boolean(state && state.settings && state.settings.pokegochiNotificationsEnabled);
  }

  function setPokegochiNotificationPreference(enabled) {
    if (!embeddedInSite) {
      showToast('Abra o SuperPokégochi pelo seu perfil para configurar notificações.');
      return;
    }

    state.settings = {
      ...(state.settings || {}),
      pokegochiNotificationsEnabled: Boolean(enabled),
    };
    saveState();
    render();
    notifySite('notification-preference', { enabled: Boolean(enabled) });
    showToast(enabled ? 'Ativando lembretes...' : 'Desativando lembretes...');
  }

  function getDex(id) {
    const target = id || (state && state.selected) || 'bulbasaur';
    const petDexId = state && state.pets && state.pets[target] && state.pets[target].dexId;
    return DEX.find(mon => mon.id === (petDexId || target)) || DEX[0];
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
      const species = getDex();
      const journeyKey = createJourneyKey();
      state.selected = journeyKey;
      state.pets[journeyKey] = systemDefaultPet(
        species,
        Object.keys(state.pets).length,
        journeyKey,
      );
    }
    return state.pets[state.selected];
  }

  function showToast(message, durationMs = 2600) {
    const toast = document.querySelector('[data-toast]');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    const duration = Math.max(1600, Math.min(7000, Number(durationMs) || 2600));
    showToast.timer = setTimeout(() => toast.classList.remove('show'), duration);
  }

  function formatTime(ts) {
    const date = new Date(ts);
    return date.toLocaleTimeString('pt-BR', {
      timeZone: BRASILIA_TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatBattleDate(ts) {
    const date = new Date(ts);
    if (Number.isNaN(date.getTime())) return 'Data indisponível';
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: BRASILIA_TIME_ZONE,
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
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
    if (embeddedInSite) {
      notifySite('back');
      return;
    }

    showToast('Voltando para o perfil...');
    setTimeout(() => {
      if (history.length > 1) history.back();
    }, 380);
  }
  const RULES = {
    maxOfflineHours: 24,
    decayPerHour: { hunger: 2.5, happiness: 1, energy: 1.25 },
    play: { happiness: 9, energyCost: { catch: 8, memory: 6 }, hungerCost: 2, bond: 1 },
    sleepTickMs: 6 * 60 * 1000,
    sleepEnergyPerTick: 10,
    sleepXpPerTick: 1,
    wakeEnergy: 100,
    trainDurationMs: 10 * 60 * 1000,
    trainCost: { energy: 12, hunger: 6 },
    trainXp: 30,
  };

  const FOOD_ITEMS = [
    { id: 'apple', label: 'Maçã', asset: 'food-apple.png', historyIcon: '🍎', rarity: 'common', hunger: 24, happiness: 2, energy: 1, bond: 1, hpPercent: 20, xp: 2 },
    { id: 'strawberry', label: 'Morango', asset: 'food-strawberry.png', historyIcon: '🍓', rarity: 'common', hunger: 20, happiness: 3, energy: 1, bond: 1, hpPercent: 20, xp: 3 },
    { id: 'blackberry', label: 'Amora', asset: 'food-blackberry.png', historyIcon: '🫐', rarity: 'common', hunger: 18, happiness: 4, energy: 1, bond: 1, hpPercent: 22, xp: 4 },
    { id: 'pear', label: 'Pera', asset: 'food-pear.png', historyIcon: '🍐', rarity: 'common', hunger: 24, happiness: 2, energy: 1, bond: 1, hpPercent: 20, xp: 2 },
    { id: 'grape', label: 'Uva', asset: 'food-grape.png', historyIcon: '🍇', rarity: 'common', hunger: 20, happiness: 3, energy: 1, bond: 1, hpPercent: 20, xp: 3 },
    { id: 'orange', label: 'Laranja', asset: 'food-orange.png', historyIcon: '🍊', rarity: 'common', hunger: 22, happiness: 3, energy: 2, bond: 1, hpPercent: 22, xp: 4 },
    { id: 'banana', label: 'Banana', asset: 'food-banana.png', historyIcon: '🍌', rarity: 'common', hunger: 28, happiness: 2, energy: 3, bond: 1, hpPercent: 25, xp: 4 },
    { id: 'watermelon', label: 'Melancia', asset: 'food-watermelon.png', historyIcon: '🍉', rarity: 'uncommon', hunger: 32, happiness: 3, energy: 2, bond: 2, hpPercent: 35, xp: 7 },
    { id: 'pineapple', label: 'Abacaxi Energia', asset: 'food-pineapple.png', historyIcon: '🍍', rarity: 'rare', hunger: 18, happiness: 4, energy: 30, bond: 2, hpPercent: 30, xp: 8 },
  ];

  const FOOD_BY_ID = Object.fromEntries(FOOD_ITEMS.map(food => [food.id, food]));
  const FOOD_RARITY_LABELS = {
    common: 'Comum',
    uncommon: 'Incomum',
    rare: 'Rara',
  };
  let foodOpen = false;
  let dailyRewardMessage = null;

  function minigameEnergyCost(gameId) {
    return RULES.play.energyCost[gameId] || Math.min(...Object.values(RULES.play.energyCost));
  }

  function canStartAnyMinigame(pet) {
    return pet.energy >= Math.min(...Object.values(RULES.play.energyCost));
  }

  function systemDefaultBag() {
    return {
      apple: 3,
      strawberry: 2,
      blackberry: 2,
      pear: 1,
      grape: 2,
      orange: 1,
      banana: 2,
      watermelon: 1,
      pineapple: 1,
    };
  }

  function battleDexNumber(mon) {
    const catalogMatch = mon && DEX.find(candidate => candidate.id === mon.id);
    return Math.max(1, Number(catalogMatch?.dexNumber || mon?.dexNumber) || 1);
  }

  function battleSnapshot(pet, appearance = getAppearance(getDex(), pet)) {
    const battle = window.SuperPokegochiBattle;
    if (!battle) return null;
    return battle.getSnapshot(pet, battleDexNumber(appearance), appearance.name);
  }

  function battleNeedsHpRecovery(pet, snapshot = null) {
    const currentHp = Number(snapshot?.currentHp ?? pet.battle?.currentHp);
    const maxHp = Number(snapshot?.maxHp ?? pet.battle?.lastMaxHp);
    return Number.isFinite(currentHp)
      && Number.isFinite(maxHp)
      && maxHp > 0
      && currentHp < maxHp;
  }

  function hydrateBattleProfile(pet, appearance) {
    const battle = window.SuperPokegochiBattle;
    const snapshot = battleSnapshot(pet, appearance);
    if (!battle || !snapshot) return;
    const species = getDex(pet.journeyKey);
    const unlockedDexNumbers = getForms(species)
      .filter(form => isFormUnlocked(pet, form))
      .map(form => Number(form.dexNumber || species.dexNumber))
      .filter(Number.isInteger);
    const journeyLearnsets = pet.battle?.journeyMoveLearnsets || {};
    const moveDetails = pet.battle?.moveDetails || {};
    const relevantMoveIds = [...new Set(
      unlockedDexNumbers
        .flatMap(dexNumber => (
          Array.isArray(journeyLearnsets[String(dexNumber)])
            ? journeyLearnsets[String(dexNumber)]
            : []
        ))
        .filter(move => move && move.name && Number(move.level || 1) <= pet.level + 20)
        .sort((first, second) => Number(first.level || 1) - Number(second.level || 1))
        .slice(0, 36)
        .map(move => move.name),
    )];
    const hasJourneyLearnsets = unlockedDexNumbers.every(dexNumber => (
      Array.isArray(journeyLearnsets[String(dexNumber)])
    ));
    const hasMoveDetails = relevantMoveIds.length > 0
      && relevantMoveIds.every(moveId => moveDetails[moveId]);
    if (snapshot.dataReady && hasJourneyLearnsets && hasMoveDetails) return;
    const hydrationKey = `${pet.journeyKey}:${battleDexNumber(appearance)}:${unlockedDexNumbers.join(',')}`;
    if (battleHydrationKey === hydrationKey) return;

    battleHydrationKey = hydrationKey;
    const hydration = battle.hydrateJourney
      ? battle.hydrateJourney(
          pet,
          unlockedDexNumbers,
          battleDexNumber(appearance),
          appearance.name,
        )
      : battle.hydrate(pet, battleDexNumber(appearance), appearance.name);
    void hydration
      .then(() => {
        saveState();
        if (statusOpen && (statusTab === 'status' || statusTab === 'skills')) render();
      })
      .catch(() => {
        // Os atributos continuam utilizáveis com os dados equilibrados de reserva.
      })
      .finally(() => {
        if (battleHydrationKey === hydrationKey) battleHydrationKey = null;
      });
  }

  function systemDefaultWorld() {
    const timestamp = now();
    return {
      foodDrops: [],
      lastWorldUpdateAt: timestamp,
      leaves: [],
      nextFoodAt: timestamp + WORLD_RULES.firstFoodDelayMs,
      nextLeafAt: timestamp + WORLD_RULES.firstLeafDelayMs,
    };
  }

  function systemDefaultSocial() {
    return {
      canChooseCompanion: true,
      canInteract: false,
      giftSent: false,
      gifts: [],
      history: [],
      mode: 'owner',
      ownerName: 'Treinador',
      verificationRequired: false,
      viewerCompanion: null,
    };
  }

  function todayKey() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      day: '2-digit',
      month: '2-digit',
      timeZone: BRASILIA_TIME_ZONE,
      year: 'numeric',
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function defaultPetMinigames() {
    return {
      dateKey: todayKey(),
      catch: { completed: false, effortXp: 0, progress: 0, rewardClaimed: false },
      memory: { completed: false, effortXp: 0, progress: 0, rewardClaimed: false },
    };
  }

  function migratePetMinigames(value) {
    const source = value && typeof value === 'object' ? value : {};
    if (source.dateKey !== todayKey()) return defaultPetMinigames();
    return {
      dateKey: source.dateKey,
      catch: {
        completed: source.catch?.completed === true,
        effortXp: clamp(Math.round(Number(source.catch?.effortXp) || 0), 0, 10),
        progress: clamp(Math.round(Number(source.catch?.progress) || 0), 0, MINIGAME_DAILY_GOALS.catch.target),
        rewardClaimed: source.catch?.rewardClaimed === true,
      },
      memory: {
        completed: source.memory?.completed === true,
        effortXp: clamp(Math.round(Number(source.memory?.effortXp) || 0), 0, 10),
        progress: clamp(Math.round(Number(source.memory?.progress) || 0), 0, MINIGAME_DAILY_GOALS.memory.target),
        rewardClaimed: source.memory?.rewardClaimed === true,
      },
    };
  }

  function petMinigames(pet) {
    pet.minigames = migratePetMinigames(pet.minigames);
    return pet.minigames;
  }

  function minigameDailyGoals(pet) {
    const progress = petMinigames(pet);
    return Object.fromEntries(Object.entries(MINIGAME_DAILY_GOALS).map(([gameId, goal]) => [
      gameId,
      {
        completed: progress[gameId].completed,
        current: progress[gameId].progress,
        label: gameId === 'catch'
          ? `Faça ${goal.target} pontos no total`
          : 'Vença uma partida',
        target: goal.target,
      },
    ]));
  }

  function createJourneyKey() {
    if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, character => (
      (Number(character) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(character) / 4).toString(16)
    ));
  }

  function systemDefaultPet(mon, index = 0, journeyKey = createJourneyKey()) {
    return {
      dexId: mon.id,
      journeyKey,
      customName: mon.name,
      level: 1,
      xp: 0,
      hunger: clamp(78 - index * 3),
      happiness: clamp(72 + index * 2),
      energy: 100,
      bond: clamp(10 + index * 4),
      activeSince: now(),
      activeAppearance: getForms(mon)[0].id,
      appearancePalette: 'normal',
      battle: {},
      minigames: defaultPetMinigames(),
      evolutionDecisions: {},
      sleeping: false,
      sleepStartedAt: null,
      lastSleepTick: null,
      sleepXpEarned: 0,
      training: null,
      inactiveSince: null,
      lastUpdate: now(),
      lastCareAt: now(),
      dirtCycleAt: now(),
      dirtLevel: 0,
      lastAction: 'Pronto para começar a jornada.',
      history: [{ at: now(), text: 'Entrou no gramado.', icon: '🌿' }],
    };
  }

  function systemInitialState() {
    const initialSpecies = DEX[0];
    const initialPet = systemDefaultPet(initialSpecies, 0);
    return {
      selected: initialPet.journeyKey,
      roster: [initialPet.journeyKey],
      favoriteTeam: [],
      needsCompanionChoice: false,
      session: 21,
      bag: systemDefaultBag(),
      daily: { lastFoodGrant: null },
      world: systemDefaultWorld(),
      settings: {
        musicEnabled: false,
        musicTrackIndex: 0,
        pokegochiNotificationsEnabled: false,
      },
      social: systemDefaultSocial(),
      pets: { [initialPet.journeyKey]: initialPet },
    };
  }

  function migrateBag(bag = {}) {
    const migrated = { ...systemDefaultBag() };
    const legacy = bag && typeof bag === 'object' ? bag : {};
    if (Object.keys(legacy).length === 0) return migrated;
    for (const food of FOOD_ITEMS) {
      migrated[food.id] = Object.prototype.hasOwnProperty.call(legacy, food.id)
        ? Math.max(0, Number(legacy[food.id]) || 0)
        : 0;
    }
    migrated.blackberry += Math.max(0, Number(legacy.berry) || 0);
    migrated.banana += Math.max(0, Number(legacy.biscuit) || 0);
    migrated.strawberry += Math.max(0, Number(legacy.candy) || 0);
    migrated.pineapple += Math.max(0, Number(legacy.rareFruit) || 0);
    return migrated;
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

  function migrateWorld(world) {
    const fallback = systemDefaultWorld();
    const source = world && typeof world === 'object' ? world : {};
    const leaves = Array.isArray(source.leaves)
      ? source.leaves.filter(item => (
        item
        && typeof item.id === 'string'
        && Number.isFinite(Number(item.expiresAt))
      )).slice(-WORLD_RULES.maxLeaves)
      : [];
    const foodDrops = Array.isArray(source.foodDrops)
      ? source.foodDrops.filter(item => (
        item
        && typeof item.id === 'string'
        && FOOD_BY_ID[item.foodId]
        && Number.isFinite(Number(item.expiresAt))
      )).slice(-WORLD_RULES.maxFoodDrops)
      : [];
    const nextLeafAt = Number(source.nextLeafAt) || fallback.nextLeafAt;
    const inferredLegacyWorldUpdateAt = Math.max(
      0,
      nextLeafAt - WORLD_RULES.leafSpawnMaxMs,
    );

    return {
      leaves,
      foodDrops,
      lastWorldUpdateAt: Number.isFinite(Number(source.lastWorldUpdateAt))
        ? Number(source.lastWorldUpdateAt)
        : inferredLegacyWorldUpdateAt || fallback.lastWorldUpdateAt,
      nextLeafAt,
      nextFoodAt: Number(source.nextFoodAt) || fallback.nextFoodAt,
    };
  }

  function migrateSocial(social) {
    const fallback = systemDefaultSocial();
    const source = social && typeof social === 'object' ? social : {};
    const mode = source.mode === 'visitor' ? 'visitor' : 'owner';
    const gifts = Array.isArray(source.gifts)
      ? source.gifts.filter(gift => (
        gift
        && Number.isInteger(Number(gift.id))
        && FOOD_BY_ID[gift.foodId]
      )).slice(0, 20).map(gift => ({
        createdAt: Number(gift.createdAt) || now(),
        foodId: gift.foodId,
        fromName: typeof gift.fromName === 'string' ? gift.fromName.slice(0, 80) : 'Um treinador',
        id: Number(gift.id),
        x: clamp(Number(gift.x) || 50, 8, 92),
        y: clamp(Number(gift.y) || 34, 12, 82),
      }))
      : [];
    const socialHistory = Array.isArray(source.history)
      ? source.history.filter(item => (
        item
        && ['battle', 'gift', 'visit'].includes(item.type)
        && Number.isFinite(Number(item.at))
      )).slice(0, 40).map(item => ({
        actorName: typeof item.actorName === 'string' ? item.actorName.slice(0, 80) : 'Um treinador',
        at: Number(item.at),
        foodId: FOOD_BY_ID[item.foodId] ? item.foodId : undefined,
        outcome: ['victory', 'defeat', 'fled'].includes(item.outcome) ? item.outcome : undefined,
        type: item.type,
      }))
      : [];

    return {
      ...fallback,
      canChooseCompanion: mode === 'owner' && source.canChooseCompanion !== false,
      canInteract: mode === 'visitor' && source.canInteract === true,
      giftSent: source.giftSent === true,
      gifts,
      history: socialHistory,
      mode,
      ownerName: typeof source.ownerName === 'string' && source.ownerName.trim()
        ? source.ownerName.trim().slice(0, 80)
        : fallback.ownerName,
      verificationRequired: source.verificationRequired === true,
      viewerCompanion: source.viewerCompanion && typeof source.viewerCompanion === 'object'
        ? source.viewerCompanion
        : null,
    };
  }

  function migratePet(pet, id, index = 0) {
    const mon = DEX.find(candidate => candidate.id === (pet && pet.dexId))
      || DEX.find(candidate => candidate.id === id)
      || DEX[0];
    const fresh = systemDefaultPet(mon, index);
    const migrated = { ...fresh, ...pet };
    migrated.dexId = mon.id;
    migrated.journeyKey = String(pet && pet.journeyKey || id || fresh.journeyKey);
    migrated.customName = migrated.customName || mon.name;
    migrated.level = Math.max(1, Number(migrated.level) || 1);
    migrated.xp = Math.max(0, Number(migrated.xp) || 0);
    while (migrated.level < 100 && migrated.xp >= systemXpNeeded(migrated)) {
      migrated.xp -= systemXpNeeded(migrated);
      migrated.level += 1;
    }
    if (migrated.level >= 100) {
      migrated.level = 100;
      migrated.xp = 0;
    }
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
    migrated.battle = migrated.battle && typeof migrated.battle === 'object'
      ? migrated.battle
      : {};
    migrated.minigames = migratePetMinigames(migrated.minigames);
    migrated.sleeping = Boolean(migrated.sleeping);
    migrated.sleepStartedAt = migrated.sleepStartedAt || null;
    migrated.lastSleepTick = migrated.lastSleepTick || null;
    migrated.sleepXpEarned = Math.max(0, Number(migrated.sleepXpEarned) || 0);
    migrated.training = migrated.training && migrated.training.endsAt ? migrated.training : null;
    if (migrated.training && !migrated.training.startedAt) migrated.training.startedAt = now();
    migrated.inactiveSince = migrated.inactiveSince != null
      && Number.isFinite(Number(migrated.inactiveSince))
      ? Number(migrated.inactiveSince)
      : null;
    migrated.lastUpdate = migrated.lastUpdate || now();
    migrated.lastCareAt = Number(migrated.lastCareAt) || Number(migrated.lastUpdate) || now();
    migrated.dirtCycleAt = Number(migrated.dirtCycleAt) || migrated.lastCareAt;
    migrated.dirtLevel = clamp(Math.round(Number(migrated.dirtLevel) || 0), 0, 3);
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
      settings: { ...base.settings, ...(current && current.settings) },
      social: migrateSocial(current && current.social),
      world: migrateWorld(current && current.world),
      pets: current && current.pets && Object.keys(current.pets).length
        ? { ...current.pets }
        : { ...base.pets },
    };
    delete migrated.minigames;
    delete migrated.settings.motionPreference;
    migrated.settings.musicEnabled = migrated.settings.musicEnabled === true;
    const musicTrackIndex = Number(migrated.settings.musicTrackIndex);
    migrated.settings.musicTrackIndex = Number.isInteger(musicTrackIndex) && musicTrackIndex >= 0
      ? musicTrackIndex % MUSIC_TRACKS.length
      : 0;
    migrated.settings.pokegochiNotificationsEnabled = (
      migrated.settings.pokegochiNotificationsEnabled === true
    );
    migrated.pets = Object.fromEntries(
      Object.entries(migrated.pets).map(([id, pet], index) => {
        const migratedPet = migratePet(pet, id, index);
        return [migratedPet.journeyKey, migratedPet];
      })
    );
    if (!migrated.pets[migrated.selected]) {
      const legacySelected = Object.values(migrated.pets).find(pet => pet.dexId === migrated.selected);
      migrated.selected = legacySelected?.journeyKey || Object.keys(migrated.pets)[0] || base.selected;
    }
    migrated.needsCompanionChoice = current && current.needsCompanionChoice === true;
    const rosterSource = Array.isArray(current && current.roster)
      ? current.roster
      : [migrated.selected, ...Object.keys(migrated.pets)];
    migrated.roster = rosterSource.reduce((roster, id) => {
      const journeyKey = migrated.pets[id]
        ? id
        : Object.keys(migrated.pets).find(key => migrated.pets[key].dexId === id);
      if (journeyKey && !roster.includes(journeyKey) && roster.length < 6) {
        roster.push(journeyKey);
      }
      return roster;
    }, []);
    if (migrated.needsCompanionChoice && migrated.roster.length === 0) {
      migrated.roster = [];
    } else if (!migrated.roster.includes(migrated.selected)) {
      migrated.roster = [migrated.selected, ...migrated.roster].slice(0, 6);
    } else if (migrated.roster[0] !== migrated.selected) {
      const selectedIndex = migrated.roster.indexOf(migrated.selected);
      [migrated.roster[0], migrated.roster[selectedIndex]] = [
        migrated.roster[selectedIndex],
        migrated.roster[0],
      ];
    }
    migrated.favoriteTeam = Array.isArray(current && current.favoriteTeam)
      ? current.favoriteTeam.flatMap(entry => {
          const displayId = typeof entry === 'string' ? entry : entry && entry.displayId;
          if (!DEX.some(mon => mon.id === displayId)) return [];
          const journeyKey = typeof entry === 'object' && entry && migrated.pets[entry.journeyKey]
            ? entry.journeyKey
            : null;
          return [{ displayId, journeyKey }];
        }).slice(0, 5)
      : [];
    const migratedAt = now();
    Object.values(migrated.pets).forEach(pet => {
      if (pet.journeyKey === migrated.selected) {
        pet.inactiveSince = null;
      } else if (pet.inactiveSince == null || !Number.isFinite(Number(pet.inactiveSince))) {
        pet.inactiveSince = Number(pet.lastUpdate) || migratedAt;
      }
    });
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

  function randomFoodDropId() {
    const roll = Math.random();
    if (roll < 0.08) return 'pineapple';
    if (roll < 0.22) return 'watermelon';
    return randomCommonFoodId();
  }

  function claimDailyLoginReward(appState) {
    const key = todayKey();
    appState.daily = appState.daily || {};
    if (appState.daily.lastFoodGrant === key) return null;

    const foodId = randomCommonFoodId();
    addFoodToBag(appState, foodId, 1);
    appState.daily.lastFoodGrant = key;

    return `Login diário: +1 ${FOOD_BY_ID[foodId].label}.`;
  }

  function systemXpNeeded(pet) {
    const level = Math.max(1, Math.min(100, Math.round(Number(pet.level) || 1)));
    if (level < 10) return 50 + level * 3;
    if (level < 40) return 80 + (level - 10) * 5;
    if (level < 70) return 250 + (level - 40) * 12;
    if (level < 100) return 650 + (level - 70) * 30;
    return 0;
  }

  function systemAddHistory(pet, icon, text) {
    pet.history = [{ at: now(), icon, text }, ...(pet.history || [])].slice(0, 12);
  }

  function systemAddXp(pet, amount) {
    if (pet.level >= 100) {
      pet.level = 100;
      pet.xp = 0;
      return;
    }
    pet.xp += Math.max(0, Math.round(Number(amount) || 0));
    let leveled = false;
    while (pet.level < 100 && pet.xp >= systemXpNeeded(pet)) {
      pet.xp -= systemXpNeeded(pet);
      pet.level += 1;
      leveled = true;
    }
    if (pet.level >= 100) pet.xp = 0;
    if (leveled) {
      systemAddHistory(pet, '⭐', `${pet.customName} subiu para o nível ${pet.level}.`);
      showToast(`${pet.customName} subiu para o nível ${pet.level}!`);
    }
  }

  function randomBetween(minimum, maximum) {
    return minimum + Math.random() * (maximum - minimum);
  }

  function markPetCaredFor(pet, timestamp = now()) {
    pet.lastCareAt = timestamp;
    pet.dirtCycleAt = timestamp;
  }

  function processDirt(pet, timestamp = now()) {
    const dirtCycleAt = Number(pet.dirtCycleAt) || Number(pet.lastCareAt) || timestamp;
    const elapsedCycles = Math.floor(Math.max(0, timestamp - dirtCycleAt) / CARE_DAY_MS);
    if (elapsedCycles <= 0) return false;

    pet.dirtLevel = Math.min(3, Math.max(0, Number(pet.dirtLevel) || 0) + elapsedCycles);
    pet.dirtCycleAt = dirtCycleAt + elapsedCycles * CARE_DAY_MS;
    return true;
  }

  function createWorldLeaf(timestamp, settled = false) {
    const fallDuration = Math.round(randomBetween(6200, 9000));
    const settledAt = settled ? timestamp - 1000 : timestamp + fallDuration;
    const spawnedAt = settled ? settledAt - fallDuration : timestamp;
    return {
      drift: Math.round(randomBetween(-54, 54)),
      expiresAt: (settled ? timestamp : settledAt) + WORLD_RULES.leafLifetimeMs,
      fallDuration,
      id: `leaf-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
      rotation: Math.round(randomBetween(-38, 38)),
      settledAt,
      spawnedAt,
      variant: Math.random() < 0.5 ? 1 : 2,
      x: Math.round(randomBetween(7, 93)),
      y: Math.round(randomBetween(10, 84)),
    };
  }

  function processWorld(appState, timestamp = now()) {
    appState.world = migrateWorld(appState.world);
    const world = appState.world;
    let changed = false;
    const previousWorldUpdateAt = Math.min(
      timestamp,
      Math.max(0, Number(world.lastWorldUpdateAt) || timestamp),
    );
    const offlineElapsed = Math.max(0, timestamp - previousWorldUpdateAt);

    const activeLeaves = world.leaves.filter(item => Number(item.expiresAt) > timestamp);
    const activeFoodDrops = world.foodDrops.filter(item => Number(item.expiresAt) > timestamp);
    if (activeLeaves.length !== world.leaves.length || activeFoodDrops.length !== world.foodDrops.length) {
      changed = true;
    }
    world.leaves = activeLeaves;
    world.foodDrops = activeFoodDrops;

    if (offlineElapsed >= WORLD_RULES.offlineLeafIntervalMs) {
      const availableLeafSlots = Math.max(0, WORLD_RULES.maxLeaves - world.leaves.length);
      const offlineLeafCount = Math.min(
        availableLeafSlots,
        WORLD_RULES.maxOfflineLeaves,
        Math.floor(offlineElapsed / WORLD_RULES.offlineLeafIntervalMs),
      );
      for (let index = 0; index < offlineLeafCount; index += 1) {
        world.leaves.push(createWorldLeaf(timestamp + index, true));
      }
      if (offlineLeafCount > 0) changed = true;
    }

    if (timestamp >= world.nextLeafAt) {
      if (world.leaves.length < WORLD_RULES.maxLeaves) {
        world.leaves.push(createWorldLeaf(timestamp));
        changed = true;
      }
      world.nextLeafAt = timestamp + Math.round(randomBetween(
        WORLD_RULES.leafSpawnMinMs,
        WORLD_RULES.leafSpawnMaxMs,
      ));
    }

    if (timestamp >= world.nextFoodAt) {
      if (world.foodDrops.length < WORLD_RULES.maxFoodDrops) {
        world.foodDrops.push({
          expiresAt: timestamp + WORLD_RULES.foodLifetimeMs,
          foodId: randomFoodDropId(),
          id: `food-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
          spawnedAt: timestamp,
          x: Math.round(randomBetween(10, 88)),
          y: Math.round(randomBetween(14, 78)),
        });
        changed = true;
      }
      world.nextFoodAt = timestamp + Math.round(randomBetween(
        WORLD_RULES.foodSpawnMinMs,
        WORLD_RULES.foodSpawnMaxMs,
      ));
    }

    world.lastWorldUpdateAt = timestamp;
    return changed;
  }

  function cleanDirt() {
    const pet = getPet();
    if (!pet.dirtLevel) return;
    pet.dirtLevel = 0;
    markPetCaredFor(pet);
    pet.lastAction = `${pet.customName} ficou limpinho e o gramado foi organizado.`;
    systemAddHistory(pet, '🧼', pet.lastAction);
    saveState();
    render();
    showToast('Tudo limpo!');
  }

  function collectWorldLeaf(itemId) {
    const pet = getPet();
    const previousLength = state.world.leaves.length;
    state.world.leaves = state.world.leaves.filter(item => item.id !== itemId);
    if (state.world.leaves.length === previousLength) return;
    const roll = Math.random();
    const [minimum, maximum] = roll < 0.65
      ? [1, 2]
      : roll < 0.9
        ? [3, 5]
        : roll < 0.98
          ? [6, 8]
          : [9, 12];
    const xp = minimum + Math.floor(Math.random() * (maximum - minimum + 1));
    systemAddXp(pet, xp);
    pet.lastAction = `${pet.customName} encontrou uma folha brilhante. +${xp} XP.`;
    systemAddHistory(pet, '🍃', pet.lastAction);
    saveState();
    render();
    showToast(`Folha coletada: +${xp} XP.`);
  }

  function collectWorldFood(itemId) {
    const item = state.world.foodDrops.find(drop => drop.id === itemId);
    if (!item || !FOOD_BY_ID[item.foodId]) return;
    state.world.foodDrops = state.world.foodDrops.filter(drop => drop.id !== itemId);
    addFoodToBag(state, item.foodId, 1);
    saveState();
    render();
    showToast(`${FOOD_BY_ID[item.foodId].label} guardada na mochila.`);
  }

  function collectSocialGift(giftId) {
    const numericGiftId = Number(giftId);
    const gift = state.social?.gifts?.find(item => item.id === numericGiftId);
    if (!gift || pendingSocialGiftClaims.has(numericGiftId)) return;
    pendingSocialGiftClaims.add(numericGiftId);
    notifySite('gift-claim', { giftId: numericGiftId });
    showToast('Recolhendo presente...');
  }

  function socialGiftFoodPhrase(foodId) {
    const food = FOOD_BY_ID[foodId];
    if (!food) return 'uma fruta';
    const masculine = foodId === 'strawberry' || foodId === 'pineapple';
    return `${masculine ? 'um' : 'uma'} ${food.label.toLocaleLowerCase('pt-BR')}`;
  }

  function sendSocialGift() {
    const social = state.social || systemDefaultSocial();
    if (social.verificationRequired) {
      verificationGateOpen = true;
      render();
      return;
    }
    if (!social.canInteract) {
      showToast('Escolha um Pokémon Companheiro antes de enviar presentes.');
      return;
    }
    if (socialGiftSending) return;
    socialGiftSending = true;
    render();
    notifySite('social-gift-request');
    showToast('Escolhendo uma fruta para o presente...');
  }

  function activeDaysFor(pet) {
    const elapsed = Math.max(0, now() - Number(pet.activeSince || now()));
    return Math.floor(elapsed / (24 * 60 * 60 * 1000)) + 1;
  }

  function isShinyUnlocked(pet) {
    return activeDaysFor(pet) >= SHINY_UNLOCK_DAYS;
  }

  function meetsEvolutionRequirement(pet, form) {
    return pet.level >= (form.unlockLevel || 1);
  }

  function isFormUnlocked(pet, form) {
    return (form.unlockLevel || 1) <= 1 || pet.evolutionDecisions[form.id] === 'evolve';
  }

  function formIsAncestor(mon, ancestor, descendant) {
    if (ancestor.id === descendant.id) return true;
    if (!ancestor.dexNumber || !descendant.dexNumber) {
      return Number(ancestor.unlockLevel || 1) <= Number(descendant.unlockLevel || 1);
    }
    const formsByDex = new Map(getForms(mon).map(form => [form.dexNumber, form]));
    let current = descendant;
    const visited = new Set();

    while (current?.evolvesFromDexNumber && !visited.has(current.dexNumber)) {
      visited.add(current.dexNumber);
      if (current.evolvesFromDexNumber === ancestor.dexNumber) return true;
      current = formsByDex.get(current.evolvesFromDexNumber);
    }

    return false;
  }

  function isEvolutionBranchCompatible(mon, pet, form) {
    const evolvedForms = getForms(mon).filter(candidate => (
      (candidate.unlockLevel || 1) > 1
      && pet.evolutionDecisions[candidate.id] === 'evolve'
    ));

    return evolvedForms.every(unlocked => (
      formIsAncestor(mon, unlocked, form)
      || formIsAncestor(mon, form, unlocked)
    ));
  }

  function isEvolutionParentUnlocked(mon, pet, form) {
    const forms = getForms(mon);
    if ((form.unlockLevel || 1) <= 1) return true;

    if (form.evolvesFromDexNumber) {
      const parent = forms.find(candidate => (
        candidate.dexNumber === form.evolvesFromDexNumber
      ));
      return Boolean(parent && isFormUnlocked(pet, parent));
    }

    const previous = forms
      .filter(candidate => (candidate.unlockLevel || 1) < (form.unlockLevel || 1))
      .sort((first, second) => (second.unlockLevel || 1) - (first.unlockLevel || 1))[0];
    return !previous || isFormUnlocked(pet, previous);
  }

  function getEvolutionOffers(mon, pet) {
    return getForms(mon).filter(form => (
      (form.unlockLevel || 1) > 1
      && meetsEvolutionRequirement(pet, form)
      && isFormAssetReady(mon, form)
      && !pet.evolutionDecisions[form.id]
      && isEvolutionBranchCompatible(mon, pet, form)
      && isEvolutionParentUnlocked(mon, pet, form)
    ));
  }

  function announceEvolutionOffer(mon, pet, forms) {
    if (!forms?.length) {
      announcedEvolutionOfferKey = null;
      if (pendingSoundEffect === 'evolution') pendingSoundEffect = null;
      return;
    }

    const offerKey = `${mon.id}:${pet.journeyKey}:${forms.map(form => form.id).join(',')}`;
    if (announcedEvolutionOfferKey === offerKey) return;
    announcedEvolutionOfferKey = offerKey;
    void playSoundEffect('evolution', true);
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
    if (
      !meetsEvolutionRequirement(pet, form)
      || !isFormAssetReady(mon, form)
      || !isEvolutionParentUnlocked(mon, pet, form)
    ) return;

    if (choice === 'evolve') {
      if (!isEvolutionBranchCompatible(mon, pet, form)) {
        showToast('Este Pokémon já escolheu outra rota evolutiva.');
        return;
      }
      pet.evolutionDecisions[form.id] = choice;
      const previousName = pet.customName;
      applyAppearance(mon, pet, form);
      pet.lastAction = `${previousName} escolheu evoluir para ${form.name}.`;
      systemAddHistory(pet, '✨', pet.lastAction);
    } else {
      getEvolutionOffers(mon, pet).forEach(candidate => {
        pet.evolutionDecisions[candidate.id] = 'later';
      });
      pet.lastAction = `${pet.customName} decidiu evoluir mais tarde. As rotas disponíveis continuam na aba Pokémon.`;
      systemAddHistory(pet, '🌱', pet.lastAction);
    }
    saveState();
    render();
    showToast(choice === 'evolve'
      ? `${form.name} agora está em uso.`
      : 'As evoluções disponíveis ficaram guardadas na aba Pokémon.');
  }

  function rollTrainingReward(appState) {
    const roll = Math.random();
    if (roll < 0.12) {
      const foodId = randomCommonFoodId();
      addFoodToBag(appState, foodId, 1);
      return `Ganhou 1 ${FOOD_BY_ID[foodId].label}.`;
    }
    if (roll < 0.15) {
      addFoodToBag(appState, 'watermelon', 1);
      return 'Encontrou 1 Melancia.';
    }
    return 'O treino foi focado apenas em experiência.';
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
    pet.bond = clamp(pet.bond + 2);
    systemAddXp(pet, game.score);
    markPetCaredFor(pet);
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
    pet.sleepXpEarned = 0;
    pet.training = null;
    markPetCaredFor(pet);
    pet.lastAction = automatic
      ? `${pet.customName} começou a descansar porque ficou cansado.`
      : `${pet.customName} começou a descansar.`;
    systemAddHistory(pet, '💤', pet.lastAction);
  }

  function wakePet(pet) {
    if (!pet.sleeping) return;
    const earnedXp = Math.max(0, Number(pet.sleepXpEarned) || 0);
    pet.sleeping = false;
    pet.sleepStartedAt = null;
    pet.lastSleepTick = null;
    pet.sleepXpEarned = 0;
    markPetCaredFor(pet);
    pet.lastAction = pet.energy < 10
      ? `${pet.customName} levantou, mas ainda está cansado e precisa descansar.`
      : `${pet.customName} terminou o descanso e está pronto para brincar.${earnedXp > 0 ? ` +${earnedXp} XP.` : ''}`;
    systemAddHistory(pet, '☀️', pet.lastAction);
  }

  function processSleep(pet, timestamp = now()) {
    if (!pet.sleeping) return;
    const lastTick = pet.lastSleepTick || pet.sleepStartedAt || timestamp;
    const ticks = Math.floor((timestamp - lastTick) / RULES.sleepTickMs);
    if (ticks > 0) {
      pet.energy = clamp(pet.energy + ticks * RULES.sleepEnergyPerTick);
      window.SuperPokegochiBattle?.restoreHp(pet, Math.min(1, ticks * 0.05));
      const earnedXp = ticks * RULES.sleepXpPerTick;
      systemAddXp(pet, earnedXp);
      pet.sleepXpEarned = Math.max(0, Number(pet.sleepXpEarned) || 0) + earnedXp;
      pet.lastSleepTick = lastTick + ticks * RULES.sleepTickMs;
    }
    const hpRecovered = !battleNeedsHpRecovery(pet, battleSnapshot(pet));
    if (pet.energy >= RULES.wakeEnergy && hpRecovered) {
      const earnedXp = Math.max(0, Number(pet.sleepXpEarned) || 0);
      pet.energy = clamp(Math.max(pet.energy, RULES.wakeEnergy));
      pet.sleeping = false;
      pet.sleepStartedAt = null;
      pet.lastSleepTick = null;
      pet.sleepXpEarned = 0;
      pet.lastAction = `${pet.customName} terminou o descanso com energia renovada.${earnedXp > 0 ? ` +${earnedXp} XP.` : ''}`;
      systemAddHistory(pet, '☀️', pet.lastAction);
    }
  }

  function processTraining(pet, appState, timestamp = now()) {
    if (!pet.training || timestamp < pet.training.endsAt) return;
    const reward = rollTrainingReward(appState);
    pet.training = null;
    systemAddXp(pet, RULES.trainXp);
    pet.bond = clamp(pet.bond + 2);
    markPetCaredFor(pet, timestamp);
    pet.lastAction = `${pet.customName} terminou o treino. +${RULES.trainXp} XP. ${reward}`;
    systemAddHistory(pet, '🏅', pet.lastAction);
  }

  function isPetActive(pet, appState = state) {
    return Boolean(pet && appState && pet.journeyKey === appState.selected);
  }

  function shiftPetTimestamp(pet, key, pausedFor) {
    const value = Number(pet[key]);
    if (Number.isFinite(value)) pet[key] = value + pausedFor;
  }

  function pausePet(pet, timestamp = now()) {
    pet.inactiveSince = timestamp;
    pet.lastUpdate = timestamp;
  }

  function resumePet(pet, timestamp = now()) {
    const pausedAt = Number(pet.inactiveSince || pet.lastUpdate || timestamp);
    const pausedFor = Math.max(0, timestamp - pausedAt);
    const bondExpired = pausedFor > BOND_GRACE_PERIOD_MS;

    if (pausedFor > 0) {
      const pausedTimestamps = bondExpired
        ? ['lastCareAt', 'dirtCycleAt']
        : ['activeSince', 'lastCareAt', 'dirtCycleAt'];
      pausedTimestamps.forEach(key => {
        shiftPetTimestamp(pet, key, pausedFor);
      });

      if (pet.sleeping) {
        shiftPetTimestamp(pet, 'sleepStartedAt', pausedFor);
        shiftPetTimestamp(pet, 'lastSleepTick', pausedFor);
      }

      if (pet.training) {
        shiftPetTimestamp(pet.training, 'startedAt', pausedFor);
        shiftPetTimestamp(pet.training, 'endsAt', pausedFor);
      }
    }

    if (bondExpired) {
      pet.activeSince = timestamp;
      pet.appearancePalette = 'normal';
      pet.bond = BOND_RESET_VALUE;
      pet.lastAction = `O vínculo com ${pet.customName} recomeçou após mais de 1 dia longe.`;
      systemAddHistory(pet, '💚', pet.lastAction);
    }

    pet.inactiveSince = null;
    pet.lastUpdate = timestamp;
    return bondExpired;
  }

  function systemApplyOfflineDecay(pet, appState = state) {
    if (!isPetActive(pet, appState)) return;

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
    processDirt(pet, timestamp);
  }

  function syncAllPets(appState = state) {
    for (const pet of Object.values(appState.pets)) systemApplyOfflineDecay(pet, appState);
    processWorld(appState);
  }

  function busyMessage(pet) {
    if (pet.training) return `${pet.customName} está treinando agora.`;
    if (pet.sleeping) return `${pet.customName} está descansando.`;
    return null;
  }

  function needsRest(pet) {
    return !pet.sleeping && pet.energy < 5;
  }

  function feedPet(foodId) {
    const pet = getPet();
    const food = FOOD_BY_ID[foodId];
    systemApplyOfflineDecay(pet);
    const appearance = getAppearance(getDex(), pet);
    const combat = battleSnapshot(pet, appearance);
    const canRecoverHp = Boolean(combat && combat.currentHp < combat.maxHp);

    const busy = busyMessage(pet);
    if (busy) {
      showToast(busy);
      return;
    }
    if (!food || !state.bag || (state.bag[foodId] || 0) <= 0) {
      showToast('A mochila está sem essa comida.');
      return;
    }
    if (pet.hunger > 90 && food.energy < 20 && !canRecoverHp) {
      showToast(`${pet.customName} já está satisfeito.`);
      return;
    }

    state.bag[foodId] -= 1;
    pet.hunger = clamp(pet.hunger + food.hunger);
    pet.happiness = clamp(pet.happiness + food.happiness);
    pet.energy = clamp(pet.energy + food.energy);
    pet.bond = clamp(pet.bond + food.bond);
    const healedHp = window.SuperPokegochiBattle?.restoreHp(
      pet,
      Math.max(0, Number(food.hpPercent) || 0) / 100,
    ) || 0;
    systemAddXp(pet, food.xp);
    markPetCaredFor(pet);
    const rewards = [
      `+${food.xp} XP`,
      healedHp > 0 ? `+${healedHp} HP` : '',
      food.energy >= 20 ? `+${food.energy} energia` : '',
    ].filter(Boolean);
    pet.lastAction = `${pet.customName} comeu ${food.label}. ${rewards.join(' · ')}.`;
    systemAddHistory(pet, food.historyIcon, pet.lastAction);
    pet.lastUpdate = now();
    selectedAction = 'feed';
    void playSoundEffect('food');
    saveState();
    render();
    showToast(pet.lastAction);
    setTimeout(() => {
      if (selectedAction !== 'feed') return;
      selectedAction = null;
      render();
    }, 600);
  }

  function minigameFoodCatalog() {
    return FOOD_ITEMS.map(food => ({
      assetUrl: new URL(`${ITEM_BASE_PATH}${food.asset}`, document.baseURI).href,
      id: food.id,
      label: food.label,
    }));
  }

  function randomMinigameFoodId() {
    const roll = Math.random();
    if (roll < 0.01) return 'pineapple';
    if (roll < 0.1) return 'watermelon';
    return randomCommonFoodId();
  }

  function awardMinigameResult(result) {
    const timestamp = now();
    const pet = getPet();
    const gameLabel = GAME_LABELS[result?.gameId] || 'um minigame';
    const gameId = result?.gameId;
    const goal = MINIGAME_DAILY_GOALS[gameId];
    if (!result || !goal) {
      return {
        canPlayAgain: canStartAnyMinigame(pet),
        dailyGoals: minigameDailyGoals(pet),
        energy: pet.energy,
        earned: false,
        message: 'Não foi possível atualizar a missão diária.',
      };
    }

    const missions = petMinigames(pet);
    const mission = missions[gameId];
    pet.happiness = clamp(pet.happiness + (result.success ? RULES.play.happiness : 3));
    pet.bond = clamp(pet.bond + RULES.play.bond);
    markPetCaredFor(pet, timestamp);
    pet.lastUpdate = timestamp;

    if (!mission.completed) {
      if (gameId === 'catch') {
        mission.progress = Math.min(goal.target, mission.progress + Math.max(0, Math.round(Number(result.score) || 0)));
      } else if (gameId === 'memory' && result.success === true) {
        mission.progress = goal.target;
      }
      mission.completed = mission.progress >= goal.target;
    }

    if (!mission.completed) {
      const effortXp = result.success === true || Number(result.score) <= 0
        ? 0
        : Math.min(
            10 - mission.effortXp,
            Math.max(1, Math.min(5, Math.ceil(Number(result.score) / 5))),
          );
      if (effortXp > 0) {
        mission.effortXp += effortXp;
        systemAddXp(pet, effortXp);
      }
      const progressCopy = gameId === 'catch'
        ? `${mission.progress}/${goal.target} pontos na missão diária`
        : 'ainda falta vencer uma partida';
      const effortCopy = effortXp > 0 ? ` +${effortXp} XP pelo esforço.` : '';
      pet.lastAction = `${pet.customName} jogou ${gameLabel}; ${progressCopy}.${effortCopy}`;
      systemAddHistory(pet, '🎮', pet.lastAction);
      saveState();
      render();
      return {
        canPlayAgain: canStartAnyMinigame(pet),
        dailyGoals: minigameDailyGoals(pet),
        energy: pet.energy,
        earned: effortXp > 0,
        message: effortXp > 0 ? '' : `Progresso salvo: ${progressCopy}.`,
        xp: effortXp,
      };
    }

    if (mission.rewardClaimed) {
      pet.lastAction = `${pet.customName} jogou ${gameLabel} novamente e ficou mais feliz.`;
      systemAddHistory(pet, '🎮', pet.lastAction);
      saveState();
      render();
      return {
        canPlayAgain: canStartAnyMinigame(pet),
        dailyGoals: minigameDailyGoals(pet),
        energy: pet.energy,
        earned: false,
        message: 'Missão diária concluída. Esta partida aumentou a felicidade.',
      };
    }

    mission.rewardClaimed = true;
    const foodId = randomMinigameFoodId();
    const food = FOOD_BY_ID[foodId];
    addFoodToBag(state, foodId, 1);
    systemAddXp(pet, goal.xp);
    pet.lastAction = `${pet.customName} concluiu a missão de ${gameLabel}. +1 ${food.label} e +${goal.xp} XP.`;
    systemAddHistory(pet, '🎮', pet.lastAction);
    selectedAction = 'play';
    saveState();
    render();
    setTimeout(() => {
      if (selectedAction !== 'play') return;
      selectedAction = null;
      render();
    }, 600);

    return {
      canPlayAgain: canStartAnyMinigame(pet),
      dailyGoals: minigameDailyGoals(pet),
      energy: pet.energy,
      earned: true,
      food: {
        assetUrl: new URL(`${ITEM_BASE_PATH}${food.asset}`, document.baseURI).href,
        id: food.id,
        label: food.label,
      },
      xp: goal.xp,
    };
  }

  const GAME_LABELS = {
    catch: 'Chuva de Frutas',
    memory: 'Memória de Frutas',
  };

  function startMinigameAttempt({ gameId } = {}) {
    const pet = getPet();
    const gameLabel = GAME_LABELS[gameId] || 'um minigame';
    const energyCost = minigameEnergyCost(gameId);
    if (pet.energy < energyCost) {
      return {
        canPlayAgain: canStartAnyMinigame(pet),
        energy: pet.energy,
        started: false,
      };
    }
    const timestamp = now();
    pet.energy = clamp(pet.energy - energyCost);
    pet.hunger = clamp(pet.hunger - RULES.play.hungerCost);
    pet.lastUpdate = timestamp;
    markPetCaredFor(pet, timestamp);
    pet.lastAction = `${pet.customName} começou ${gameLabel}. -${energyCost} energia.`;
    systemAddHistory(pet, '🎮', pet.lastAction);
    saveState();
    return {
      canPlayAgain: canStartAnyMinigame(pet),
      energy: pet.energy,
      started: true,
    };
  }

  function openPlayMinigames(pet) {
    const minigames = window.SuperPokegochiMinigames;
    if (!minigames || typeof minigames.open !== 'function') {
      return 'Os minigames ainda não terminaram de carregar.';
    }

    statusOpen = false;
    companionsOpen = false;
    moreOpen = false;
    foodOpen = false;
    minigames.open({
      backIconUrl: new URL('assets/arrow-ios-back.svg', document.baseURI).href,
      companionName: pet.customName,
      energy: pet.energy,
      energyCosts: { ...RULES.play.energyCost },
      foods: minigameFoodCatalog(),
      onComplete: awardMinigameResult,
      onStart: startMinigameAttempt,
      onExit: () => {
        selectedAction = null;
        render();
      },
      dailyGoals: minigameDailyGoals(pet),
    });
    return false;
  }

  function openBattleTraining(pet) {
    const battle = window.SuperPokegochiBattle;
    if (!battle) return 'A batalha ainda está carregando. Tente novamente em instantes.';
    const species = getDex();
    const appearance = getAppearance(species, pet);
    statusOpen = false;
    moreOpen = false;
    foodOpen = false;
    battleMenuOpen = false;

    const opened = battle.open({
      pet,
      energyCost: BATTLE_ENERGY_COST,
      dexNumber: battleDexNumber(appearance),
      speciesName: appearance.name,
      visual: appearance,
      dexCatalog: DEX,
      soundEnabled: getMusicEnabled(),
      onStarted() {
        pet.energy = clamp(pet.energy - BATTLE_ENERGY_COST);
        pet.hunger = clamp(pet.hunger - BATTLE_HUNGER_COST);
        markPetCaredFor(pet);
        pet.lastUpdate = now();
        saveState();
      },
      onProgress({ currentHp }) {
        if (!pet.battle || typeof pet.battle !== 'object') pet.battle = {};
        pet.battle.currentHp = Math.max(0, Math.round(Number(currentHp) || 0));
        saveState();
      },
      onComplete(result) {
        if (!pet.battle || typeof pet.battle !== 'object') pet.battle = {};
        pet.battle.currentHp = Math.max(1, Math.round(Number(result.currentHp) || 1));
        pet.battle.battleHistory = [
          {
            at: now(),
            enemyLevel: result.enemyLevel,
            enemyName: result.enemyName,
            outcome: result.outcome,
            xp: result.xp,
          },
          ...(Array.isArray(pet.battle.battleHistory) ? pet.battle.battleHistory : []),
        ].slice(0, 12);

        if (result.outcome === 'victory') {
          pet.happiness = clamp(pet.happiness + 4);
          pet.bond = clamp(pet.bond + 2);
          pet.lastAction = `${pet.customName} venceu ${result.enemyName}. +${result.xp} XP.`;
        } else if (result.outcome === 'defeat') {
          pet.happiness = clamp(pet.happiness - 2);
          pet.bond = clamp(pet.bond + 1);
          pet.lastAction = `${pet.customName} perdeu para ${result.enemyName} e precisa descansar. +${result.xp} XP.`;
        } else {
          pet.lastAction = `${pet.customName} saiu da batalha contra ${result.enemyName}.`;
        }
        systemAddXp(pet, result.xp);
        markPetCaredFor(pet);
        pet.lastUpdate = now();
        systemAddHistory(pet, '⚔️', pet.lastAction);
        saveState();
      },
      onExit() {
        selectedAction = null;
        render();
      },
    });

    return opened ? false : 'Não foi possível abrir a batalha agora.';
  }

  function openSocialBattle() {
    const social = state.social || systemDefaultSocial();
    if (social.verificationRequired) {
      verificationGateOpen = true;
      render();
      return;
    }
    if (!social.canInteract || !social.viewerCompanion) {
      showToast('Escolha um Pokémon Companheiro para batalhar durante visitas.');
      return;
    }
    const battle = window.SuperPokegochiBattle;
    if (!battle) {
      showToast('A batalha ainda está carregando. Tente novamente em instantes.');
      return;
    }

    const viewerSpecies = getDex(social.viewerCompanion.dexId);
    const visitorPet = migratePet(
      structuredClone(social.viewerCompanion.pet),
      viewerSpecies.id,
    );
    visitorPet.activeAppearance = social.viewerCompanion.appearanceId;
    const visitorAppearance = getAppearance(viewerSpecies, visitorPet);
    const ownerSpecies = getDex();
    const ownerPet = getPet();
    const ownerAppearance = getAppearance(ownerSpecies, ownerPet);
    const ownerCombat = battleSnapshot(ownerPet, ownerAppearance);

    statusOpen = false;
    moreOpen = false;
    foodOpen = false;

    const opened = battle.open({
      pet: visitorPet,
      energyCost: BATTLE_ENERGY_COST,
      dexNumber: battleDexNumber(visitorAppearance),
      speciesName: visitorAppearance.name,
      visual: visitorAppearance,
      dexCatalog: DEX,
      soundEnabled: getMusicEnabled(),
      opponent: {
        currentHp: ownerCombat?.currentHp,
        dexNumber: battleDexNumber(ownerAppearance),
        level: ownerPet.level,
        visual: ownerAppearance,
      },
      onStarted() {
        visitorPet.energy = clamp(visitorPet.energy - BATTLE_ENERGY_COST);
        visitorPet.hunger = clamp(visitorPet.hunger - BATTLE_HUNGER_COST);
        visitorPet.lastUpdate = now();
      },
      onProgress({ currentHp }) {
        if (!visitorPet.battle || typeof visitorPet.battle !== 'object') visitorPet.battle = {};
        visitorPet.battle.currentHp = Math.max(0, Math.round(Number(currentHp) || 0));
      },
      onComplete(result) {
        const timestamp = now();
        if (!visitorPet.battle || typeof visitorPet.battle !== 'object') visitorPet.battle = {};
        if (!ownerPet.battle || typeof ownerPet.battle !== 'object') ownerPet.battle = {};
        visitorPet.battle.currentHp = Math.max(1, Math.round(Number(result.currentHp) || 1));
        visitorPet.battle.lastMaxHp = Math.max(1, Math.round(Number(result.maxHp) || visitorPet.battle.lastMaxHp || 1));
        ownerPet.battle.currentHp = Math.max(1, Math.round(Number(result.enemyCurrentHp) || 1));
        ownerPet.battle.lastMaxHp = Math.max(1, Math.round(Number(result.enemyMaxHp) || ownerPet.battle.lastMaxHp || 1));

        if (result.outcome === 'victory') {
          visitorPet.happiness = clamp(visitorPet.happiness + 4);
          visitorPet.bond = clamp(visitorPet.bond + 2);
        } else if (result.outcome === 'defeat') {
          visitorPet.happiness = clamp(visitorPet.happiness - 2);
          visitorPet.bond = clamp(visitorPet.bond + 1);
        }
        systemAddXp(visitorPet, result.xp);
        visitorPet.lastUpdate = timestamp;
        visitorPet.lastAction = result.outcome === 'victory'
          ? `${visitorPet.customName} venceu uma batalha de visita. +${result.xp} XP.`
          : result.outcome === 'defeat'
            ? `${visitorPet.customName} perdeu uma batalha de visita. +${result.xp} XP.`
            : `${visitorPet.customName} saiu de uma batalha de visita.`;
        systemAddHistory(visitorPet, '⚔️', visitorPet.lastAction);
        social.viewerCompanion.pet = structuredClone(visitorPet);
        socialBattleSaving = true;
        notifySite('social-battle-result', {
          actorCurrentHp: visitorPet.battle.currentHp,
          actorEnergy: visitorPet.energy,
          actorHunger: visitorPet.hunger,
          actorJourneyKey: visitorPet.journeyKey,
          actorLevel: visitorPet.level,
          actorMaxHp: visitorPet.battle.lastMaxHp,
          actorPet: structuredClone(visitorPet),
          actorPokemonDex: battleDexNumber(visitorAppearance),
          outcome: result.outcome,
          ownerCurrentHp: ownerPet.battle.currentHp,
          ownerJourneyKey: ownerPet.journeyKey,
          ownerLevel: ownerPet.level,
          ownerMaxHp: ownerPet.battle.lastMaxHp,
          ownerPokemonDex: battleDexNumber(ownerAppearance),
          xp: result.xp,
        });
      },
      onExit() {
        selectedAction = null;
        render();
      },
    });

    if (!opened) {
      showToast('Não foi possível abrir a batalha agora.');
    }
  }

  function battleTrainingBlocker(pet) {
    const busy = busyMessage(pet);
    if (busy) return busy;
    if (pet.energy < BATTLE_ENERGY_COST) {
      return `Seu companheiro precisa de pelo menos ${BATTLE_ENERGY_COST} de energia para batalhar.`;
    }
    if (pet.hunger <= 10) return 'Seu companheiro precisa comer antes de batalhar.';
    const battle = battleSnapshot(pet);
    if (battle && battle.currentHp <= battle.maxHp * 0.2) {
      return 'Seu companheiro precisa recuperar mais de 20% do HP antes de batalhar.';
    }
    return '';
  }

  function openBattleMenu() {
    statusOpen = false;
    companionsOpen = false;
    moreOpen = false;
    foodOpen = false;
    battleMenuOpen = true;
    battleMenuTab = 'train';
    battleHistoryVisibleCount = 5;
    return false;
  }

  function battleHistoryResult(outcome) {
    if (outcome === 'victory') return { label: 'Vitória', className: 'victory' };
    if (outcome === 'defeat') return { label: 'Derrota', className: 'defeat' };
    return { label: 'Fuga', className: 'fled' };
  }

  function renderBattleTrainingMenu(pet, appearance, combat) {
    if (!battleMenuOpen) return '';
    const history = Array.isArray(pet.battle?.battleHistory) ? pet.battle.battleHistory : [];
    const visibleHistory = history.slice(0, battleHistoryVisibleCount);
    const hasMoreHistory = history.length > visibleHistory.length;
    const blocker = battleTrainingBlocker(pet);
    const hpPercent = combat ? Math.max(0, Math.min(100, (combat.currentHp / combat.maxHp) * 100)) : 100;
    const historyMarkup = visibleHistory.length
      ? `<div class="battle-menu-history-list">${visibleHistory.map(item => {
        const result = battleHistoryResult(item.outcome);
        return `
          <article class="battle-menu-history-row">
            <span class="battle-history-result ${result.className}">${result.label}</span>
            <div>
              <b>${escapeHtml(item.enemyName || 'Pokémon selvagem')}</b>
              <small>Nv. ${Math.max(1, Math.round(Number(item.enemyLevel) || 1))} · ${formatBattleDate(item.at)}</small>
            </div>
            <strong>+${Math.max(0, Math.round(Number(item.xp) || 0))} XP</strong>
          </article>`;
      }).join('')}</div>
        ${hasMoreHistory
          ? `<button class="battle-history-more" type="button" data-battle-history-more>Carregar mais</button>`
          : '<p class="battle-history-end">Fim do histórico de batalhas</p>'}`
      : `<div class="battle-history-empty">
          <b>Nenhuma batalha ainda</b>
          <p>Depois do primeiro treino, o resultado aparecerá aqui.</p>
        </div>`;

    return `
      <div class="battle-menu-overlay" role="dialog" aria-modal="true" aria-labelledby="battle-menu-title">
        <section class="battle-menu-panel">
          <header class="battle-menu-header">
            <div>
              <small>Centro de treinamento</small>
              <h2 id="battle-menu-title">Treino de batalha</h2>
            </div>
            <button type="button" data-battle-menu-close aria-label="Fechar centro de treinamento">×</button>
          </header>

          <div class="battle-menu-tabs" role="tablist" aria-label="Opções do treino">
            <button type="button" role="tab" data-battle-menu-tab="train" aria-selected="${battleMenuTab === 'train'}" class="${battleMenuTab === 'train' ? 'active' : ''}">Treinar</button>
            <button type="button" role="tab" data-battle-menu-tab="history" aria-selected="${battleMenuTab === 'history'}" class="${battleMenuTab === 'history' ? 'active' : ''}">
              Histórico <span>${history.length}</span>
            </button>
          </div>

          ${battleMenuTab === 'train'
            ? `<div class="battle-menu-content" role="tabpanel">
                <div class="battle-menu-companion">
                  <span class="battle-menu-avatar">${renderPokemonVisual(appearance, 'battle-menu-sprite', appearance.name)}</span>
                  <div>
                    <b>${escapeHtml(pet.customName)}</b>
                    <small>Nível ${pet.level} · adversário compatível</small>
                  </div>
                </div>
                <div class="battle-menu-vitals" aria-label="Condição para o treino">
                  <span><small>HP</small><b>${combat ? `${combat.currentHp}/${combat.maxHp}` : '—'}</b><i><em style="width:${hpPercent}%"></em></i></span>
                  <span><small>Energia</small><b>${Math.round(pet.energy)}</b></span>
                  <span><small>Fome</small><b>${Math.round(pet.hunger)}</b></span>
                </div>
                <p class="battle-menu-description">Enfrente um Pokémon de poder compatível. Entrar na batalha consome ${BATTLE_ENERGY_COST} de energia e ${BATTLE_HUNGER_COST} de fome.</p>
                <button class="battle-menu-start" type="button" data-battle-start ${blocker ? 'disabled' : ''}>
                  <img src="${ITEM_BASE_PATH}action-train.png" alt="">
                  <b>Treinar</b>
                </button>
                ${blocker
                  ? `<p class="battle-menu-blocker" role="status">${escapeHtml(blocker)}</p>`
                  : '<p class="battle-menu-ready">Seu companheiro está pronto para batalhar.</p>'}
              </div>`
            : `<div class="battle-menu-content battle-menu-history" role="tabpanel">
                ${historyMarkup}
              </div>`}
        </section>
      </div>`;
  }

  const SYSTEM_ACTIONS = {
    play: {
      label: 'Brincar',
      short: 'Brincar',
      asset: 'action-play.png',
      run(pet) {
        const busy = busyMessage(pet);
        if (busy) return busy;
        if (!canStartAnyMinigame(pet)) return 'Seu companheiro precisa de pelo menos 6 de energia para brincar.';
        return openPlayMinigames(pet);
      },
    },
    sleep: {
      label: 'Descansar',
      short: 'Descansar',
      asset: 'action-rest.png',
      run(pet) {
        if (pet.training) return `${pet.customName} está treinando agora.`;
        if (pet.sleeping) {
          wakePet(pet);
          return null;
        }
        const needsHpRecovery = battleNeedsHpRecovery(pet, battleSnapshot(pet));
        if (pet.energy < 70 || needsHpRecovery) {
          startSleep(pet, false);
          return null;
        }

        const refusalChance = pet.energy > 88 ? 0.85 : 0.35;
        if (Math.random() < refusalChance) return `${pet.customName} não precisa descansar agora.`;
        startSleep(pet, false);
        return null;
      },
    },
    train: {
      label: 'Treinar',
      short: 'Treino',
      asset: 'action-train.png',
      run() {
        return openBattleMenu();
      },
    },
  };

  function systemDoAction(key) {
    const pet = getPet();
    systemApplyOfflineDecay(pet);
    selectedAction = key === 'sleep' && pet.sleeping ? 'wake' : key;
    const message = SYSTEM_ACTIONS[key].run(pet);
    pet.lastUpdate = now();
    const shouldAnimate = (
      !trainingGame
      && !window.SuperPokegochiMinigames?.isOpen()
      && !window.SuperPokegochiBattle?.isOpen()
      && !battleMenuOpen
    );
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
    if (pet.sleeping) {
      const recoveringEnergy = pet.energy < RULES.wakeEnergy;
      const recoveringHp = battleNeedsHpRecovery(pet);
      const note = recoveringEnergy && recoveringHp
        ? 'está recuperando energia e HP.'
        : recoveringHp
          ? 'está recuperando HP.'
          : 'está recuperando energia.';
      return { label: 'Descansando', icon: '💤', className: 'sleepy', note };
    }
    if (
      pet.battle
      && Number(pet.battle.lastMaxHp) > 0
      && Number(pet.battle.currentHp) <= Number(pet.battle.lastMaxHp) * 0.2
    ) {
      return { label: 'Machucado', icon: '❤️', className: 'danger', note: 'precisa descansar para recuperar HP.' };
    }
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
        <div class="stat-label"><span class="status-pixel-icon"><img src="${ITEM_BASE_PATH}${icon}" alt=""></span>${name}</div>
        <div class="stat-track"><i style="width:${safe}%"></i></div>
        <strong>${safe}</strong>
      </div>`;
  }

  function systemBondDays(pet) {
    const days = activeDaysFor(pet);
    return `
      <div class="stat-row bond-days-row">
        <div class="stat-label"><span class="status-pixel-icon"><img src="${ITEM_BASE_PATH}status-bond.png" alt=""></span>Vínculo</div>
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
        `animation-timing-function:steps(${Math.max(1, Math.round(mon.sprite.frames))})`,
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
    const scaleFor = target => Math.max(1, Math.min(5, Math.round(target / maxFrame)));
    const dimensionsFor = (suffix, scale) => [
      `--stage-render-width${suffix}:${mon.sprite.frameWidth * scale}px`,
      `--stage-render-height${suffix}:${mon.sprite.frameHeight * scale}px`,
      `--stage-render-sheet-width${suffix}:${mon.sprite.sheetWidth * scale}px`,
      `--stage-render-sheet-shift${suffix}:-${mon.sprite.sheetWidth * scale}px`,
    ].join(';');
    const desktopScale = scaleFor(207);
    const compactScale = scaleFor(198);
    const smallScale = scaleFor(180);
    const shortScale = scaleFor(184);
    return `style="${dimensionsFor('', desktopScale)};${dimensionsFor('-compact', compactScale)};${dimensionsFor('-small', smallScale)};${dimensionsFor('-short', shortScale)}"`;
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
                <span class="food-pixel-icon"><img src="${ITEM_BASE_PATH}${food.asset}" alt=""></span>
                <span class="food-name-row">
                  <b>${food.label}</b>
                  <em class="food-tier ${food.rarity}">${FOOD_RARITY_LABELS[food.rarity]}</em>
                </span>
                <small>+${food.hpPercent}% HP · +${food.hunger} fome</small>
                <small>${food.energy >= 20 ? `+${food.energy} energia · ` : ''}+${food.xp} XP · x${count}</small>
              </button>`;
          }).join('')}
        </div>
        ${pet.hunger > 90 ? `<p class="tray-note">${pet.customName} já está satisfeito, mas ainda pode comer para recuperar HP ou usar o Abacaxi Energia.</p>` : ''}
      </div>`;
  }

  function battleHpRow(snapshot) {
    if (!snapshot) return '';
    const percent = Math.max(0, Math.min(100, snapshot.currentHp / Math.max(1, snapshot.maxHp) * 100));
    const tone = percent <= 20 ? 'danger' : percent <= 45 ? 'warning' : '';
    return `
      <div class="stat-row hp-status-row">
        <div class="stat-label"><span class="combat-stat-icon" aria-hidden="true">♥</span>HP</div>
        <div class="stat-track hp-status-track ${tone}"><i style="width:${percent}%"></i></div>
        <strong>${snapshot.currentHp}/${snapshot.maxHp}</strong>
      </div>`;
  }

  function battleStatSummary(snapshot) {
    if (!snapshot) return '';
    return `
      <div class="combat-summary" aria-label="Atributos de batalha">
        <span><small>ATQ</small><b>${Math.max(snapshot.stats.attack, snapshot.stats.specialAttack)}</b></span>
        <span><small>DEF</small><b>${Math.max(snapshot.stats.defense, snapshot.stats.specialDefense)}</b></span>
        <span><small>VEL</small><b>${snapshot.stats.speed}</b></span>
      </div>`;
  }

  function battleDisplayName(value) {
    return String(value || '')
      .split('-')
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  function renderMoveLoadout(pet, appearance, snapshot) {
    const battle = window.SuperPokegochiBattle;
    if (!battle?.getLearnedMoves || !battle?.getMoveCatalog || !snapshot.dataReady) {
      return `
        <section class="move-loadout" aria-label="Golpes equipados">
          <div class="move-loadout-head">
            <span><b>Golpes equipados</b><small>Carregando golpes aprendidos...</small></span>
            <button type="button" disabled>Trocar habilidades</button>
          </div>
        </section>`;
    }

    const dexNumber = battleDexNumber(appearance);
    const moveCatalog = battle.getMoveCatalog(pet, dexNumber, appearance.name);
    const learnedMoves = moveCatalog.filter(move => move.learned);
    const learnedById = new Map(learnedMoves.map(move => [move.id, move]));
    const equippedIds = snapshot.equippedMoves
      .filter(moveId => learnedById.has(moveId))
      .filter((moveId, index, moveIds) => moveIds.indexOf(moveId) === index)
      .slice(0, 4);
    const fallbackIds = learnedMoves.slice(-Math.min(4, learnedMoves.length)).map(move => move.id);
    const visibleEquippedIds = equippedIds.length ? equippedIds : fallbackIds;
    const requiredCount = Math.min(4, learnedMoves.length);

    if (!moveEditorOpen) {
      return `
        <section class="move-loadout" aria-label="Golpes equipados">
          <div class="move-loadout-head">
            <span><b>Golpes equipados</b><small>Use até quatro golpes aprendidos</small></span>
            <button type="button" data-open-move-editor>Trocar habilidades</button>
          </div>
          <div class="equipped-move-list">
            ${visibleEquippedIds.map(moveId => `
              <span>
                <b>${escapeHtml(learnedById.get(moveId)?.name || battleDisplayName(moveId))}</b>
                <small>Equipada</small>
              </span>
            `).join('')}
          </div>
        </section>`;
    }

    const selectedIds = moveSelectionDraft.filter(moveId => learnedById.has(moveId)).slice(0, 4);
    return `
      <section class="move-loadout editing" aria-label="Trocar habilidades">
        <div class="move-loadout-head">
          <span>
            <b>Escolha os golpes</b>
            <small>${selectedIds.length}/${requiredCount} selecionados · apenas golpes já aprendidos</small>
          </span>
        </div>
        <div class="move-editor-section-title">
          <b>Habilidades disponíveis</b>
          <small>As futuras aparecem em cinza</small>
        </div>
        <div class="learned-move-list">
          ${moveCatalog.map(move => {
            const selected = selectedIds.includes(move.id);
            const category = move.category === 'special'
              ? 'Especial'
              : move.category === 'status'
                ? 'Status'
                : 'Físico';
            const type = battle.typeLabel(move.type) || battleDisplayName(move.type);
            return `
              <button
                class="${selected ? 'selected' : ''} ${move.learned ? '' : 'future'}"
                type="button"
                ${move.learned ? `data-toggle-learned-move="${escapeHtml(move.id)}"` : 'disabled'}
                aria-pressed="${selected}"
              >
                <span>
                  <b>${escapeHtml(move.name)}</b>
                  <small>${move.learned ? `Aprendida no Nv. ${move.level}` : `Aprende no Nv. ${move.level}`}</small>
                </span>
                <em>${escapeHtml(type)} · ${category}</em>
                <small>Poder ${move.power || '—'} · Precisão ${move.accuracy || '—'}</small>
              </button>`;
          }).join('')}
        </div>
        <div class="move-editor-actions">
          <button type="button" data-cancel-move-editor>Cancelar</button>
          <button
            class="primary"
            type="button"
            data-save-move-selection
            ${selectedIds.length !== requiredCount ? 'disabled' : ''}
          >Salvar habilidades</button>
        </div>
      </section>`;
  }

  function renderSkillsPanel(pet, appearance, snapshot) {
    if (!snapshot) {
      return '<p class="skills-empty">Os atributos de batalha ainda estão carregando.</p>';
    }
    const battle = window.SuperPokegochiBattle;
    const keys = battle?.attributeKeys || ['attack', 'defense', 'speed', 'vitality'];
    const labels = battle?.attributeLabels || {
      attack: 'Ataque',
      defense: 'Defesa',
      speed: 'Velocidade',
      vitality: 'Vitalidade',
    };
    const typeText = snapshot.types.map(type => battle?.typeLabel(type) || battleDisplayName(type)).join(' / ');
    const abilityText = snapshot.abilities.length
      ? snapshot.abilities.map(ability => battleDisplayName(ability.name)).join(', ')
      : 'Será carregada na primeira conexão';
    const spentAttributePoints = Object.values(snapshot.attributes)
      .reduce((total, value) => total + Number(value || 0), 0);

    return `
      <div class="skills-panel">
        <div class="skills-points">
          <span><small>Pontos disponíveis</small><b>${snapshot.availablePoints}</b></span>
          <p>Você ganha <strong>1 ponto</strong> sempre que sobe de nível.</p>
        </div>
        ${renderMoveLoadout(pet, appearance, snapshot)}
        <div class="attribute-list">
          ${keys.map(key => `
            <div class="attribute-row">
              <span>
                <b>${labels[key] || battleDisplayName(key)}</b>
                <small>${key === 'vitality' ? '+5 HP máximo' : '+2 no atributo'}</small>
              </span>
              <strong>${snapshot.attributes[key] || 0}</strong>
              <button
                type="button"
                data-allocate-attribute="${key}"
                aria-label="Adicionar um ponto em ${labels[key] || key}"
                ${snapshot.availablePoints <= 0 ? 'disabled' : ''}
              >+</button>
            </div>`).join('')}
        </div>
        <div class="attribute-reset">
          ${attributeResetOpen ? `
            <div class="attribute-reset-confirm" role="alert">
              <b>Resetar ${spentAttributePoints} pontos?</b>
              <small>${embeddedInSite
                ? 'O custo é de 20 BPoints. Nível, XP e golpes não mudam.'
                : 'No modo independente o reset é gratuito. Nível, XP e golpes não mudam.'}</small>
              <span>
                <button type="button" data-cancel-attribute-reset ${attributeResetPending ? 'disabled' : ''}>Cancelar</button>
                <button class="danger" type="button" data-confirm-attribute-reset ${attributeResetPending ? 'disabled' : ''}>
                  ${attributeResetPending
                    ? 'Processando...'
                    : embeddedInSite
                      ? 'Confirmar por 20 BPoints'
                      : 'Confirmar reset'}
                </button>
              </span>
            </div>
          ` : `
            <button type="button" data-open-attribute-reset ${spentAttributePoints <= 0 ? 'disabled' : ''}>
              ${embeddedInSite ? 'Resetar atributos — 20 BPoints' : 'Resetar atributos'}
            </button>
          `}
        </div>
        <div class="derived-stats">
          <div class="derived-title"><b>Status calculados</b><small>${typeText}</small></div>
          <dl>
            <div><dt>HP</dt><dd>${snapshot.maxHp}</dd></div>
            <div><dt>Ataque</dt><dd>${snapshot.stats.attack}</dd></div>
            <div><dt>Atq. Esp.</dt><dd>${snapshot.stats.specialAttack}</dd></div>
            <div><dt>Defesa</dt><dd>${snapshot.stats.defense}</dd></div>
            <div><dt>Def. Esp.</dt><dd>${snapshot.stats.specialDefense}</dd></div>
            <div><dt>Velocidade</dt><dd>${snapshot.stats.speed}</dd></div>
          </dl>
        </div>
        <p class="battle-data-note">
          <span>${snapshot.dataReady ? '✓' : '↻'}</span>
          ${snapshot.dataReady && snapshot.dataSource === 'official'
            ? `Dados oficiais carregados · Habilidades naturais: ${escapeHtml(abilityText)}`
            : snapshot.dataReady
              ? `Modo offline ativo · ${escapeHtml(appearance.name)} usa valores equilibrados de reserva.`
              : `Usando valores equilibrados enquanto os dados de ${escapeHtml(appearance.name)} carregam.`}
        </p>
      </div>`;
  }

  function worldItemX(item, yPercent) {
    const rawX = clamp(Number(item.x) || 50, 9, 91);
    const hash = String(item.id || '').split('').reduce((total, character) => total + character.charCodeAt(0), 0);

    if (yPercent >= 72 && (rawX < 28 || rawX > 72)) {
      return 36 + (hash % 29);
    }

    if (yPercent >= 25 && yPercent < 72 && rawX >= 28 && rawX <= 72) {
      return hash % 2 === 0 ? 16 + (hash % 11) : 74 + (hash % 11);
    }

    return rawX;
  }

  function renderWorldLayer(timestamp = now()) {
    const world = state.world || systemDefaultWorld();
    const visitorMode = isSocialVisitorMode();
    const estimatedCampHeight = clamp(
      window.innerHeight - (window.innerWidth <= 420 ? 262 : 284),
      330,
      612,
    );
    const leaves = visitorMode ? '' : world.leaves.map(item => {
      const fallDuration = Math.max(1, Number(item.fallDuration) || 7000);
      const elapsed = Math.max(0, Math.min(fallDuration, timestamp - Number(item.spawnedAt || timestamp)));
      const falling = timestamp < Number(item.settledAt);
      const storedY = Number(item.y);
      const legacyBottom = Number(item.bottom);
      const itemY = Number.isFinite(storedY)
        ? clamp(storedY, 8, 84)
        : clamp(((Number.isFinite(legacyBottom) ? legacyBottom : 30) / estimatedCampHeight) * 100, 8, 84);
      const itemX = worldItemX(item, itemY);
      const fallDistance = Math.round(estimatedCampHeight * (1 - itemY / 100) + 58);
      return `
        <button
          class="world-item world-leaf ${falling ? 'falling' : 'settled'}"
          type="button"
          data-collect-leaf="${item.id}"
          aria-label="Coletar folha e ganhar XP"
          style="--item-x:${itemX}%;--item-bottom:${itemY}%;--fall-start:-${fallDistance}px;--leaf-rotation:${Number(item.rotation) || 0}deg;--fall-duration:${fallDuration}ms;--fall-delay:-${elapsed}ms"
        >
          <img src="${ITEM_BASE_PATH}leaf-${item.variant === 2 ? 2 : 1}.png" alt="">
        </button>`;
    }).join('');
    const foodDrops = visitorMode ? '' : world.foodDrops.map(item => {
      const food = FOOD_BY_ID[item.foodId];
      if (!food) return '';
      const storedY = Number(item.y);
      const legacyBottom = Number(item.bottom);
      const itemY = Number.isFinite(storedY)
        ? clamp(storedY, 10, 82)
        : clamp(((Number.isFinite(legacyBottom) ? legacyBottom : 36) / estimatedCampHeight) * 100, 10, 82);
      const itemX = worldItemX(item, itemY);
      return `
        <button
          class="world-item world-food"
          type="button"
          data-collect-food="${item.id}"
          aria-label="Guardar ${food.label} na mochila"
          style="--item-x:${itemX}%;--item-bottom:${itemY}%"
        >
          <img src="${ITEM_BASE_PATH}${food.asset}" alt="">
        </button>`;
    }).join('');

    const socialGifts = !visitorMode && Array.isArray(state.social?.gifts)
      ? state.social.gifts.map(gift => {
        const food = FOOD_BY_ID[gift.foodId];
        if (!food) return '';
        const itemY = clamp(Number(gift.y) || 24, 12, 78);
        const itemX = worldItemX(gift, itemY);
        return `
          <button
            class="world-item world-food social-gift"
            type="button"
            data-collect-gift="${gift.id}"
            aria-label="Recolher ${food.label}, presente de ${escapeHtml(gift.fromName)}"
            style="--item-x:${itemX}%;--item-bottom:${itemY}%"
          >
            <img class="social-gift-icon" src="${ITEM_BASE_PATH}social-gift.webp" alt="">
          </button>`;
      }).join('')
      : '';

    return `<div class="world-layer" role="group" aria-label="Itens no gramado">${leaves}${foodDrops}${socialGifts}</div>`;
  }

  function renderDirtLayer(pet) {
    const dirtLevel = clamp(Math.round(Number(pet.dirtLevel) || 0), 0, 3);
    if (dirtLevel <= 0) return '';
    return `
      <div class="dirt-layer" aria-label="Sujeira acumulada">
        ${[
          { x: 19, y: 24, rotation: -7 },
          { x: 78, y: 62, rotation: 8 },
          { x: 67, y: 18, rotation: -2 },
        ].slice(0, dirtLevel).map((position, index) => `
          <button type="button" data-clean-dirt aria-label="Limpar a sujeira do gramado" style="--dirt-x:${position.x}%;--dirt-y:${position.y}%;--dirt-rotation:${position.rotation}deg">
            <img src="${ITEM_BASE_PATH}dirt-${index + 1}.png" alt="">
          </button>`).join('')}
      </div>`;
  }

  function renderAppearancePanel(mon, pet) {
    const forms = getForms(mon).filter(form => (
      isFormUnlocked(pet, form)
      || isEvolutionBranchCompatible(mon, pet, form)
    ));
    const days = activeDaysFor(pet);
    const shinyUnlocked = isShinyUnlocked(pet);
    const palette = pet.appearancePalette === 'shiny' && shinyUnlocked ? 'shiny' : 'normal';
    const currentForm = getForm(mon, pet.activeAppearance);
    const currentShinyReady = isFormAssetReady(mon, currentForm, 'shiny');
    const notificationsEnabled = getPokegochiNotificationPreference();
    const visitorMode = isSocialVisitorMode();
    return `
      <div class="appearance-panel">
        ${visitorMode ? '' : `<button class="change-companion" type="button" data-companions-toggle aria-label="Alterar Pokémon companheiro">
          <span class="change-companion-icon" aria-hidden="true"><i></i></span>
          <span class="change-companion-copy">
            <b>Alterar Pokémon companheiro</b>
            <small>${embeddedInSite ? 'Troque entre os 5 do Time ou pesquise outro' : 'Troque entre seus 6 cuidados ou pesquise outro'}</small>
          </span>
          <span class="change-companion-arrow" aria-hidden="true">›</span>
        </button>`}
        <div class="palette-block">
          <div class="palette-heading">
            <small>${shinyUnlocked ? 'Shiny liberado' : `${Math.min(days, SHINY_UNLOCK_DAYS)}/${SHINY_UNLOCK_DAYS} dias de vínculo`}</small>
          </div>
          <div class="palette-segment" role="group" aria-label="Versão do Pokémon">
            <button type="button" data-palette="normal" class="${palette === 'normal' ? 'active' : ''}"
              aria-pressed="${palette === 'normal'}" ${visitorMode ? 'disabled' : ''}>
              <span class="palette-dot normal"></span><b>Normal</b>
            </button>
            <button type="button" data-palette="shiny" class="${palette === 'shiny' ? 'active' : ''}"
              aria-pressed="${palette === 'shiny'}" ${(!shinyUnlocked || !currentShinyReady || visitorMode) ? 'disabled' : ''}>
              <span class="palette-dot shiny"></span><b>Shiny</b>
              ${!shinyUnlocked ? '<i aria-hidden="true">30</i>' : ''}
            </button>
          </div>
        </div>
        ${embeddedInSite && !visitorMode ? `<div class="pokegochi-notification-block">
          <span>
            <b>Lembretes de cuidado</b>
            <small>Receba um aviso quando seu companheiro precisar de atenção.</small>
          </span>
          <button
            aria-pressed="${notificationsEnabled}"
            class="${notificationsEnabled ? 'active' : ''}"
            data-pokegochi-notification-toggle
            type="button"
          >
            <i aria-hidden="true"></i>
            <b>${notificationsEnabled ? 'Ativado' : 'Desativado'}</b>
          </button>
        </div>` : ''}
        <p class="appearance-note">${visitorMode
          ? `Você está vendo o companheiro de ${state.social.ownerName}.`
          : 'O nível e os cuidados são compartilhados entre todas as formas do Pokémon.'}</p>
        <div class="appearance-list">
          ${forms.map(form => {
            const unlocked = isFormUnlocked(pet, form);
            const assetReady = isFormAssetReady(mon, form, palette);
            const selected = pet.activeAppearance === form.id;
            const canEvolveLater = (
              !unlocked
              && pet.evolutionDecisions[form.id] === 'later'
              && meetsEvolutionRequirement(pet, form)
              && isEvolutionBranchCompatible(mon, pet, form)
            );
            const visual = formVisual(form, palette);
            const appearance = { ...mon, ...form, ...visual, id: form.id, name: form.name, palette };
            let stateLabel = 'Disponível';
            let ariaLabel = `Usar aparência ${form.name}`;
            if (selected) stateLabel = 'Em uso';
            else if (!unlocked) {
              const requirementReady = (
                meetsEvolutionRequirement(pet, form)
                && isEvolutionParentUnlocked(mon, pet, form)
              );
              stateLabel = canEvolveLater
                ? 'Evoluir agora'
                : requirementReady
                  ? 'Evolua para liberar'
                  : 'Bloqueado';
              ariaLabel = requirementReady
                ? `${form.name} pronto para evoluir`
                : `${form.name} bloqueado até o nível ${form.unlockLevel}`;
            }
            else if (!assetReady) stateLabel = 'Sprite pendente';
            if (selected) ariaLabel = `${form.name} em uso`;

            return `
              <button class="appearance-option ${selected ? 'selected' : ''} ${!unlocked ? 'locked' : ''} ${!assetReady ? 'missing' : ''}" type="button"
                ${canEvolveLater ? `data-later-evolution="${form.id}"` : `data-appearance="${form.id}"`}
                ${((!unlocked && !canEvolveLater) || !assetReady || selected || visitorMode) ? 'disabled' : ''}
                aria-label="${ariaLabel}">
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

  function renderEvolutionOffer(mon, pet, forms) {
    if (!forms?.length) return '';
    return `
      <div class="evolution-overlay" role="dialog" aria-modal="true" aria-labelledby="evolution-title">
        <div class="evolution-panel">
          <small>Evolução disponível</small>
          <h2 id="evolution-title">${pet.customName} pode evoluir</h2>
          <p>Escolha uma rota. Depois da evolução, as outras rotas somem somente para este Pokémon.</p>
          <div class="evolution-route-list">
            ${forms.map(form => {
              const appearance = { ...mon, ...form, id: form.id, name: form.name };
              return `
                <button class="evolution-primary evolution-route" type="button" data-evolution-choice="evolve" data-evolution-form="${form.id}">
                  <span class="evolution-preview">${renderPokemonVisual(appearance, 'evolution-sprite', form.name)}</span>
                  <b>Evoluir para ${form.name}</b>
                  <small>Nv. ${form.unlockLevel}</small>
                </button>`;
            }).join('')}
          </div>
          <button class="evolution-secondary" type="button" data-evolution-choice="later" data-evolution-form="${forms[0].id}">
            Continuar como ${pet.customName}
          </button>
          <small class="evolution-hint">Se escolher depois, todas as rotas disponíveis continuarão na aba Pokémon.</small>
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
          <div class="activity-copy"><span class="activity-pixel-icon"><img src="${ITEM_BASE_PATH}action-rest.png" alt=""></span><div><b>Descansando</b><small>+${RULES.sleepEnergyPerTick} energia e +${RULES.sleepXpPerTick} XP a cada 6 min. HP recupera 50% por hora.${pet.sleepXpEarned > 0 ? ` XP deste descanso: ${pet.sleepXpEarned}.` : ''}</small></div></div>
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

  function socialHistoryCopy(item, pet) {
    const actorName = escapeHtml(item.actorName || 'Um treinador');
    if (item.type === 'gift') {
      const food = FOOD_BY_ID[item.foodId];
      return `${actorName} deixou ${food ? food.label : 'uma fruta'} de presente.`;
    }
    if (item.type === 'battle') {
      if (item.outcome === 'victory') {
        return `${actorName} venceu uma batalha contra ${escapeHtml(pet.customName)}.`;
      }
      if (item.outcome === 'defeat') {
        return `${escapeHtml(pet.customName)} venceu uma batalha contra ${actorName}.`;
      }
      return `${actorName} visitou o gramado e saiu da batalha.`;
    }
    return `${actorName} visitou o gramado.`;
  }

  function renderSocialHistory(pet) {
    const history = Array.isArray(state.social?.history) ? state.social.history : [];
    const visible = history.slice(0, socialHistoryVisibleCount);
    if (!visible.length) {
      return '<p class="empty-history">Nenhuma visita registrada ainda.</p>';
    }

    return `
      <div class="history-list compact-history social-history-list">${visible.map(item => `
        <div class="history-item">
          <span>${item.type === 'gift' ? '🎁' : item.type === 'battle' ? '⚔️' : '👋'}</span>
          <p>${socialHistoryCopy(item, pet)}<small>${new Date(item.at).toLocaleString('pt-BR', {
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            month: '2-digit',
          })}</small></p>
        </div>`).join('')}</div>
      ${history.length > visible.length
        ? `<button class="history-more" type="button" data-social-history-more>Ver mais ${Math.min(5, history.length - visible.length)}</button>`
        : '<p class="history-end">Fim do histórico de visitas</p>'}`;
  }

  function renderVerificationGate() {
    if (!verificationGateOpen) return '';
    return `
      <div class="evolution-overlay verification-gate" role="dialog" aria-modal="true" aria-labelledby="verification-gate-title">
        <div class="evolution-panel verification-gate-panel">
          <small>Recurso para treinadores</small>
          <span class="verification-gate-icon" aria-hidden="true">✓</span>
          <h2 id="verification-gate-title">Você precisa ser Verificado</h2>
          <p>Conclua a verificação do perfil para escolher ou trocar seu Pokémon Companheiro e usar os recursos sociais.</p>
          <button class="evolution-primary" type="button" data-verification-info>
            <b>Como verificar</b>
          </button>
          <button class="evolution-secondary" type="button" data-verification-close>
            Voltar ao Pokégochi
          </button>
        </div>
      </div>`;
  }

  function renderVisitorMorePanel(pet) {
    const social = state.social || systemDefaultSocial();
    return `
      <div class="activity-card social-visit-card">
        <div class="activity-copy">
          <span>👋</span>
          <div>
            <b>Visita ao companheiro</b>
            <small>Você está visitando o Pokégochi de ${escapeHtml(social.ownerName)}.</small>
          </div>
        </div>
      </div>
      <div class="more-card social-visit-note">
        <div class="more-title"><span>🌿</span><b>Modo de visita</b></div>
        <p>Os cuidados e o progresso pertencem ao dono. Presentes aparecem no gramado quando ele voltar.</p>
      </div>`;
  }

  function normalizeCompanionSearch(value) {
    return String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  function companionRootSpecies(species) {
    if (!species || species.selectable !== false) return species;
    return DEX.find(mon => mon.dexNumber === species.evolutionRootDexNumber) || species;
  }

  function companionRequestedForm(species, rootSpecies) {
    return getForms(rootSpecies).find(form => form.id === species.id) || getForms(rootSpecies)[0];
  }

  function canSearchCompanion(species) {
    if (species.selectable !== false) return true;
    const rootSpecies = companionRootSpecies(species);
    const requestedForm = companionRequestedForm(species, rootSpecies);
    return Object.values(state.pets).some(pet => (
      pet.dexId === rootSpecies.id
      && isFormUnlocked(pet, requestedForm)
    ));
  }

  function journeysForRoot(rootId) {
    return Object.entries(state.pets)
      .filter(([, pet]) => pet.dexId === rootId)
      .map(([journeyKey, pet]) => ({ journeyKey, pet }));
  }

  function companionSearchEntries(species) {
    const rootSpecies = companionRootSpecies(species);
    const requestedForm = companionRequestedForm(species, rootSpecies);
    const existing = journeysForRoot(rootSpecies.id)
      .filter(({ pet }) => (
        species.selectable !== false || isFormUnlocked(pet, requestedForm)
      ))
      .map(({ journeyKey }) => ({
        createNew: false,
        displayId: species.id,
        journeyKey,
        rootId: rootSpecies.id,
        source: 'search',
      }));
    const canStartNew = rootSpecies.selectable !== false;

    if (canStartNew) {
      existing.push({
        createNew: true,
        displayId: species.id,
        journeyKey: null,
        rootId: rootSpecies.id,
        source: 'search',
      });
    }

    if (!existing.length) {
      existing.push({
        createNew: false,
        displayId: species.id,
        journeyKey: null,
        rootId: rootSpecies.id,
        source: 'search',
      });
    }

    return existing;
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
      matches = DEX;
    }
    return {
      total: matches.length,
      visible: matches.slice(0, COMPANION_RESULT_LIMIT),
    };
  }

  function companionRosterEntries() {
    if (!embeddedInSite) {
      return state.roster.slice(0, 6).map(journeyKey => {
        const species = getDex(journeyKey);
        const pet = state.pets[journeyKey] || systemDefaultPet(species);
        const appearance = getAppearance(species, pet);
        return {
          createNew: false,
          displayId: appearance.id,
          journeyKey,
          rootId: species.id,
          source: 'roster',
        };
      });
    }

    const activeSpecies = getDex();
    const activePet = getPet();
    const activeAppearance = getAppearance(activeSpecies, activePet);
    const active = {
      createNew: false,
      displayId: activeAppearance.id,
      journeyKey: state.selected,
      rootId: activeSpecies.id,
      source: 'roster',
    };
    const visualSlots = state.favoriteTeam.map(entry => {
      const species = getDex(entry.displayId);
      return {
        createNew: !entry.journeyKey,
        displayId: species.id,
        journeyKey: entry.journeyKey,
        rootId: companionRootSpecies(species).id,
        source: 'favorite',
      };
    });
    return [active, ...visualSlots].slice(0, 5);
  }

  function systemMiniCompanion(entry) {
    const species = getDex(entry.displayId);
    const rootSpecies = companionRootSpecies(species);
    const storedPet = entry.journeyKey ? state.pets[entry.journeyKey] : null;
    const requestedForm = companionRequestedForm(species, rootSpecies);
    const isSearch = entry.source === 'search';
    const evolutionLocked = species.selectable === false && !storedPet && !entry.createNew;
    const hasProgressForForm = Boolean(
      storedPet
      && (species.selectable !== false || isFormUnlocked(storedPet, requestedForm))
    );
    const pet = storedPet || systemDefaultPet(rootSpecies);
    if (storedPet) systemApplyOfflineDecay(pet);
    const mood = systemMoodFor(pet);
    const low = hasProgressForForm && (pet.hunger < 30 || pet.energy < 18 || pet.happiness < 30);
    const visual = { ...rootSpecies, ...requestedForm, id: species.id, name: species.name };
    const dexLabel = species.dexNumber ? `#${String(species.dexNumber).padStart(3, '0')}` : species.id;
    let detail;
    if (evolutionLocked) detail = 'Bloqueado · evolua no Tamagotchi';
    else if (hasProgressForForm) {
      const journeyName = pet.customName !== rootSpecies.name ? `${pet.customName} · ` : '';
      detail = `${journeyName}${mood.icon} ${mood.label} · Nv. ${pet.level}`;
    }
    else if (entry.source === 'favorite') detail = 'Favorito visual · Sem progresso';
    else detail = `Cuidar de um novo ${rootSpecies.name} · Nv. 1`;
    const selectionAttributes = evolutionLocked && isSearch
      ? 'disabled aria-disabled="true"'
      : `data-select="${species.id}" data-select-source="${entry.source}" data-select-journey="${entry.journeyKey || ''}" data-select-new="${entry.createNew ? 'true' : 'false'}" aria-label="Selecionar ${species.name}"`;
    return `
      <button class="companion-row ${entry.journeyKey && state.selected === entry.journeyKey ? 'active' : ''} ${evolutionLocked ? 'evolution-locked' : ''} ${entry.source === 'favorite' ? 'visual-favorite' : ''} ${entry.createNew ? 'new-journey' : ''}" type="button" ${selectionAttributes}>
        <span class="mini-orb ${low ? 'needs-care' : ''}">${renderPokemonVisual(visual, 'mini-sprite', species.name)}</span>
        <span class="companion-copy"><b>${species.name}</b><small>${dexLabel} · ${detail}</small></span>
        <span class="companion-chevron" aria-hidden="true">›</span>
      </button>`;
  }

  function companionResultsMarkup() {
    if (!companionSearchOpen) {
      const entries = companionRosterEntries();
      const rosterLimit = embeddedInSite ? 5 : 6;
      return {
        summary: embeddedInSite
          ? `${entries.length}/${rosterLimit} Pokémon no Time`
          : `${entries.length}/${rosterLimit} Pokémon cuidados`,
        html: entries.length
          ? entries.map(systemMiniCompanion).join('')
          : '<div class="companion-empty"><b>Nenhum Pokémon cuidado</b><small>Use a pesquisa para escolher o primeiro.</small></div>',
      };
    }

    const results = companionSearchData();
    return {
      summary: companionQuery.trim()
        ? `${results.total} ${results.total === 1 ? 'resultado' : 'resultados'}`
        : 'Escolha uma forma inicial ou evolução já desbloqueada',
      html: results.visible.length
        ? results.visible.flatMap(companionSearchEntries).map(systemMiniCompanion).join('')
        : '<div class="companion-empty"><b>Nenhum Pokémon encontrado</b><small>Tente outro nome ou número.</small></div>',
    };
  }

  function bindCompanionRows(scope = document) {
    scope.querySelectorAll('[data-select]').forEach(btn => {
      btn.addEventListener('click', () => requestCompanionSelection(
        btn.dataset.select,
        btn.dataset.selectSource || 'roster',
        btn.dataset.selectJourney || null,
        btn.dataset.selectNew === 'true',
      ));
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

  function finishCompanionSelection(
    requestedSpecies,
    rootSpecies,
    source,
    requestedJourneyKey = null,
    createNew = false,
  ) {
    if (!canChooseCompanion()) {
      verificationGateOpen = true;
      render();
      return;
    }
    const previousSpecies = getDex();
    const previousPet = getPet();
    const previousAppearance = getAppearance(previousSpecies, previousPet);
    const previousAppearanceSpecies = DEX.find(mon => mon.id === previousAppearance.id);
    const targetJourneyKey = createNew || !requestedJourneyKey
      ? createJourneyKey()
      : requestedJourneyKey;
    const existingIndex = state.roster.indexOf(targetJourneyKey);
    const favoriteIndex = state.favoriteTeam.findIndex(entry => (
      entry.journeyKey === targetJourneyKey
      || (!entry.journeyKey && getDex(entry.displayId).dexNumber === requestedSpecies.dexNumber)
    ));
    const switchedAt = now();
    const changedCompanion = previousPet.journeyKey !== targetJourneyKey;

    if (changedCompanion) {
      systemApplyOfflineDecay(previousPet, state);
      pausePet(previousPet, switchedAt);
    }

    if (existingIndex > 0) {
      [state.roster[0], state.roster[existingIndex]] = [
        targetJourneyKey,
        state.roster[0],
      ];
    } else if (existingIndex < 0) {
      state.roster = !embeddedInSite && state.roster.length >= 6
        ? [targetJourneyKey, ...state.roster.slice(1)].slice(0, 6)
        : [targetJourneyKey, ...state.roster].slice(0, 6);
    }

    if (!state.pets[targetJourneyKey]) {
      state.pets[targetJourneyKey] = systemDefaultPet(
        rootSpecies,
        Object.keys(state.pets).length,
        targetJourneyKey,
      );
    }

    const nextPet = state.pets[targetJourneyKey];
    let bondReset = false;
    if (changedCompanion) {
      bondReset = resumePet(nextPet, switchedAt);
    } else {
      nextPet.inactiveSince = null;
    }
    if (requestedSpecies.selectable === false) {
      const requestedForm = companionRequestedForm(requestedSpecies, rootSpecies);
      nextPet.activeAppearance = !createNew && isFormUnlocked(nextPet, requestedForm)
        ? requestedForm.id
        : getForms(rootSpecies)[0].id;
    }

    if (favoriteIndex >= 0 && changedCompanion) {
      state.favoriteTeam[favoriteIndex] = {
        displayId: previousAppearanceSpecies?.id || previousSpecies.id,
        journeyKey: previousPet.journeyKey,
      };
      state.favoriteTeam = state.favoriteTeam
        .filter((entry, index, team) => team.findIndex(candidate => (
          candidate.displayId === entry.displayId
          && candidate.journeyKey === entry.journeyKey
        )) === index)
        .slice(0, 5);
    }

    state.selected = targetJourneyKey;
    state.needsCompanionChoice = false;
    notifySite('companion-request', {
      previousAppearanceDex: previousAppearanceSpecies?.dexNumber || previousSpecies.dexNumber,
      previousJourneyKey: previousPet.journeyKey,
      requestedDex: requestedSpecies.dexNumber,
      requestedJourneyKey: targetJourneyKey,
      rootDex: rootSpecies.dexNumber,
      roster: state.roster,
      source,
    });
    companionQuery = '';
    companionSearchOpen = false;
    companionsOpen = false;
    moreOpen = false;
    foodOpen = false;
    pendingCompanionSelection = null;
    pendingArchiveCompanion = null;
    saveState();
    render();
    showToast(
      bondReset
        ? `O vínculo com ${nextPet.customName} recomeçou no Dia 1.`
        : requestedSpecies.selectable === false
        ? createNew
          ? `${requestedSpecies.name} começou uma nova jornada como ${rootSpecies.name}.`
          : `${requestedSpecies.name} agora está no gramado, com todo o progresso preservado.`
        : `${requestedSpecies.name} agora está no gramado.`,
    );
  }

  function commitCompanionSelection(id, source, journeyKey = null, createNew = false) {
    const requestedSpecies = getDex(id);
    const rootSpecies = companionRootSpecies(requestedSpecies);
    const isFavoriteSelection = state.favoriteTeam.some(entry => (
      entry.journeyKey === journeyKey
      || (!entry.journeyKey && getDex(entry.displayId).dexNumber === requestedSpecies.dexNumber)
    ));
    const needsArchiveConfirmation = (
      journeyKey !== state.selected
      && !isFavoriteSelection
      && companionRosterEntries().length >= (embeddedInSite ? 5 : 6)
    );

    if (needsArchiveConfirmation) {
      pendingArchiveCompanion = {
        createNew,
        journeyKey,
        requestedId: requestedSpecies.id,
        source,
      };
      pendingCompanionSelection = null;
      render();
      return;
    }

    finishCompanionSelection(requestedSpecies, rootSpecies, source, journeyKey, createNew);
  }

  function requestCompanionSelection(id, source, journeyKey = null, createNew = false) {
    if (!canChooseCompanion()) {
      verificationGateOpen = true;
      render();
      return;
    }
    const requestedSpecies = getDex(id);
    if (source === 'search' && !createNew && !canSearchCompanion(requestedSpecies)) {
      showToast('Essa evolução precisa ser obtida primeiro no Tamagotchi.');
      return;
    }

    if (requestedSpecies.selectable === false) {
      pendingCompanionSelection = {
        createNew,
        journeyKey,
        requestedId: requestedSpecies.id,
        source,
      };
      pendingArchiveCompanion = null;
      render();
      return;
    }

    commitCompanionSelection(requestedSpecies.id, source, journeyKey, createNew);
  }

  function renderCompanionSelectionWarning() {
    if (!pendingCompanionSelection) return '';
    const requestedSpecies = getDex(pendingCompanionSelection.requestedId);
    const rootSpecies = companionRootSpecies(requestedSpecies);
    const existingPet = pendingCompanionSelection.journeyKey
      ? state.pets[pendingCompanionSelection.journeyKey]
      : null;
    const requestedForm = companionRequestedForm(requestedSpecies, rootSpecies);
    const returnsUnlockedForm = Boolean(
      existingPet
      && isFormUnlocked(existingPet, requestedForm)
    );
    return `
      <div class="evolution-overlay companion-confirmation" role="dialog" aria-modal="true" aria-labelledby="companion-confirmation-title">
        <div class="evolution-panel">
          <small>Forma evoluída</small>
          <span class="evolution-preview">${renderPokemonVisual(requestedSpecies, 'evolution-sprite', requestedSpecies.name)}</span>
          <h2 id="companion-confirmation-title">${returnsUnlockedForm
            ? `Usar ${requestedSpecies.name} nesta jornada?`
            : `${requestedSpecies.name} começará como ${rootSpecies.name}`}</h2>
          <p>${returnsUnlockedForm
            ? 'Essa forma já foi desbloqueada e poderá entrar em uso sem alterar nível, XP ou histórico.'
            : 'Uma nova jornada sempre começa pela forma inicial. A evolução poderá ser conquistada depois.'} O vínculo recomeça no Dia 1 caso esse Pokémon tenha ficado mais de 24 horas fora.</p>
          <button class="evolution-primary" type="button" data-companion-confirm>
            <b>Usar ${returnsUnlockedForm ? requestedSpecies.name : rootSpecies.name}</b>
          </button>
          <button class="evolution-secondary" type="button" data-companion-cancel>Cancelar</button>
        </div>
      </div>`;
  }

  function renderArchiveCompanionConfirmation() {
    if (!pendingArchiveCompanion) return '';
    const requestedSpecies = getDex(pendingArchiveCompanion.requestedId);
    const rootSpecies = companionRootSpecies(requestedSpecies);
    const currentSpecies = getDex();
    const currentPet = getPet();
    const currentAppearance = getAppearance(currentSpecies, currentPet);
    return `
      <div class="evolution-overlay archive-companion-overlay" role="dialog" aria-modal="true" aria-labelledby="archive-companion-title">
        <div class="evolution-panel archive-companion-panel">
          <small>${embeddedInSite ? 'Time Pokémon completo' : 'Seis cuidados ativos'}</small>
          <span class="evolution-preview">${renderPokemonVisual(currentAppearance, 'evolution-sprite', currentAppearance.name)}</span>
          <h2 id="archive-companion-title">${embeddedInSite ? 'Sem slots livres no Time.' : 'A lista de cuidados está cheia.'} Guardar ${currentAppearance.name}?</h2>
          <p>${currentAppearance.name} sairá da lista rápida, mas nível, formas e histórico continuarão salvos. O vínculo será mantido se ele voltar em até 24 horas.</p>
          <button class="evolution-primary" type="button" data-archive-companion-confirm>
            <b>Guardar e usar ${rootSpecies.name}</b>
          </button>
          <button class="evolution-secondary" type="button" data-companion-cancel>Cancelar</button>
        </div>
      </div>`;
  }

  function systemRender() {
    const pet = getPet();
    const species = getDex();
    const visitorMode = isSocialVisitorMode();
    if (!visitorMode) systemApplyOfflineDecay(pet);
    saveState();

    const mon = getAppearance(species, pet);
    const combat = battleSnapshot(pet, mon);
    const mood = systemMoodFor(pet);
    const xpPercent = Math.min(100, (pet.xp / systemXpNeeded(pet)) * 100);
    const dirty = Number(pet.dirtLevel) > 0;
    const needsHealing = Boolean(combat && combat.currentHp <= combat.maxHp * 0.3);
    const needsCare = pet.hunger < 30 || pet.energy < 18 || pet.happiness < 30 || dirty || needsHealing;
    const hungry = pet.hunger < 30;
    const restRequired = needsRest(pet);
    const careLocked = pet.sleeping || restRequired;
    const foodLocked = pet.sleeping;
    const selectedImgStyle = selectedAction ? ` action-${selectedAction}` : '';
    const sheetExpanded = moreOpen || foodOpen;
    const hasCompanions = DEX.length > 1 && !visitorMode;
    const companionResults = hasCompanions && companionsOpen ? companionResultsMarkup() : null;
    const clock = brasiliaClock();
    const evolutionOffer = visitorMode ? [] : getEvolutionOffers(species, pet);
    const musicEnabled = getMusicEnabled();

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
              <button type="button" role="tab" data-status-tab="appearance" class="${statusTab === 'appearance' ? 'active' : ''}" aria-selected="${statusTab === 'appearance'}">Pokémon</button>
              ${visitorMode ? '' : `<button type="button" role="tab" data-status-tab="skills" class="${statusTab === 'skills' ? 'active' : ''}" aria-selected="${statusTab === 'skills'}">Habilidades</button>`}
            </div>
            ${statusTab === 'status' ? visitorMode ? `
              <div class="status-alert good visitor-public-alert">
                <b>👋 Perfil público</b>
                <span>Os cuidados e a mochila pertencem ao dono.</span>
              </div>
              <div class="status-grid visitor-public-status">
                ${systemBondDays(pet)}
              </div>
              <div class="status-meta visitor-public-meta">
                <span>Nível ${pet.level}</span>
                <span>Companheiro ativo</span>
              </div>
            ` : `
              ${needsCare ? `<div class="status-alert"><b>${needsHealing ? '❤️ Precisa recuperar HP!' : hungry ? '🍎 Está com fome!' : dirty ? '🧼 Precisa de limpeza!' : '⚠ Precisa de atenção!'}</b></div>` : `<div class="status-alert good"><b>✨ Tudo certo!</b><span>${pet.customName} está bem cuidado.</span></div>`}
              <div class="status-grid">
                ${battleHpRow(combat)}
                ${systemStatBar('Fome', pet.hunger, 'action-food.png')}
                ${systemStatBar('Felicidade', pet.happiness, 'status-happiness.png')}
                ${systemStatBar('Energia', pet.energy, 'status-energy.png')}
                ${systemBondDays(pet)}
              </div>
              ${battleStatSummary(combat)}
              <div class="status-meta">
                <span>XP ${pet.xp}/${systemXpNeeded(pet)}</span>
                <span>Mochila ${bagCount()} itens</span>
              </div>
              <div class="last-action"><b>Última ação</b><p>${pet.lastAction}</p></div>
            ` : statusTab === 'appearance'
              ? renderAppearancePanel(species, pet)
              : renderSkillsPanel(pet, mon, combat)}
          </div>
        </aside>

        <main class="camp-area ${mood.className} phase-${clock.phase}" data-brasilia-time="${clock.label}">
          <div class="time-light" aria-hidden="true"></div>
          ${renderWorldLayer()}
          ${visitorMode ? '' : renderDirtLayer(pet)}
          <button
            class="music-toggle ${musicEnabled ? 'active' : ''}"
            type="button"
            data-music-toggle
            aria-label="${musicEnabled ? 'Desativar música de fundo' : 'Ativar música de fundo'}"
            aria-pressed="${musicEnabled}"
            title="${musicEnabled ? 'Desativar música' : 'Ativar música'}"
          >
            ${musicEnabled ? `
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M11 5 6.8 8.5H3.5v7h3.3L11 19V5Z"></path>
                <path d="M15 9.2c.8.7 1.2 1.6 1.2 2.8s-.4 2.1-1.2 2.8"></path>
                <path d="M18 6.8c1.4 1.3 2.2 3.1 2.2 5.2s-.8 3.9-2.2 5.2"></path>
              </svg>
            ` : `
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M11 5 6.8 8.5H3.5v7h3.3L11 19V5Z"></path>
                <path d="m15.2 9.2 5.6 5.6"></path>
                <path d="m20.8 9.2-5.6 5.6"></path>
              </svg>
            `}
          </button>
          <div class="mood-pill ${needsCare ? 'need' : ''}"><span>${mood.icon}</span><b>${mood.label}</b></div>
          <button class="pet-stage ${selectedImgStyle} ${pet.sleeping ? 'is-sleeping' : pet.energy < 20 ? 'is-tired' : ''}" type="button" data-status-toggle aria-label="Abrir status de ${pet.customName}">
            <span class="pet-aura"></span>
            ${pet.sleeping
              ? '<span class="resting-pokeball" aria-hidden="true"><i></i></span>'
              : `<span class="stage-sprite-wrap" ${stageVisualStyle(mon)}>${renderPokemonVisual(mon, 'stage-sprite', mon.name, true)}</span>`}
            <span class="pet-shadow"></span>
          </button>
        </main>

        <section class="care-sheet ${sheetExpanded ? 'expanded' : ''}" aria-label="Cuidar do Tamagotchi">
          <div class="sheet-toggle-row">
            <button class="more-toggle" type="button" data-more-toggle aria-expanded="${sheetExpanded}" aria-label="${foodOpen ? 'Fechar mochila' : moreOpen ? 'Fechar detalhes' : 'Abrir mais detalhes'}">
              <span>${sheetExpanded ? '⌄' : '⌃'}</span>
              <b>${sheetExpanded ? 'Fechar' : 'Mais'}</b>
            </button>
            <button class="more-toggle back-toggle" type="button" data-go-back>
              <span aria-hidden="true"><img src="assets/arrow-ios-back.svg" alt=""></span>
              <b>Voltar</b>
            </button>
          </div>

          ${foodOpen && !foodLocked ? renderFoodTray(pet) : ''}

          <div class="more-panel" ${moreOpen ? '' : 'inert'}>
            ${visitorMode ? renderVisitorMorePanel(pet) : `
              ${renderActivityCard(pet)}
              <div class="more-card history-card">
                <div class="more-title"><span>📜</span><b>Histórico</b></div>
                ${systemRecentHistory(pet)}
              </div>
              ${embeddedInSite ? `<div class="more-card history-card social-history-card">
                <div class="more-title"><span>👋</span><b>Histórico de visitas</b></div>
                ${renderSocialHistory(pet)}
              </div>` : ''}
            `}
          </div>

          ${visitorMode ? `<div class="action-dock social-action-dock">
            <button class="action-btn social-gift-action ${socialGiftSending ? 'active' : ''}" data-social-gift type="button" ${(socialGiftSending || state.social?.giftSent) ? 'disabled' : ''}>
              <span aria-hidden="true"><img src="${ITEM_BASE_PATH}social-gift.webp" alt=""></span><b>${state.social?.giftSent ? 'Enviado' : socialGiftSending ? 'Enviando' : 'Presentear'}</b>
            </button>
            <button class="action-btn social-battle-action ${socialBattleSaving ? 'active' : ''}" data-social-battle type="button">
              <span><img src="${ITEM_BASE_PATH}action-train.png" alt=""></span><b>Batalhar</b>
            </button>
          </div>` : `<div class="action-dock">
            <button class="action-btn action-feed-btn ${foodOpen ? 'active' : ''}" data-food-toggle type="button" aria-label="${foodOpen ? 'Fechar mochila de comidas' : 'Abrir mochila de comidas'}" ${foodLocked ? 'disabled' : ''}>
              <span><img src="${ITEM_BASE_PATH}action-food.png" alt=""></span><b>Comida</b>
            </button>
            ${Object.entries(SYSTEM_ACTIONS).map(([key, action]) => {
              const endingRest = key === 'sleep' && pet.sleeping;
              const label = endingRest ? 'Levantar' : action.short;
              const icon = endingRest ? 'action-wake.png' : action.asset;
              const disabled = key === 'play' && careLocked;
              return `
                <button class="action-btn action-${key}-btn ${endingRest ? 'action-wake-btn' : ''} ${selectedAction === (endingRest ? 'wake' : key) ? 'active' : ''}" data-action="${key}" type="button" aria-label="${label}" ${disabled ? 'disabled' : ''}>
                  <span><img src="${ITEM_BASE_PATH}${icon}" alt=""></span><b>${label}</b>
                </button>`;
            }).join('')}
          </div>`}
        </section>

        ${renderEvolutionOffer(species, pet, evolutionOffer)}
        ${visitorMode ? '' : renderCompanionSelectionWarning()}
        ${visitorMode ? '' : renderArchiveCompanionConfirmation()}
        ${visitorMode ? '' : renderBattleTrainingMenu(pet, mon, combat)}
        ${renderVerificationGate()}

        ${hasCompanions && companionsOpen && canChooseCompanion() ? `<aside class="companions-drawer open" aria-label="Alterar Pokémon companheiro">
          <div class="drawer-card">
            <div class="drawer-head">
              <div><small>${companionSearchOpen ? 'Pokédex permitida' : 'Seus cuidados'}</small><h2>${companionSearchOpen ? 'Pesquisar Pokémon' : 'Alterar Companheiro'}</h2></div>
              <button type="button" class="close-panel" data-companions-toggle aria-label="Fechar Alterar Companheiro">×</button>
            </div>
            <button class="companion-search-toggle" type="button" data-companion-search-toggle>
              <span aria-hidden="true">${companionSearchOpen ? '‹' : '⌕'}</span>
              <b>${companionSearchOpen ? 'Voltar aos cuidados' : 'Pesquisar outro Pokémon'}</b>
            </button>
            ${companionSearchOpen ? `<label class="companion-search">
              <span aria-hidden="true">⌕</span>
              <input type="search" data-companion-search value="${escapeHtml(companionQuery)}" placeholder="Nome ou ID" autocomplete="off" spellcheck="false">
            </label>` : ''}
            <div class="companion-results-meta" data-companion-summary>${companionResults.summary}</div>
            <div class="companions-list" data-companion-results>${companionResults.html}</div>
          </div>
        </aside>` : ''}
      </section>
    `;

    document.querySelectorAll('[data-action]').forEach(btn => btn.addEventListener('click', () => systemDoAction(btn.dataset.action)));
    document.querySelectorAll('[data-battle-menu-close]').forEach(btn => btn.addEventListener('click', () => {
      battleMenuOpen = false;
      selectedAction = null;
      render();
    }));
    document.querySelectorAll('[data-battle-menu-tab]').forEach(btn => btn.addEventListener('click', () => {
      battleMenuTab = btn.dataset.battleMenuTab;
      render();
    }));
    document.querySelectorAll('[data-battle-history-more]').forEach(btn => btn.addEventListener('click', () => {
      battleHistoryVisibleCount += 5;
      render();
    }));
    document.querySelectorAll('[data-battle-start]').forEach(btn => btn.addEventListener('click', () => {
      const blocker = battleTrainingBlocker(pet);
      if (blocker) {
        showToast(blocker);
        render();
        return;
      }
      selectedAction = 'train';
      const message = openBattleTraining(pet);
      pet.lastUpdate = now();
      saveState();
      render();
      if (message !== false) showToast(message);
    }));
    document.querySelectorAll('[data-status-tab]').forEach(btn => btn.addEventListener('click', () => {
      statusTab = btn.dataset.statusTab;
      if (statusTab !== 'skills') {
        moveEditorOpen = false;
        moveSelectionDraft = [];
      }
      render();
    }));
    document.querySelectorAll('[data-appearance]').forEach(btn => btn.addEventListener('click', () => selectAppearance(btn.dataset.appearance)));
    document.querySelectorAll('[data-later-evolution]').forEach(btn => btn.addEventListener('click', () => {
      chooseEvolution(btn.dataset.laterEvolution, 'evolve');
    }));
    document.querySelectorAll('[data-palette]').forEach(btn => btn.addEventListener('click', () => selectPalette(btn.dataset.palette)));
    document.querySelectorAll('[data-music-toggle]').forEach(btn => btn.addEventListener('click', () => {
      setMusicEnabled(!getMusicEnabled());
    }));
    document.querySelectorAll('[data-pokegochi-notification-toggle]').forEach(btn => btn.addEventListener('click', () => {
      setPokegochiNotificationPreference(!getPokegochiNotificationPreference());
    }));
    document.querySelectorAll('[data-evolution-choice]').forEach(btn => btn.addEventListener('click', () => chooseEvolution(btn.dataset.evolutionForm, btn.dataset.evolutionChoice)));
    document.querySelectorAll('[data-allocate-attribute]').forEach(btn => btn.addEventListener('click', () => {
      const result = window.SuperPokegochiBattle?.allocateAttribute(
        pet,
        battleDexNumber(mon),
        btn.dataset.allocateAttribute,
        mon.name,
      );
      if (!result) {
        showToast('Você não possui pontos de atributo disponíveis.');
        return;
      }
      pet.lastAction = `${pet.customName} ficou mais forte em ${window.SuperPokegochiBattle.attributeLabels[btn.dataset.allocateAttribute]}.`;
      saveState();
      render();
    }));
    document.querySelectorAll('[data-open-attribute-reset]').forEach(btn => btn.addEventListener('click', () => {
      attributeResetOpen = true;
      render();
    }));
    document.querySelectorAll('[data-cancel-attribute-reset]').forEach(btn => btn.addEventListener('click', () => {
      attributeResetOpen = false;
      render();
    }));
    document.querySelectorAll('[data-confirm-attribute-reset]').forEach(btn => btn.addEventListener('click', () => {
      if (attributeResetPending) return;
      if (!embeddedInSite) {
        const appearance = getAppearance(getDex(), pet);
        window.SuperPokegochiBattle?.resetAttributes(
          pet,
          battleDexNumber(appearance),
          appearance.name,
        );
        attributeResetOpen = false;
        pet.lastAction = `${pet.customName} recuperou seus pontos de atributo.`;
        systemAddHistory(pet, '↺', pet.lastAction);
        saveState();
        render();
        showToast('Atributos resetados.');
        return;
      }
      attributeResetPending = true;
      render();
      notifySite('attribute-reset-request', { state });
    }));
    document.querySelectorAll('[data-open-move-editor]').forEach(btn => btn.addEventListener('click', () => {
      const battle = window.SuperPokegochiBattle;
      const learnedMoves = battle?.getLearnedMoves?.(pet, battleDexNumber(mon), mon.name) || [];
      const allowedIds = new Set(learnedMoves.map(move => move.id));
      const requiredCount = Math.min(4, learnedMoves.length);
      const equippedIds = (combat?.equippedMoves || [])
        .filter(moveId => allowedIds.has(moveId))
        .slice(0, requiredCount);
      const fillIds = learnedMoves
        .map(move => move.id)
        .filter(moveId => !equippedIds.includes(moveId));
      moveSelectionDraft = [...equippedIds, ...fillIds].slice(0, requiredCount);
      moveEditorOpen = true;
      render();
    }));
    document.querySelectorAll('[data-toggle-learned-move]').forEach(btn => btn.addEventListener('click', () => {
      const moveId = btn.dataset.toggleLearnedMove;
      if (moveSelectionDraft.includes(moveId)) {
        moveSelectionDraft = moveSelectionDraft.filter(selectedMove => selectedMove !== moveId);
      } else if (moveSelectionDraft.length < 4) {
        moveSelectionDraft = [...moveSelectionDraft, moveId];
      } else {
        showToast('Você pode equipar até quatro golpes.');
      }
      render();
    }));
    document.querySelectorAll('[data-cancel-move-editor]').forEach(btn => btn.addEventListener('click', () => {
      moveEditorOpen = false;
      moveSelectionDraft = [];
      render();
    }));
    document.querySelectorAll('[data-save-move-selection]').forEach(btn => btn.addEventListener('click', () => {
      const battle = window.SuperPokegochiBattle;
      const saved = battle?.setEquippedMoves?.(
        pet,
        battleDexNumber(mon),
        moveSelectionDraft,
        mon.name,
      );
      if (!saved) {
        showToast('Selecione todos os golpes necessários antes de salvar.');
        return;
      }
      const learnedById = new Map(
        battle.getLearnedMoves(pet, battleDexNumber(mon), mon.name)
          .map(move => [move.id, move.name]),
      );
      const selectedNames = moveSelectionDraft
        .map(moveId => learnedById.get(moveId))
        .filter(Boolean);
      pet.lastAction = `${pet.customName} equipou ${selectedNames.join(', ')}.`;
      systemAddHistory(pet, '⚔️', pet.lastAction);
      moveEditorOpen = false;
      moveSelectionDraft = [];
      saveState();
      render();
      showToast('Habilidades de batalha atualizadas.');
    }));
    document.querySelectorAll('[data-companion-confirm]').forEach(btn => btn.addEventListener('click', () => {
      if (!pendingCompanionSelection) return;
      commitCompanionSelection(
        pendingCompanionSelection.requestedId,
        pendingCompanionSelection.source,
        pendingCompanionSelection.journeyKey,
        pendingCompanionSelection.createNew,
      );
    }));
    document.querySelectorAll('[data-companion-cancel]').forEach(btn => btn.addEventListener('click', () => {
      pendingCompanionSelection = null;
      pendingArchiveCompanion = null;
      render();
    }));
    document.querySelectorAll('[data-archive-companion-confirm]').forEach(btn => btn.addEventListener('click', () => {
      if (!pendingArchiveCompanion) return;
      const requestedSpecies = getDex(pendingArchiveCompanion.requestedId);
      const rootSpecies = companionRootSpecies(requestedSpecies);
      const source = pendingArchiveCompanion.source;
      const journeyKey = pendingArchiveCompanion.journeyKey;
      const createNew = pendingArchiveCompanion.createNew;
      pendingArchiveCompanion = null;
      finishCompanionSelection(
        requestedSpecies,
        rootSpecies,
        source,
        journeyKey,
        createNew,
      );
    }));
    document.querySelectorAll('[data-feed-food]').forEach(btn => btn.addEventListener('click', () => feedPet(btn.dataset.feedFood)));
    document.querySelectorAll('[data-collect-leaf]').forEach(btn => btn.addEventListener('click', () => collectWorldLeaf(btn.dataset.collectLeaf)));
    document.querySelectorAll('[data-collect-food]').forEach(btn => btn.addEventListener('click', () => collectWorldFood(btn.dataset.collectFood)));
    document.querySelectorAll('[data-collect-gift]').forEach(btn => btn.addEventListener('click', () => collectSocialGift(btn.dataset.collectGift)));
    document.querySelectorAll('[data-clean-dirt]').forEach(btn => btn.addEventListener('click', cleanDirt));
    document.querySelectorAll('[data-social-gift]').forEach(btn => btn.addEventListener('click', sendSocialGift));
    document.querySelectorAll('[data-social-battle]').forEach(btn => btn.addEventListener('click', openSocialBattle));
    document.querySelectorAll('[data-verification-info]').forEach(btn => btn.addEventListener('click', requestVerification));
    document.querySelectorAll('[data-verification-close]').forEach(btn => btn.addEventListener('click', () => {
      verificationGateOpen = false;
      if (state.needsCompanionChoice && state.roster.length === 0) {
        goBack();
        return;
      }
      render();
    }));
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
    document.querySelectorAll('[data-companion-search-toggle]').forEach(btn => btn.addEventListener('click', () => {
      companionSearchOpen = !companionSearchOpen;
      companionQuery = '';
      render();
      if (companionSearchOpen) {
        requestAnimationFrame(() => document.querySelector('[data-companion-search]')?.focus());
      }
    }));
    document.querySelectorAll('[data-history-more]').forEach(btn => btn.addEventListener('click', () => { historyVisibleCount += 3; render(); }));
    document.querySelectorAll('[data-social-history-more]').forEach(btn => btn.addEventListener('click', () => {
      socialHistoryVisibleCount += 5;
      render();
    }));
    document.querySelectorAll('[data-status-toggle]').forEach(btn => btn.addEventListener('click', () => { statusOpen = !statusOpen; companionsOpen = false; render(); }));
    document.querySelectorAll('[data-more-toggle]').forEach(btn => btn.addEventListener('click', () => {
      if (sheetExpanded) {
        moreOpen = false;
        foodOpen = false;
      } else {
        moreOpen = true;
      }
      statusOpen = false;
      render();
    }));
    document.querySelectorAll('[data-companions-toggle]').forEach(btn => btn.addEventListener('click', () => {
      if (!canChooseCompanion()) {
        companionsOpen = false;
        companionSearchOpen = false;
        verificationGateOpen = true;
        statusOpen = false;
        render();
        return;
      }
      companionsOpen = !companionsOpen;
      if (!companionsOpen) {
        companionSearchOpen = false;
        companionQuery = '';
      }
      statusOpen = false;
      render();
    }));
    document.querySelectorAll('[data-go-back]').forEach(btn => btn.addEventListener('click', goBack));
    if (statusOpen && (statusTab === 'status' || statusTab === 'skills')) {
      hydrateBattleProfile(pet, mon);
    }
    announceEvolutionOffer(species, pet, evolutionOffer);
  }

  const render = systemRender;
  initializeFormAssetStatus();
  state = systemMigrateState(readStoredState());
  if (state.needsCompanionChoice && state.roster.length === 0) {
    if (canChooseCompanion()) {
      companionsOpen = true;
      companionSearchOpen = true;
    } else {
      verificationGateOpen = true;
    }
  }
  state.settings = { ...(state.settings || {}), musicEnabled: true };
  chooseRandomStartingMusicTrack();
  dailyRewardMessage = isSocialVisitorMode() ? null : claimDailyLoginReward(state);
  if (!isSocialVisitorMode()) syncAllPets(state);
  saveState();
  render();
  loadBackgroundMusic();
  if (getMusicEnabled()) void playBackgroundMusic();
  checkFormAssets();
  if (dailyRewardMessage) setTimeout(() => showToast(dailyRewardMessage), 300);
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !battleMenuOpen) return;
    battleMenuOpen = false;
    selectedAction = null;
    render();
  });
  window.addEventListener('message', (event) => {
    if (
      !embeddedInSite
      || event.origin !== window.location.origin
      || !event.data
    ) {
      return;
    }

    if (event.data.type === 'superpokegochi:notification-result') {
      state.settings = {
        ...(state.settings || {}),
        pokegochiNotificationsEnabled: Boolean(event.data.enabled),
      };
      saveState();
      render();
      showToast(
        typeof event.data.message === 'string'
          ? event.data.message
          : event.data.ok
            ? 'Preferência de notificações salva.'
            : 'Não foi possível alterar as notificações.',
      );
      return;
    }

    if (event.data.type === 'superpokegochi:attribute-reset-result') {
      attributeResetPending = false;
      if (event.data.ok) {
        const pet = getPet();
        const species = getDex();
        const appearance = getAppearance(species, pet);
        window.SuperPokegochiBattle?.resetAttributes(
          pet,
          battleDexNumber(appearance),
          appearance.name,
        );
        attributeResetOpen = false;
        pet.lastAction = `${pet.customName} recuperou seus pontos de atributo. 20 BPoints foram consumidos.`;
        systemAddHistory(pet, '↺', pet.lastAction);
        saveState();
      }
      render();
      showToast(
        typeof event.data.message === 'string'
          ? event.data.message
          : event.data.ok
            ? 'Atributos resetados.'
            : 'Não foi possível resetar os atributos.',
      );
      return;
    }

    if (event.data.type === 'superpokegochi:social-gift-result') {
      socialGiftSending = false;
      if (event.data.ok) {
        state.social.giftSent = true;
      }
      render();
      showToast(
        typeof event.data.message === 'string'
          ? event.data.message
          : event.data.ok
            ? 'Presente enviado.'
            : 'Não foi possível enviar o presente.',
      );
      return;
    }

    if (event.data.type === 'superpokegochi:gift-claim-result') {
      const giftId = Number(event.data.giftId);
      const collectedGift = state.social?.gifts?.find(gift => gift.id === giftId);
      pendingSocialGiftClaims.delete(giftId);
      if (event.data.ok && FOOD_BY_ID[event.data.foodId]) {
        state.social.gifts = state.social.gifts.filter(gift => gift.id !== giftId);
        state.bag[event.data.foodId] = Math.max(
          0,
          Math.round(Number(event.data.newCount) || 0),
        );
        saveState();
      }
      render();
      const successMessage = `${collectedGift?.fromName || 'Um treinador'} deixou ${socialGiftFoodPhrase(event.data.foodId)} de presente.`;
      const message = event.data.ok
        ? successMessage
        : typeof event.data.message === 'string'
          ? event.data.message
          : 'Não foi possível recolher o presente.';
      showToast(message, event.data.ok ? 4800 : 2600);
      return;
    }

    if (event.data.type === 'superpokegochi:social-battle-save-result') {
      socialBattleSaving = false;
      showToast(
        typeof event.data.message === 'string'
          ? event.data.message
          : event.data.ok
            ? 'Batalha registrada no histórico.'
            : 'Não foi possível registrar a batalha.',
      );
    }
  });
  setInterval(() => {
    if (!isSocialVisitorMode()) syncAllPets(state);
    saveState();
    render();
  }, 10000);
})();












