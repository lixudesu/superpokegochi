(() => {
  const host = document.querySelector('[data-battle-root]');
  const API_BASE = 'https://pokeapi.co/api/v2';
  const API_CACHE_KEY = 'superpokegochi_battle_catalog_v2';
  const CACHE_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
  const VERSION_GROUPS = [
    'scarlet-violet',
    'sword-shield',
    'ultra-sun-ultra-moon',
    'omega-ruby-alpha-sapphire',
  ];
  const ATTRIBUTE_KEYS = ['attack', 'defense', 'speed', 'vitality'];
  const ATTRIBUTE_LABELS = {
    attack: 'Ataque',
    defense: 'Defesa',
    speed: 'Velocidade',
    vitality: 'Vitalidade',
  };
  const PLAYER_ATTACK_CALLOUT_MS = 1650;
  const ENEMY_ATTACK_CALLOUT_MS = 2800;
  const BETWEEN_ATTACKS_MS = 700;
  const YOUR_TURN_NOTICE_MS = 1350;
  const BATTLE_SOUND_VOLUME = {
    hit: 0.2,
    victory: 0.15,
  };
  const BATTLE_SOUND_BASE_PATH = document.documentElement.dataset.soundBase || 'assets/sounds/';
  const BATTLE_SOUND_VERSION = '20260730-battle-audio-v23';
  const battleSounds = {
    hit: new Audio(new URL(`${BATTLE_SOUND_BASE_PATH}battle-hit.mp3?v=${BATTLE_SOUND_VERSION}`, document.baseURI).href),
    victory: new Audio(new URL(`${BATTLE_SOUND_BASE_PATH}battle-victory.mp3?v=${BATTLE_SOUND_VERSION}`, document.baseURI).href),
  };
  const TYPE_TEXTBOXES = {
    bug: 16,
    dark: 48,
    dragon: 43,
    electric: 10,
    fairy: 9,
    fighting: 5,
    fire: 37,
    flying: 23,
    ghost: 46,
    grass: 4,
    ground: 50,
    ice: 11,
    normal: 0,
    poison: 24,
    psychic: 39,
    rock: 44,
    steel: 49,
    water: 40,
  };
  const DAY_BATTLE_SCENES = [
    { background: '0/0.png', base: '0/1.png' },
    { background: '0/1.png', base: '8/1.png' },
    { background: '1/0.png', base: '23/1.png' },
    { background: '1/1.png', base: '0/1.png' },
    { background: '2/0.png', base: '4/1.png' },
    { background: '2/1.png', base: '7/1.png' },
    { background: '3/0.png', base: '10/1.png' },
    { background: '3/1.png', base: '8/1.png' },
    { background: '4/0.png', base: '22/1.png' },
    { background: '4/1.png', base: '6/1.png' },
    { background: '6/1.png', base: '5/1.png' },
  ];
  const NIGHT_BATTLE_SCENES = [
    { background: '0/2.png', base: '16/thumb.png' },
    { background: '1/2.png', base: '23/1.png' },
    { background: '2/2.png', base: '16/thumb.png' },
    { background: '3/2.png', base: '16/thumb.png' },
    { background: '4/2.png', base: '10/1.png' },
    { background: '5/1.png', base: '10/1.png' },
    { background: '5/2.png', base: '16/thumb.png' },
  ];
  const TYPE_LABELS = {
    bug: 'Inseto',
    dark: 'Sombrio',
    dragon: 'Dragão',
    electric: 'Elétrico',
    fairy: 'Fada',
    fighting: 'Lutador',
    fire: 'Fogo',
    flying: 'Voador',
    ghost: 'Fantasma',
    grass: 'Planta',
    ground: 'Terrestre',
    ice: 'Gelo',
    normal: 'Normal',
    poison: 'Venenoso',
    psychic: 'Psíquico',
    rock: 'Pedra',
    steel: 'Aço',
    water: 'Água',
  };
  const STATUS_CONDITIONS = {
    burn: { className: 'burn', label: 'QUE', name: 'queimadura' },
    confusion: { className: 'confusion', label: 'CON', name: 'confusão' },
    freeze: { className: 'freeze', label: 'GEL', name: 'congelamento' },
    paralysis: { className: 'paralysis', label: 'PAR', name: 'paralisia' },
    poison: { className: 'poison', label: 'ENV', name: 'veneno' },
    sleep: { className: 'sleep', label: 'SON', name: 'sono' },
  };
  const TYPE_EFFECTIVENESS = {
    bug: { dark: 2, fairy: 0.5, fighting: 0.5, fire: 0.5, flying: 0.5, ghost: 0.5, grass: 2, poison: 0.5, psychic: 2, steel: 0.5 },
    dark: { dark: 0.5, fairy: 0.5, fighting: 0.5, ghost: 2, psychic: 2 },
    dragon: { dragon: 2, fairy: 0, steel: 0.5 },
    electric: { dragon: 0.5, electric: 0.5, flying: 2, grass: 0.5, ground: 0, water: 2 },
    fairy: { dark: 2, dragon: 2, fighting: 2, fire: 0.5, poison: 0.5, steel: 0.5 },
    fighting: { bug: 0.5, dark: 2, fairy: 0.5, flying: 0.5, ghost: 0, ice: 2, normal: 2, poison: 0.5, psychic: 0.5, rock: 2, steel: 2 },
    fire: { bug: 2, dragon: 0.5, fire: 0.5, grass: 2, ice: 2, rock: 0.5, steel: 2, water: 0.5 },
    flying: { bug: 2, electric: 0.5, fighting: 2, grass: 2, rock: 0.5, steel: 0.5 },
    ghost: { dark: 0.5, ghost: 2, normal: 0, psychic: 2 },
    grass: { bug: 0.5, dragon: 0.5, fire: 0.5, flying: 0.5, grass: 0.5, ground: 2, poison: 0.5, rock: 2, steel: 0.5, water: 2 },
    ground: { bug: 0.5, electric: 2, fire: 2, flying: 0, grass: 0.5, poison: 2, rock: 2, steel: 2 },
    ice: { dragon: 2, fire: 0.5, flying: 2, grass: 2, ground: 2, ice: 0.5, steel: 0.5, water: 0.5 },
    normal: { ghost: 0, rock: 0.5, steel: 0.5 },
    poison: { fairy: 2, ghost: 0.5, grass: 2, ground: 0.5, poison: 0.5, rock: 0.5, steel: 0 },
    psychic: { dark: 0, fighting: 2, poison: 2, psychic: 0.5, steel: 0.5 },
    rock: { bug: 2, fighting: 0.5, fire: 2, flying: 2, ground: 0.5, ice: 2, steel: 0.5 },
    steel: { electric: 0.5, fairy: 2, fire: 0.5, ice: 2, rock: 2, steel: 0.5, water: 0.5 },
    water: { dragon: 0.5, fire: 2, grass: 0.5, ground: 2, rock: 2, water: 0.5 },
  };
  const memoryCache = new Map();
  let session = null;
  let loadSequence = 0;

  function clamp(value, minimum = 0, maximum = 100) {
    return Math.max(minimum, Math.min(maximum, Math.round(Number(value) || 0)));
  }

  function clampFloat(value, minimum = 0, maximum = 100) {
    const numeric = Number(value);
    return Math.max(minimum, Math.min(maximum, Number.isFinite(numeric) ? numeric : 0));
  }

  function normalizedBattleLevel(value) {
    const numeric = Number(value);
    return Math.max(
      1,
      Math.min(Number.MAX_SAFE_INTEGER, Math.round(Number.isFinite(numeric) ? numeric : 1)),
    );
  }

  function normalizedPointValue(value) {
    const numeric = Number(value);
    return Math.max(
      0,
      Math.min(Number.MAX_SAFE_INTEGER, Math.round(Number.isFinite(numeric) ? numeric : 0)),
    );
  }

  function canonicalMoveId(value) {
    return String(value || '').trim().toLowerCase();
  }

  function stopBattleSounds() {
    Object.values(battleSounds).forEach(sound => {
      sound.pause();
      try {
        sound.currentTime = 0;
      } catch {
        // O áudio ainda pode estar carregando.
      }
    });
  }

  function playBattleSound(name) {
    if (session?.config?.soundEnabled === false) return;
    const sound = battleSounds[name];
    if (!sound) return;
    Object.entries(battleSounds).forEach(([soundName, candidate]) => {
      if (soundName === name) return;
      candidate.pause();
      try {
        candidate.currentTime = 0;
      } catch {
        // O outro efeito ainda pode estar carregando.
      }
    });
    sound.pause();
    try {
      sound.currentTime = 0;
    } catch {
      // A reprodução começa quando os metadados terminarem de carregar.
    }
    sound.volume = BATTLE_SOUND_VOLUME[name] || 0.16;
    void sound.play().catch(() => {
      // Alguns navegadores só liberam áudio depois da primeira interação.
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function prettyName(value) {
    return String(value || '')
      .split('-')
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  function typeLabel(type) {
    return TYPE_LABELS[type] || prettyName(type);
  }

  function battleTimePhase() {
    try {
      const hourPart = new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        hourCycle: 'h23',
        timeZone: 'America/Sao_Paulo',
      }).formatToParts(new Date()).find(part => part.type === 'hour');
      const hour = Number(hourPart?.value);
      return hour >= 6 && hour < 18 ? 'day' : 'night';
    } catch {
      const hour = new Date().getHours();
      return hour >= 6 && hour < 18 ? 'day' : 'night';
    }
  }

  function chooseBattleScene() {
    const phase = battleTimePhase();
    const pool = phase === 'night' ? NIGHT_BATTLE_SCENES : DAY_BATTLE_SCENES;
    return {
      ...pool[Math.floor(Math.random() * pool.length)],
      phase,
    };
  }

  function battlefieldStyle(scene) {
    const background = scene?.background || '0/0.png';
    const base = scene?.base || '0/1.png';
    return [
      `--battle-background:url('assets/backgrounds/${background}')`,
      `--battle-platform:url('assets/bases/${base}')`,
    ].join(';');
  }

  function defaultBaseStats(dexNumber = 1) {
    const seed = Math.max(1, Number(dexNumber) || 1);
    return {
      attack: 45 + (seed % 31),
      defense: 42 + ((seed * 3) % 29),
      hp: 45 + ((seed * 5) % 36),
      specialAttack: 45 + ((seed * 7) % 31),
      specialDefense: 42 + ((seed * 11) % 29),
      speed: 40 + ((seed * 13) % 41),
    };
  }

  function normalizeSpeciesData(value, dexNumber, fallbackName = 'Pokémon') {
    const source = value && typeof value === 'object' ? value : {};
    const stats = source.stats && typeof source.stats === 'object'
      ? source.stats
      : defaultBaseStats(dexNumber);
    return {
      abilities: Array.isArray(source.abilities)
        ? source.abilities.slice(0, 4).map(ability => ({
            hidden: ability && ability.hidden === true,
            name: String(ability && ability.name || ''),
          })).filter(ability => ability.name)
        : [],
      baseExperience: clamp(source.baseExperience || 64, 1, 999),
      dexNumber: clamp(source.dexNumber || dexNumber, 1, 1025),
      moveLearnset: Array.isArray(source.moveLearnset)
        ? source.moveLearnset.slice(0, 80).map(move => ({
            level: clamp(move && move.level, 0, 100),
            name: String(move && move.name || ''),
          })).filter(move => move.name)
        : [],
      name: String(source.name || fallbackName),
      source: source.source === 'official' ? 'official' : 'fallback',
      stats: {
        attack: clamp(stats.attack, 1, 255),
        defense: clamp(stats.defense, 1, 255),
        hp: clamp(stats.hp, 1, 255),
        specialAttack: clamp(stats.specialAttack, 1, 255),
        specialDefense: clamp(stats.specialDefense, 1, 255),
        speed: clamp(stats.speed, 1, 255),
      },
      types: Array.isArray(source.types)
        ? source.types.slice(0, 2).map(type => String(type)).filter(Boolean)
        : ['normal'],
    };
  }

  function readPersistentCache() {
    try {
      const parsed = JSON.parse(localStorage.getItem(API_CACHE_KEY));
      return parsed && typeof parsed === 'object' && parsed.entries && typeof parsed.entries === 'object'
        ? parsed
        : { entries: {} };
    } catch {
      return { entries: {} };
    }
  }

  function writePersistentCache(cache) {
    try {
      const entries = Object.entries(cache.entries)
        .sort((first, second) => Number(second[1]?.storedAt || 0) - Number(first[1]?.storedAt || 0))
        .slice(0, 160);
      localStorage.setItem(API_CACHE_KEY, JSON.stringify({ entries: Object.fromEntries(entries) }));
    } catch {
      // O jogo continua usando o cache em memória quando o navegador bloqueia o armazenamento.
    }
  }

  function getCached(key) {
    if (memoryCache.has(key)) return memoryCache.get(key);
    const cache = readPersistentCache();
    const entry = cache.entries[key];
    if (!entry || Date.now() - Number(entry.storedAt || 0) > CACHE_LIFETIME_MS) return null;
    memoryCache.set(key, entry.value);
    return entry.value;
  }

  function setCached(key, value) {
    memoryCache.set(key, value);
    const cache = readPersistentCache();
    cache.entries[key] = { storedAt: Date.now(), value };
    writePersistentCache(cache);
  }

  async function fetchJson(path) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    try {
      const response = await fetch(`${API_BASE}${path}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`PokéAPI respondeu ${response.status}.`);
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  function moveLevelForVersion(move) {
    const details = Array.isArray(move.version_group_details) ? move.version_group_details : [];
    const levelUp = details.filter(detail => detail.move_learn_method?.name === 'level-up');
    for (const group of VERSION_GROUPS) {
      const match = levelUp.find(detail => detail.version_group?.name === group);
      if (match) return clamp(match.level_learned_at, 0, 100);
    }
    if (!levelUp.length) return null;
    return Math.min(...levelUp.map(detail => clamp(detail.level_learned_at, 0, 100)));
  }

  async function loadPokemonData(dexNumber) {
    const safeDex = clamp(dexNumber, 1, 1025);
    const key = `pokemon:${safeDex}`;
    const cached = getCached(key);
    if (cached) return normalizeSpeciesData(cached, safeDex);

    const raw = await fetchJson(`/pokemon/${safeDex}`);
    const statMap = Object.fromEntries(
      (raw.stats || []).map(entry => [entry.stat?.name, Number(entry.base_stat) || 1]),
    );
    const moveLevels = new Map();
    (raw.moves || []).forEach(entry => {
      const name = entry.move?.name;
      const level = moveLevelForVersion(entry);
      if (!name || level == null) return;
      const previous = moveLevels.get(name);
      if (previous == null || level < previous) moveLevels.set(name, level);
    });
    const compact = normalizeSpeciesData({
      abilities: (raw.abilities || []).map(entry => ({
        hidden: entry.is_hidden === true,
        name: entry.ability?.name,
      })),
      baseExperience: raw.base_experience || 64,
      dexNumber: raw.id,
      moveLearnset: [...moveLevels.entries()]
        .map(([name, level]) => ({ level, name }))
        .sort((first, second) => first.level - second.level || first.name.localeCompare(second.name)),
      name: prettyName(raw.name),
      source: 'official',
      stats: {
        attack: statMap.attack,
        defense: statMap.defense,
        hp: statMap.hp,
        specialAttack: statMap['special-attack'],
        specialDefense: statMap['special-defense'],
        speed: statMap.speed,
      },
      types: (raw.types || [])
        .sort((first, second) => first.slot - second.slot)
        .map(entry => entry.type?.name),
    }, safeDex);
    setCached(key, compact);
    return compact;
  }

  function normalizeMoveData(value, fallbackName = 'investida') {
    const source = value && typeof value === 'object' ? value : {};
    return {
      accuracy: source.accuracy == null ? 100 : clamp(source.accuracy, 1, 100),
      ailment: String(source.ailment || 'none'),
      ailmentChance: clamp(source.ailmentChance, 0, 100),
      category: ['physical', 'special', 'status'].includes(source.category)
        ? source.category
        : 'physical',
      drain: clamp(source.drain, -100, 100),
      healing: clamp(source.healing, 0, 100),
      id: String(source.id || fallbackName).toLowerCase(),
      name: String(source.name || fallbackName),
      power: clamp(source.power || (source.category === 'status' ? 0 : 40), 0, 250),
      priority: clamp(source.priority, -7, 7),
      statChanges: Array.isArray(source.statChanges)
        ? source.statChanges.slice(0, 4).map(change => ({
            change: clamp(change && change.change, -6, 6),
            stat: String(change && change.stat || ''),
          })).filter(change => change.stat && change.change)
        : [],
      type: String(source.type || 'normal'),
    };
  }

  async function loadMoveData(name) {
    const safeName = String(name || 'tackle').toLowerCase();
    const key = `move:${safeName}`;
    const cached = getCached(key);
    if (cached) return normalizeMoveData(cached, safeName);

    const raw = await fetchJson(`/move/${encodeURIComponent(safeName)}`);
    const localizedName = (raw.names || []).find(entry => entry.language?.name === 'en')?.name;
    const compact = normalizeMoveData({
      accuracy: raw.accuracy,
      ailment: raw.meta?.ailment?.name,
      ailmentChance: raw.meta?.ailment_chance,
      category: raw.damage_class?.name,
      drain: raw.meta?.drain,
      healing: raw.meta?.healing,
      id: raw.name,
      name: localizedName || prettyName(raw.name),
      power: raw.power,
      priority: raw.priority,
      statChanges: (raw.stat_changes || []).map(change => ({
        change: change.change,
        stat: change.stat?.name,
      })),
      type: raw.type?.name,
    }, safeName);
    setCached(key, compact);
    return compact;
  }

  function fallbackMove() {
    return normalizeMoveData({
      accuracy: 100,
      category: 'physical',
      id: 'tackle',
      name: 'Investida',
      power: 40,
      priority: 0,
      type: 'normal',
    });
  }

  function totalAttributePoints(level) {
    return Math.max(0, normalizedBattleLevel(level) - 1);
  }

  function normalizeAttributes(value, level) {
    const source = value && typeof value === 'object' ? value : {};
    const attributes = Object.fromEntries(
      ATTRIBUTE_KEYS.map(key => [key, normalizedPointValue(source[key])]),
    );
    let remaining = totalAttributePoints(level);
    ATTRIBUTE_KEYS.forEach(key => {
      attributes[key] = Math.min(attributes[key], remaining);
      remaining -= attributes[key];
    });
    return attributes;
  }

  function ensureBattleProgress(pet) {
    const source = pet.battle && typeof pet.battle === 'object' ? pet.battle : {};
    const attributes = normalizeAttributes(source.attributes, pet.level);
    pet.battle = {
      activeAbility: typeof source.activeAbility === 'string' ? source.activeAbility : null,
      attributes,
      battleHistory: Array.isArray(source.battleHistory) ? source.battleHistory.slice(0, 12) : [],
      currentHp: source.currentHp == null
        ? null
        : Number.isFinite(Number(source.currentHp))
          ? Math.max(0, Math.round(Number(source.currentHp)))
          : null,
      equippedMoves: Array.isArray(source.equippedMoves)
        ? source.equippedMoves.map(canonicalMoveId).filter(Boolean).slice(0, 4)
        : [],
      journeyMoveLearnsets: source.journeyMoveLearnsets && typeof source.journeyMoveLearnsets === 'object'
        ? source.journeyMoveLearnsets
        : {},
      lastMaxHp: source.lastMaxHp == null
        ? null
        : Number.isFinite(Number(source.lastMaxHp))
          ? Math.max(1, Math.round(Number(source.lastMaxHp)))
          : null,
      moveDetails: source.moveDetails && typeof source.moveDetails === 'object'
        ? source.moveDetails
        : {},
      rewardCycle: source.rewardCycle && typeof source.rewardCycle === 'object'
        ? {
            battles: normalizedPointValue(source.rewardCycle.battles),
            day: typeof source.rewardCycle.day === 'string' ? source.rewardCycle.day.slice(0, 10) : '',
          }
        : { battles: 0, day: '' },
      speciesData: source.speciesData && typeof source.speciesData === 'object'
        ? source.speciesData
        : null,
    };
    return pet.battle;
  }

  function calculatedStats(level, attributes, speciesData) {
    const safeLevel = normalizedBattleLevel(level);
    const base = speciesData.stats;
    return {
      attack: Math.round(base.attack / 5 + safeLevel + attributes.attack * 2),
      defense: Math.round(base.defense / 5 + safeLevel + attributes.defense * 2),
      maxHp: Math.round(30 + base.hp / 2 + safeLevel * 4 + attributes.vitality * 5),
      specialAttack: Math.round(base.specialAttack / 5 + safeLevel + attributes.attack * 2),
      specialDefense: Math.round(base.specialDefense / 5 + safeLevel + attributes.defense * 2),
      speed: Math.round(base.speed / 5 + safeLevel * 0.8 + attributes.speed * 2),
    };
  }

  function getSnapshot(pet, dexNumber, speciesName = pet.customName) {
    const battle = ensureBattleProgress(pet);
    const stored = battle.speciesData && Number(battle.speciesData.dexNumber) === Number(dexNumber)
      ? normalizeSpeciesData(battle.speciesData, dexNumber, speciesName)
      : normalizeSpeciesData(null, dexNumber, speciesName);
    const stats = calculatedStats(pet.level, battle.attributes, stored);
    const previousMax = battle.lastMaxHp;
    if (battle.currentHp == null) {
      battle.currentHp = stats.maxHp;
    } else if (previousMax && stats.maxHp !== previousMax) {
      battle.currentHp = Math.min(
        stats.maxHp,
        Math.round(battle.currentHp / Math.max(1, previousMax) * stats.maxHp),
      );
    } else {
      battle.currentHp = Math.min(stats.maxHp, battle.currentHp);
    }
    battle.lastMaxHp = stats.maxHp;
    const spentPoints = ATTRIBUTE_KEYS.reduce((total, key) => total + battle.attributes[key], 0);
    return {
      abilities: stored.abilities,
      attributes: { ...battle.attributes },
      availablePoints: Math.max(0, totalAttributePoints(pet.level) - spentPoints),
      currentHp: Math.max(0, Math.round(battle.currentHp)),
      dataReady: Boolean(battle.speciesData && Number(battle.speciesData.dexNumber) === Number(dexNumber)),
      dataSource: stored.source,
      equippedMoves: [...battle.equippedMoves],
      maxHp: stats.maxHp,
      speciesData: stored,
      stats,
      totalPoints: totalAttributePoints(pet.level),
      types: stored.types,
    };
  }

  async function hydrate(pet, dexNumber, speciesName = pet.customName) {
    let data;
    try {
      data = await loadPokemonData(dexNumber);
    } catch {
      data = normalizeSpeciesData(null, dexNumber, speciesName);
    }
    const battle = ensureBattleProgress(pet);
    battle.speciesData = data;
    battle.journeyMoveLearnsets[String(dexNumber)] = data.moveLearnset;
    return getSnapshot(pet, dexNumber, speciesName);
  }

  function getMoveCatalog(pet, dexNumber, speciesName = pet.customName) {
    const snapshot = getSnapshot(pet, dexNumber, speciesName);
    const battle = ensureBattleProgress(pet);
    const learnsets = [
      snapshot.speciesData.moveLearnset,
      ...Object.values(battle.journeyMoveLearnsets),
    ].filter(Array.isArray);
    const levelsByMove = new Map();

    learnsets.flat().forEach(move => {
      if (!move?.name) return;
      const level = Math.max(1, Number(move.level) || 1);
      const previous = levelsByMove.get(move.name);
      if (previous == null || level < previous) levelsByMove.set(move.name, level);
    });

    if (!levelsByMove.size) levelsByMove.set('tackle', 1);

    return [...levelsByMove.entries()]
      .map(([id, level]) => {
        const detail = normalizeMoveData(battle.moveDetails[id], id);
        return {
          ...detail,
          id,
          learned: level <= pet.level,
          level,
          name: prettyName(id),
        };
      })
      .sort((first, second) => (
        Number(second.learned) - Number(first.learned)
        || first.level - second.level
        || first.name.localeCompare(second.name)
      ));
  }

  async function hydrateJourney(
    pet,
    dexNumbers,
    activeDexNumber,
    speciesName = pet.customName,
  ) {
    const uniqueDexNumbers = [...new Set(
      (Array.isArray(dexNumbers) ? dexNumbers : [activeDexNumber])
        .map(Number)
        .filter(Number.isInteger),
    )];
    const battle = ensureBattleProgress(pet);
    const loaded = await Promise.all(uniqueDexNumbers.map(async dexNumber => {
      try {
        return await loadPokemonData(dexNumber);
      } catch {
        return normalizeSpeciesData(null, dexNumber, speciesName);
      }
    }));

    loaded.forEach(data => {
      battle.journeyMoveLearnsets[String(data.dexNumber)] = data.moveLearnset;
      if (Number(data.dexNumber) === Number(activeDexNumber)) {
        battle.speciesData = data;
      }
    });

    const moveIds = getMoveCatalog(pet, activeDexNumber, speciesName)
      .filter(move => move.learned || move.level <= pet.level + 20)
      .slice(0, 36)
      .map(move => move.id);
    const moveDetails = await Promise.all(moveIds.map(async moveId => {
      try {
        return await loadMoveData(moveId);
      } catch {
        return normalizeMoveData(null, moveId);
      }
    }));
    moveDetails.forEach(detail => {
      battle.moveDetails[detail.id] = detail;
    });

    return getSnapshot(pet, activeDexNumber, speciesName);
  }

  function allocateAttribute(pet, dexNumber, attribute, speciesName = pet.customName) {
    if (!ATTRIBUTE_KEYS.includes(attribute)) return null;
    const before = getSnapshot(pet, dexNumber, speciesName);
    if (before.availablePoints <= 0) return null;
    pet.battle.attributes[attribute] += 1;
    return getSnapshot(pet, dexNumber, speciesName);
  }

  function resetAttributes(pet, dexNumber, speciesName = pet.customName) {
    const battle = ensureBattleProgress(pet);
    const refundedPoints = ATTRIBUTE_KEYS.reduce(
      (total, key) => total + battle.attributes[key],
      0,
    );
    battle.attributes = { attack: 0, defense: 0, speed: 0, vitality: 0 };
    return {
      refundedPoints,
      snapshot: getSnapshot(pet, dexNumber, speciesName),
    };
  }

  function restoreHp(pet, ratio = 0.25) {
    const battle = ensureBattleProgress(pet);
    if (!battle.lastMaxHp || battle.currentHp == null) return 0;
    const amount = ratio <= 1
      ? Math.max(1, Math.round(battle.lastMaxHp * ratio))
      : Math.round(ratio);
    const previous = battle.currentHp;
    battle.currentHp = Math.min(battle.lastMaxHp, battle.currentHp + amount);
    return battle.currentHp - previous;
  }

  function energyMultiplier(energy) {
    if (energy >= 70) return 1;
    if (energy >= 40) return 0.95;
    if (energy >= 20) return 0.85;
    return 0;
  }

  function typeMultiplier(attackType, defenderTypes) {
    return (defenderTypes || []).reduce(
      (multiplier, type) => multiplier * (TYPE_EFFECTIVENESS[attackType]?.[type] ?? 1),
      1,
    );
  }

  function combatPower(participant) {
    return Math.round(
      participant.maxHp / 4
      + Math.max(participant.attack, participant.specialAttack)
      + (participant.defense + participant.specialDefense) / 2
      + participant.speed,
    );
  }

  function balanceTrainingOpponent(participant, player, region) {
    const regionMinimumLevel = normalizedBattleLevel(region?.levelMin || 1);
    if (player.level < regionMinimumLevel) {
      return participant;
    }
    const levelGap = Math.max(0, player.level - Math.max(1, Number(region?.levelMax) || player.level));
    const targetRatio = clampFloat(
      (Number(region?.powerRatio) || 0.9) - levelGap * 0.012,
      0.35,
      1.05,
    );
    participant.maxHp = Math.max(10, Math.round(player.maxHp * targetRatio));
    participant.hp = participant.maxHp;
    const statScale = clampFloat(
      (combatPower(player) * targetRatio) / Math.max(1, combatPower(participant)),
      0.55,
      1.55,
    );
    ['attack', 'specialAttack', 'defense', 'specialDefense', 'speed'].forEach(stat => {
      participant[stat] = Math.max(1, Math.round(participant[stat] * statScale));
    });
    return participant;
  }

  function enemyAttributes(level, data) {
    const points = totalAttributePoints(level);
    const attributes = { attack: 0, defense: 0, speed: 0, vitality: 0 };
    const preference = [
      [Math.max(data.stats.attack, data.stats.specialAttack), 'attack'],
      [data.stats.speed, 'speed'],
      [Math.max(data.stats.defense, data.stats.specialDefense), 'defense'],
      [data.stats.hp, 'vitality'],
    ].sort((first, second) => second[0] - first[0]).map(entry => entry[1]);
    const pointsPerAttribute = Math.floor(points / ATTRIBUTE_KEYS.length);
    const remainingPoints = points % ATTRIBUTE_KEYS.length;
    preference.forEach((key, index) => {
      attributes[key] = pointsPerAttribute + (index < remainingPoints ? 1 : 0);
    });
    return attributes;
  }

  function participantFrom(data, level, attributes, options = {}) {
    const stats = calculatedStats(level, attributes, data);
    return {
      ...stats,
      baseExperience: data.baseExperience,
      bond: clamp(options.bond),
      buffs: { attack: 0, defense: 0, speed: 0 },
      energy: clamp(options.energy ?? 100),
      guard: false,
      happiness: clamp(options.happiness ?? 50),
      hp: clamp(options.currentHp ?? stats.maxHp, 0, stats.maxHp),
      level: normalizedBattleLevel(level),
      maxHp: stats.maxHp,
      moves: options.moves || [],
      name: options.name || data.name,
      speciesData: data,
      status: null,
      types: data.types,
      visual: options.visual,
    };
  }

  function stageMultiplier(stage) {
    return Math.max(0.55, 1 + clamp(stage, -3, 3) * 0.15);
  }

  function moveCandidates(data, level) {
    return data.moveLearnset
      .filter(move => move.level <= level)
      .sort((first, second) => second.level - first.level);
  }

  async function prepareMoves(data, level, preferredMoves = [], options = {}) {
    const candidates = moveCandidates(data, level);
    const candidateNames = new Set(candidates.map(move => move.name));
    const validPreferredMoves = preferredMoves
      .map(canonicalMoveId)
      .filter((name, index, names) => (
        candidateNames.has(name)
        && names.indexOf(name) === index
      ))
      .slice(0, 4);
    const exactSelection = options.exact === true && validPreferredMoves.length > 0;
    const orderedNames = (exactSelection
      ? validPreferredMoves
      : [...validPreferredMoves, ...candidates.map(move => move.name)]
    ).filter((name, index, names) => name && names.indexOf(name) === index);
    const selectedNames = orderedNames.slice(0, exactSelection ? 4 : 10);
    const details = await Promise.all(selectedNames.map(async name => {
      try {
        return await loadMoveData(name);
      } catch {
        return normalizeMoveData(null, name);
      }
    }));
    const detailById = new Map(details.map(move => [move.id, move]));
    const preferred = validPreferredMoves
      .map(name => detailById.get(name))
      .filter(Boolean);
    if (exactSelection && preferred.length) return preferred;
    const remaining = details.filter(move => !validPreferredMoves.includes(move.id));
    const damaging = remaining.filter(move => move.power > 0);
    const status = remaining.filter(move => move.power <= 0);
    const chosen = [
      ...preferred,
      ...damaging.slice(0, 3),
      ...status.slice(0, 1),
      ...damaging.slice(3),
      ...status.slice(1),
    ].filter((move, index, moves) => moves.findIndex(candidate => candidate.id === move.id) === index)
      .slice(0, 4);
    while (chosen.length < 4) chosen.push(fallbackMove());
    return chosen;
  }

  function getLearnedMoves(pet, dexNumber, speciesName = pet.customName) {
    const learned = getMoveCatalog(pet, dexNumber, speciesName)
      .filter(move => move.learned);
    return learned.length
      ? learned
      : [{ id: 'tackle', level: 1, name: 'Investida' }];
  }

  function setEquippedMoves(pet, dexNumber, moveIds, speciesName = pet.customName) {
    const learned = getLearnedMoves(pet, dexNumber, speciesName);
    const allowedIds = new Set(learned.map(move => move.id));
    const selected = (Array.isArray(moveIds) ? moveIds : [])
      .map(canonicalMoveId)
      .filter((move, index, moves) => allowedIds.has(move) && moves.indexOf(move) === index)
      .slice(0, 4);
    if (selected.length < 1) return null;
    const battle = ensureBattleProgress(pet);
    battle.equippedMoves = selected;
    return getSnapshot(pet, dexNumber, speciesName);
  }

  function sampleCatalog(catalog, excludedDex, count = 5) {
    const pool = (catalog || [])
      .filter(entry => Number.isInteger(Number(entry.dexNumber)))
      .filter(entry => Number(entry.dexNumber) >= 1 && Number(entry.dexNumber) <= 1025)
      .filter(entry => Number(entry.dexNumber) !== Number(excludedDex))
      .filter((entry, index, entries) => entries.findIndex(candidate => Number(candidate.dexNumber) === Number(entry.dexNumber)) === index);
    const sampled = [];
    while (pool.length && sampled.length < count) {
      const index = Math.floor(Math.random() * pool.length);
      sampled.push(pool.splice(index, 1)[0]);
    }
    return sampled;
  }

  function findVisualForDex(catalog, dexNumber) {
    return (catalog || []).find(entry => Number(entry.dexNumber) === Number(dexNumber)) || null;
  }

  function backSpriteUrl(source) {
    return String(source || '')
      .replace('/Front%20shiny/', '/Back%20shiny/')
      .replace('/Front shiny/', '/Back shiny/')
      .replace('/Front/', '/Back/');
  }

  function loadImageDimensions(source) {
    return new Promise(resolve => {
      const image = new Image();
      const timeout = setTimeout(() => resolve(null), 2500);
      image.onload = () => {
        clearTimeout(timeout);
        resolve({
          height: Math.max(1, image.naturalHeight),
          width: Math.max(1, image.naturalWidth),
        });
      };
      image.onerror = () => {
        clearTimeout(timeout);
        resolve(null);
      };
      image.src = source;
    });
  }

  async function playerBattleVisual(visual) {
    const frontSource = visual?.sprite?.src || visual?.img;
    const backSource = backSpriteUrl(frontSource);
    if (!frontSource || backSource === frontSource) {
      return { ...visual, battleFacing: 'front' };
    }

    const dimensions = await loadImageDimensions(backSource);
    if (!dimensions) return { ...visual, battleFacing: 'front' };
    if (!visual.sprite) {
      return { ...visual, battleFacing: 'back', img: backSource };
    }

    const frameSize = dimensions.height;
    const exactFrames = dimensions.width / frameSize;
    const frames = Number.isInteger(exactFrames) && exactFrames > 0
      ? exactFrames
      : Math.max(1, Number(visual.sprite.frames) || 1);
    return {
      ...visual,
      battleFacing: 'back',
      img: backSource,
      sprite: {
        ...visual.sprite,
        frameHeight: frameSize,
        frameWidth: frameSize,
        frames,
        sheetWidth: dimensions.width,
        src: backSource,
      },
    };
  }

  async function chooseOpponent(config, player) {
    if (
      config.opponent
      && Number.isInteger(Number(config.opponent.dexNumber))
      && Number.isInteger(Number(config.opponent.level))
    ) {
      const dexNumber = clamp(Number(config.opponent.dexNumber), 1, 1025);
      const level = normalizedBattleLevel(config.opponent.level);
      const visual = config.opponent.visual || findVisualForDex(config.dexCatalog, dexNumber);
      const data = await loadPokemonData(dexNumber);
      const attributes = enemyAttributes(level, data);
      const participant = participantFrom(data, level, attributes, {
        currentHp: config.opponent.currentHp,
        energy: 100,
        happiness: 50,
        name: visual?.name || data.name,
        visual,
      });
      return {
        attributes,
        data,
        level,
        participant,
        ratio: combatPower(participant) / Math.max(1, combatPower(player)),
        visual,
      };
    }

    const dynamicEncounter = config.region?.dynamic === true;
    const regionalCatalog = Array.isArray(config.region?.dexIds)
      ? config.region.dexIds
          .map(dexNumber => findVisualForDex(config.dexCatalog, dexNumber))
          .filter(Boolean)
      : [];
    const rareCatalog = Array.isArray(config.region?.rareDexIds)
      ? config.region.rareDexIds
          .map(dexNumber => findVisualForDex(config.dexCatalog, dexNumber))
          .filter(Boolean)
      : [];
    const rareEncounter = dynamicEncounter
      && rareCatalog.length > 0
      && Math.random() < clampFloat(Number(config.region?.rareChance) || 0, 0, 0.25);
    const encounterCatalog = rareEncounter
      ? rareCatalog
      : regionalCatalog.length
        ? regionalCatalog
        : config.dexCatalog;
    const candidates = sampleCatalog(
      encounterCatalog,
      player.speciesData.dexNumber,
      7,
    );
    const dynamicSpread = Math.max(1, Math.round(Number(config.region?.levelSpread) || 10));
    const levelMin = dynamicEncounter
      ? Math.max(1, normalizedBattleLevel(player.level) - dynamicSpread)
      : normalizedBattleLevel(config.region?.levelMin || 1);
    const hasLevelCeiling = Number.isFinite(Number(config.region?.levelMax))
      && Number(config.region.levelMax) >= levelMin;
    const levelMax = dynamicEncounter
      ? normalizedBattleLevel(player.level) + dynamicSpread
      : hasLevelCeiling
        ? normalizedBattleLevel(config.region.levelMax)
        : Math.max(levelMin, normalizedBattleLevel(player.level) + 1);
    const targetLevel = clamp(player.level, levelMin, levelMax);
    const levelSpread = dynamicEncounter ? dynamicSpread : 1;
    const loaded = await Promise.allSettled(candidates.map(async visual => ({
      data: await loadPokemonData(visual.dexNumber),
      level: clamp(
        targetLevel + Math.floor(Math.random() * (levelSpread * 2 + 1)) - levelSpread,
        levelMin,
        levelMax,
      ),
      visual,
    })));
    const prepared = loaded
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value);
    if (!prepared.length) {
      const visual = candidates[0] || findVisualForDex(config.dexCatalog, player.speciesData.dexNumber === 1 ? 4 : 1);
      const dexNumber = visual?.dexNumber || 1;
      prepared.push({
        data: normalizeSpeciesData(null, dexNumber, visual?.name || 'Pokémon selvagem'),
        level: targetLevel,
        visual,
      });
    }
    const playerPower = combatPower(player);
    const ranked = prepared.map(candidate => {
      const attributes = enemyAttributes(candidate.level, candidate.data);
      const participant = participantFrom(candidate.data, candidate.level, attributes, {
        energy: 100,
        happiness: 50,
        name: candidate.visual?.name || candidate.data.name,
        visual: candidate.visual,
      });
      const ratio = combatPower(participant) / Math.max(1, playerPower);
      return { ...candidate, attributes, participant, ratio };
    }).sort((first, second) => {
      const firstInRange = first.ratio >= 0.95 && first.ratio <= 1.05;
      const secondInRange = second.ratio >= 0.95 && second.ratio <= 1.05;
      if (firstInRange !== secondInRange) return firstInRange ? -1 : 1;
      return Math.abs(first.ratio - 1) - Math.abs(second.ratio - 1);
    });
    const chosen = dynamicEncounter
      ? ranked[Math.floor(Math.random() * ranked.length)]
      : ranked[0];
    if (!dynamicEncounter) balanceTrainingOpponent(chosen.participant, player, config.region);
    chosen.ratio = combatPower(chosen.participant) / Math.max(1, playerPower);
    return chosen;
  }

  function spriteMarkup(visual, className, label) {
    if (visual?.sprite) {
      const sprite = visual.sprite;
      const maxFrame = Math.max(sprite.frameWidth, sprite.frameHeight);
      const scale = Math.max(2, Math.min(5, Math.round(126 / maxFrame)));
      const style = [
        `--battle-sprite-url:url(${sprite.src})`,
        `--battle-frame-width:${sprite.frameWidth * scale}px`,
        `--battle-frame-height:${sprite.frameHeight * scale}px`,
        `--battle-sheet-width:${sprite.sheetWidth * scale}px`,
        `--battle-sheet-shift:-${sprite.sheetWidth * scale}px`,
        `--battle-frames:${Math.max(1, sprite.frames)}`,
        `animation-timing-function:steps(${Math.max(1, Math.round(sprite.frames))})`,
      ].join(';');
      return `<span class="battle-sprite ${className}" style="${style}" role="img" aria-label="${escapeHtml(label)}"></span>`;
    }
    return `<img class="battle-image ${className}" src="${escapeHtml(visual?.img || '')}" alt="${escapeHtml(label)}">`;
  }

  function hpPlate(participant, side) {
    const percent = clamp((participant.hp / Math.max(1, participant.maxHp)) * 100);
    const stateClass = percent <= 20 ? 'danger' : percent <= 50 ? 'warning' : '';
    return `
      <section class="battle-nameplate ${side}" aria-label="${escapeHtml(participant.name)}, nível ${participant.level}, ${participant.hp} de ${participant.maxHp} pontos de vida">
        <div class="battle-name-row">
          <b>${escapeHtml(participant.name)}</b>
          ${participant.status ? `<em class="battle-condition ${STATUS_CONDITIONS[participant.status.id]?.className || ''}">${STATUS_CONDITIONS[participant.status.id]?.label || 'STA'}</em>` : ''}
          <span>Nv. ${participant.level}</span>
        </div>
        <div class="battle-hp-row">
          <small>HP</small>
          <div class="battle-hp-track ${stateClass}"><i style="--battle-hp-scale:${percent / 100}"></i></div>
        </div>
        <span class="battle-hp-number">${participant.hp}/${participant.maxHp}</span>
      </section>`;
  }

  function moveButton(move, index) {
    const power = move.power > 0 ? `Poder ${move.power}` : 'Efeito';
    const textbox = TYPE_TEXTBOXES[move.type] ?? TYPE_TEXTBOXES.normal;
    const disabled = session?.phase !== 'choice';
    return `
      <button
        class="battle-move type-${escapeHtml(move.type)}"
        style="--battle-move-box:url('assets/textboxes/${textbox}.png')"
        type="button"
        data-battle-move="${index}"
        ${disabled ? 'disabled aria-disabled="true"' : ''}
      >
        <b>${escapeHtml(move.name)}</b>
        <span>${escapeHtml(typeLabel(move.type))} · ${power}</span>
      </button>`;
  }

  function loadingMarkup() {
    const regionName = session.config.region?.name || 'Treino de batalha';
    return `
      <section class="battle-app" role="dialog" aria-modal="true" aria-label="Preparando batalha">
        <header class="battle-topbar">
          <div><small>${escapeHtml(regionName)}</small><h1>Procurando adversário</h1></div>
          <span class="battle-source">PokéAPI</span>
        </header>
        <main class="battle-loading">
          <span class="battle-loading-ball" aria-hidden="true"><i></i></span>
          <b>Procurando um adversário da região...</b>
          <p>Os dados oficiais ficam salvos em cache para as próximas batalhas.</p>
        </main>
        <footer class="battle-footer">
          <button type="button" data-battle-exit>Voltar ao Tamagotchi</button>
        </footer>
      </section>`;
  }

  function errorMarkup(message) {
    return `
      <section class="battle-app" role="dialog" aria-modal="true" aria-label="Batalha indisponível">
        <header class="battle-topbar">
          <div><small>Treino de batalha</small><h1>A batalha não começou</h1></div>
        </header>
        <main class="battle-message">
          <span aria-hidden="true">!</span>
          <b>${escapeHtml(message)}</b>
          <p>Cuide do companheiro e tente novamente quando ele estiver pronto.</p>
        </main>
        <footer class="battle-footer">
          <button type="button" data-battle-exit>Voltar ao Tamagotchi</button>
        </footer>
      </section>`;
  }

  function resultMarkup() {
    const result = session.result;
    const victory = result.outcome === 'victory';
    const title = victory ? 'Vitória!' : result.outcome === 'defeat' ? 'O Pokémon desmaiou' : 'Batalha encerrada';
    const symbol = victory ? '★' : result.outcome === 'defeat' ? '!' : '↩';
    return `
      <section class="battle-app" role="dialog" aria-modal="true" aria-label="Resultado da batalha">
        <header class="battle-topbar">
          <div><small>${escapeHtml(session.config.region?.name || 'Resultado do treino')}</small><h1>${title}</h1></div>
          <span class="battle-source">${escapeHtml(session.enemy.name)}</span>
        </header>
        <main class="battle-result ${result.outcome}">
          <span class="battle-result-symbol" aria-hidden="true">${symbol}</span>
          <h2>${escapeHtml(result.summary)}</h2>
          <div class="battle-rewards">
            <span>
              <small>Experiência${result.rewardMultiplier < 1 ? ` · ${Math.round(result.rewardMultiplier * 100)}%` : ''}</small>
              <b>+${result.xp} XP</b>
            </span>
            <span><small>HP restante</small><b>${session.player.hp}/${session.player.maxHp}</b></span>
          </div>
          <p>${result.note}${result.rewardLabel ? ` ${escapeHtml(result.rewardLabel)}` : ''}</p>
        </main>
        <footer class="battle-footer">
          <button class="primary" type="button" data-battle-exit>Voltar ao Tamagotchi</button>
        </footer>
      </section>`;
  }

  function battleMarkup() {
    const player = session.player;
    const enemy = session.enemy;
    const resolving = session.phase === 'resolving';
    const returningControl = session.fieldMessageKind === 'ready';
    const fieldStyle = battlefieldStyle(session.scene);
    const latestLog = session.log.at(-1) || `Um ${enemy.name} selvagem apareceu!`;
    const previousLog = session.log.at(-2);
    return `
      <section class="battle-app" role="dialog" aria-modal="true" aria-label="Batalha entre ${escapeHtml(player.name)} e ${escapeHtml(enemy.name)}">
        <header class="battle-topbar compact">
          <div><small>${escapeHtml(session.config.region?.name || 'Treino de batalha')}</small><h1>${escapeHtml(player.name)} × ${escapeHtml(enemy.name)}</h1></div>
          <span class="battle-turn">Turno ${session.turn}</span>
        </header>
        <main class="battle-main">
          <section
            class="battlefield phase-${session.scene.phase} ${resolving ? 'resolving' : ''}"
            style="${fieldStyle}"
          >
            ${hpPlate(enemy, 'enemy')}
            <div class="battle-platform enemy-platform"></div>
            <div class="battle-pokemon enemy-pokemon ${session.animation === 'enemy-hit' ? 'is-hit' : ''} ${session.attackingSide === 'enemy' ? 'is-attacking' : ''}">
              ${spriteMarkup(enemy.visual, 'enemy-sprite', enemy.name)}
            </div>
            ${hpPlate(player, 'player')}
            <div class="battle-platform player-platform"></div>
            <div class="battle-pokemon player-pokemon uses-${player.visual?.battleFacing === 'back' ? 'back' : 'front'}-sprite ${session.animation === 'player-hit' ? 'is-hit' : ''} ${session.attackingSide === 'player' ? 'is-attacking' : ''}">
              ${spriteMarkup(player.visual, 'player-sprite', player.name)}
            </div>
            ${session.fieldMessage ? `
              <div
                class="battle-field-notice ${escapeHtml(session.fieldMessageKind || 'move')} side-${escapeHtml(session.fieldMessageSide || 'player')}"
                role="status"
                aria-live="polite"
              >${escapeHtml(session.fieldMessage)}</div>
            ` : ''}
            <div class="battle-log" aria-live="polite" aria-atomic="true">
              <b>${escapeHtml(latestLog)}</b>
              ${previousLog ? `<span>${escapeHtml(previousLog)}</span>` : ''}
            </div>
          </section>
          <section class="battle-command" aria-label="Escolha um golpe">
            <div class="battle-command-copy">
              <b>${resolving
                ? returningControl
                  ? 'Prepare seu próximo golpe'
                  : 'A batalha está respondendo...'
                : `O que ${escapeHtml(player.name)} fará?`}</b>
              <span>${resolving
                ? returningControl
                  ? 'As habilidades serão liberadas em instantes.'
                  : 'As habilidades ficam bloqueadas durante os ataques.'
                : 'Escolha uma das quatro habilidades.'}</span>
            </div>
            <div class="battle-moves">
              ${player.moves.map(moveButton).join('')}
            </div>
          </section>
        </main>
        <footer class="battle-footer">
          <button type="button" data-battle-exit>${resolving ? 'Aguarde...' : 'Fugir e voltar'}</button>
        </footer>
      </section>`;
  }

  function render() {
    if (!host) return;
    if (!session) {
      host.innerHTML = '';
      host.classList.remove('open');
      return;
    }
    host.classList.add('open');
    if (session.phase === 'loading') host.innerHTML = loadingMarkup();
    else if (session.phase === 'error') host.innerHTML = errorMarkup(session.error);
    else if (session.phase === 'result') host.innerHTML = resultMarkup();
    else host.innerHTML = battleMarkup();
    bind();
  }

  function applyStatChange(participant, stat, change) {
    const key = stat === 'speed'
      ? 'speed'
      : stat === 'defense' || stat === 'special-defense'
        ? 'defense'
        : 'attack';
    participant.buffs[key] = clamp(participant.buffs[key] + Math.sign(change), -3, 3);
    return `${ATTRIBUTE_LABELS[key] || prettyName(key)} ${change > 0 ? 'aumentou' : 'diminuiu'}`;
  }

  function statusImmunity(participant, ailment) {
    if (ailment === 'burn') return participant.types.includes('fire');
    if (ailment === 'freeze') return participant.types.includes('ice');
    if (ailment === 'paralysis') return participant.types.includes('electric');
    if (ailment === 'poison') {
      return participant.types.includes('poison') || participant.types.includes('steel');
    }
    return false;
  }

  function applyAilment(target, move, guaranteed = false) {
    const ailment = String(move.ailment || 'none');
    if (!STATUS_CONDITIONS[ailment] || target.status) return '';
    const chance = guaranteed
      ? (move.ailmentChance > 0 ? move.ailmentChance : 100)
      : move.ailmentChance;
    if (chance <= 0 || Math.random() * 100 >= chance) return '';
    if (statusImmunity(target, ailment)) {
      return `${target.name} é imune a ${STATUS_CONDITIONS[ailment].name}.`;
    }
    target.status = {
      id: ailment,
      turns: ailment === 'sleep'
        ? 2 + Math.floor(Math.random() * 2)
        : ailment === 'confusion'
          ? 2 + Math.floor(Math.random() * 3)
          : 0,
    };
    const messages = {
      burn: `${target.name} sofreu uma queimadura!`,
      confusion: `${target.name} ficou confuso!`,
      freeze: `${target.name} foi congelado!`,
      paralysis: `${target.name} ficou paralisado!`,
      poison: `${target.name} foi envenenado!`,
      sleep: `${target.name} adormeceu!`,
    };
    return messages[ailment];
  }

  function statusActionCheck(participant) {
    const status = participant.status;
    if (!status) return { canAct: true, message: '' };
    if (status.id === 'sleep') {
      status.turns -= 1;
      if (status.turns <= 0) {
        participant.status = null;
        return { canAct: true, message: `${participant.name} acordou!` };
      }
      return { canAct: false, message: `${participant.name} está dormindo.` };
    }
    if (status.id === 'freeze') {
      if (Math.random() < 0.2) {
        participant.status = null;
        return { canAct: true, message: `${participant.name} descongelou!` };
      }
      return { canAct: false, message: `${participant.name} está congelado.` };
    }
    if (status.id === 'paralysis' && Math.random() < 0.25) {
      return { canAct: false, message: `${participant.name} está paralisado e não conseguiu agir.` };
    }
    if (status.id === 'confusion') {
      status.turns -= 1;
      if (status.turns <= 0) {
        participant.status = null;
        return { canAct: true, message: `${participant.name} recuperou os sentidos.` };
      }
      if (Math.random() < 1 / 3) {
        const damage = Math.max(1, Math.round(participant.maxHp / 12));
        participant.hp = Math.max(0, participant.hp - damage);
        return {
          canAct: false,
          message: `${participant.name} se machucou na confusão e perdeu ${damage} HP.`,
        };
      }
    }
    return { canAct: true, message: '' };
  }

  function residualStatusDamage(participant) {
    if (!participant.status || !['burn', 'poison'].includes(participant.status.id)) return '';
    const divisor = participant.status.id === 'poison' ? 8 : 16;
    const damage = Math.max(1, Math.round(participant.maxHp / divisor));
    const previousHp = participant.hp;
    participant.hp = Math.max(0, participant.hp - damage);
    if (session && participant === session.enemy) {
      session.damageDealt += previousHp - participant.hp;
    }
    return participant.status.id === 'poison'
      ? `O veneno causou ${damage} de dano em ${participant.name}.`
      : `A queimadura causou ${damage} de dano em ${participant.name}.`;
  }

  function resolveStatusMove(actor, target, move) {
    if (move.healing > 0) {
      const healed = Math.max(1, Math.round(actor.maxHp * Math.min(20, move.healing) / 100));
      const previous = actor.hp;
      actor.hp = Math.min(actor.maxHp, actor.hp + healed);
      return `${actor.name} recuperou ${actor.hp - previous} HP.`;
    }
    if (STATUS_CONDITIONS[move.ailment]) {
      return applyAilment(target, move, true) || `${target.name} não foi afetado.`;
    }
    if (move.statChanges.length) {
      const messages = move.statChanges.map(change => (
        change.change > 0
          ? applyStatChange(actor, change.stat, change.change)
          : applyStatChange(target, change.stat, change.change)
      ));
      return messages.join(' e ') + '.';
    }
    actor.guard = true;
    return `${actor.name} se preparou e reduzirá o próximo dano.`;
  }

  function calculateDamage(actor, target, move) {
    const category = move.category === 'special' ? 'special' : 'physical';
    const attack = category === 'special' ? actor.specialAttack : actor.attack;
    const defense = category === 'special' ? target.specialDefense : target.defense;
    const attackBuff = stageMultiplier(actor.buffs.attack);
    const defenseBuff = stageMultiplier(target.buffs.defense);
    const statRatio = (attack * attackBuff) / Math.max(1, defense * defenseBuff);
    const powerFactor = clampFloat(Math.max(1, move.power) / 60, 0.75, 1.25);
    const levelFactor = clampFloat((actor.level + 10) / Math.max(1, target.level + 10), 0.9, 1.1);
    const stab = actor.types.includes(move.type) ? 1.12 : 1;
    const effectiveness = typeMultiplier(move.type, target.types);
    const criticalChance = 0.05 + actor.happiness / 2000;
    const critical = Math.random() < criticalChance;
    const criticalMultiplier = critical ? 1.5 : 1;
    const bond = 1 + actor.bond / 1000;
    const variation = 0.9 + Math.random() * 0.15;
    const guard = target.guard ? 0.72 : 1;
    target.guard = false;
    const neutralRatio = clampFloat(
      0.19
      * powerFactor
      * Math.sqrt(Math.max(0.25, statRatio))
      * levelFactor
      * stab
      * energyMultiplier(actor.energy)
      * bond
      * variation,
      0.17,
      0.24,
    );
    const matchupMultiplier = effectiveness === 0
      ? 0
      : effectiveness > 1
        ? Math.min(1.8, effectiveness)
        : effectiveness < 1
          ? 0.7
          : 1;
    const trainingIncomingDamage = session
      && actor === session.enemy
      && !session.config.opponent
      ? clampFloat((Number(session.config.region?.powerRatio) || 0.9) * 0.45, 0.34, 0.48)
      : 1;
    const regionalDamageBoost = session
      && actor === session.player
      && !session.config.opponent
      ? clampFloat(
          (Number(session.config.region?.damageBoost) || 1)
          + Math.max(0, actor.level - (Number(session.config.region?.levelMax) || actor.level)) * 0.025,
          1,
          3,
        )
      : 1;
    const damage = effectiveness === 0
      ? 0
      : Math.max(1, Math.round(
          target.maxHp
          * neutralRatio
          * matchupMultiplier
          * criticalMultiplier
          * regionalDamageBoost
          * trainingIncomingDamage
          * guard,
        ));
    return { critical, damage, effectiveness };
  }

  function useMove(actor, target, move, actorSide) {
    if (Math.random() * 100 > move.accuracy) {
      return `${actor.name} usou ${move.name}, mas errou.`;
    }
    if (move.category === 'status' || move.power <= 0) {
      const effect = resolveStatusMove(actor, target, move);
      return `${actor.name} usou ${move.name}. ${effect}`;
    }
    const result = calculateDamage(actor, target, move);
    const previousHp = target.hp;
    target.hp = Math.max(0, target.hp - result.damage);
    const damageDealt = previousHp - target.hp;
    if (actorSide === 'player') session.damageDealt += damageDealt;
    if (result.damage > 0) playBattleSound('hit');
    session.animation = actorSide === 'player' ? 'enemy-hit' : 'player-hit';
    const notes = [];
    if (result.critical) notes.push('Acerto crítico!');
    if (result.effectiveness >= 2) notes.push('Foi super efetivo!');
    if (result.effectiveness > 0 && result.effectiveness < 1) notes.push('Não foi muito efetivo.');
    if (result.effectiveness === 0) notes.push('Não teve efeito.');
    const ailmentMessage = result.damage > 0 ? applyAilment(target, move) : '';
    if (ailmentMessage) notes.push(ailmentMessage);
    return `${actor.name} usou ${move.name} e causou ${result.damage} de dano. ${notes.join(' ')}`.trim();
  }

  function chooseEnemyMove(enemy, player) {
    const healing = enemy.moves.find(move => move.healing > 0);
    if (enemy.hp / enemy.maxHp < 0.3 && healing && Math.random() < 0.25) return healing;
    return [...enemy.moves].sort((first, second) => {
      const firstScore = Math.max(1, first.power) * typeMultiplier(first.type, player.types);
      const secondScore = Math.max(1, second.power) * typeMultiplier(second.type, player.types);
      return secondScore - firstScore + (Math.random() - 0.5) * 16;
    })[0] || fallbackMove();
  }

  function opponentLevelRewardMultiplier(enemyLevel, playerLevel) {
    const enemy = normalizedBattleLevel(enemyLevel);
    const player = normalizedBattleLevel(playerLevel);
    if (enemy >= player) return 1;
    return clampFloat(Math.pow(enemy / Math.max(1, player), 5), 0.02, 1);
  }

  function rewardXp(outcome) {
    const enemy = session.enemy;
    const ratio = combatPower(enemy) / Math.max(1, combatPower(session.player));
    const powerDifficulty = clampFloat(Math.pow(Math.max(0.05, ratio), 0.75), 0.25, 1.5);
    const speciesDifficulty = clampFloat(enemy.baseExperience / 150, 0.85, 1.2);
    const bondBonus = session.player.bond >= 25 ? 1.025 : 1;
    const xpNeeded = Math.max(75, normalizedPointValue(session.config.xpNeeded) || 75);
    const regionMultiplier = clampFloat(Number(session.config.region?.xpMultiplier) || 1, 0.5, 1.25);
    const playerLevel = normalizedBattleLevel(session.player.level);
    const levelRewardMultiplier = opponentLevelRewardMultiplier(enemy.level, playerLevel);
    const progressionScale = clampFloat(Math.pow(playerLevel, -0.16), 0.12, 1);
    const rewardMultiplier = clampFloat(Number(session.config.rewardMultiplier) || 1, 0.08, 1);
    const rewardShare = 0.18
      * progressionScale
      * speciesDifficulty
      * powerDifficulty
      * bondBonus
      * regionMultiplier
      * levelRewardMultiplier;
    const fullVictoryXp = Math.max(6, Math.min(
      Math.round(xpNeeded * 0.18),
      Math.round(xpNeeded * rewardShare),
    ));
    const victoryXp = Math.max(1, Math.round(fullVictoryXp * rewardMultiplier));
    if (outcome === 'victory') return victoryXp;
    if (outcome !== 'defeat') return 0;
    const damageRatio = clampFloat(session.damageDealt / Math.max(1, enemy.maxHp), 0, 1);
    return Math.max(1, Math.round(victoryXp * (0.2 + damageRatio * 0.3)));
  }

  function finishBattle(outcome) {
    if (!session || session.phase === 'result') return;
    if (outcome === 'defeat') session.player.hp = 1;
    if (outcome === 'victory') playBattleSound('victory');
    const xp = rewardXp(outcome);
    const damagePercent = Math.round(clampFloat(
      session.damageDealt / Math.max(1, session.enemy.maxHp),
      0,
      1,
    ) * 100);
    const summary = outcome === 'victory'
      ? `${session.player.name} venceu ${session.enemy.name}!`
      : outcome === 'defeat'
        ? `${session.player.name} precisa descansar.`
        : `${session.player.name} saiu da batalha.`;
    const note = outcome === 'victory'
      ? 'O HP restante foi preservado e o vínculo ficou mais forte.'
      : outcome === 'defeat'
        ? `Você retirou ${damagePercent}% do HP adversário e recebeu XP pelo esforço.`
        : 'O HP atual foi preservado. A energia usada para entrar na batalha não é devolvida.';
    const rewardMultiplier = clampFloat(Number(session.config.rewardMultiplier) || 1, 0.08, 1);
    const levelRewardMultiplier = opponentLevelRewardMultiplier(
      session.enemy.level,
      session.player.level,
    );
    const levelRewardNote = outcome !== 'fled' && levelRewardMultiplier < 0.95
      ? ` A diferença de nível reduziu a recompensa para ${Math.max(2, Math.round(levelRewardMultiplier * 100))}% do valor normal.`
      : '';
    session.result = {
      note: `${note}${levelRewardNote}`,
      outcome,
      levelRewardMultiplier,
      rewardLabel: typeof session.config.rewardLabel === 'string' ? session.config.rewardLabel : '',
      rewardMultiplier,
      summary,
      xp,
    };
    session.phase = 'result';
    session.config.onProgress?.({ currentHp: session.player.hp });
    session.config.onComplete?.({
      currentHp: session.player.hp,
      enemyCurrentHp: Math.max(1, session.enemy.hp),
      enemyLevel: session.enemy.level,
      enemyMaxHp: session.enemy.maxHp,
      enemyName: session.enemy.name,
      maxHp: session.player.maxHp,
      outcome,
      regionId: session.config.region?.id || null,
      regionName: session.config.region?.name || null,
      levelRewardMultiplier,
      rewardMultiplier,
      xp,
      damagePercent,
    });
    render();
  }

  async function resolveTurn(moveIndex) {
    if (!session || session.phase !== 'choice') return;
    const playerMove = session.player.moves[moveIndex];
    if (!playerMove) return;
    session.phase = 'resolving';
    session.animation = null;
    session.attackingSide = null;
    session.fieldMessage = null;
    session.fieldMessageKind = null;
    session.fieldMessageSide = null;
    render();

    const enemyMove = chooseEnemyMove(session.enemy, session.player);
    const order = ['player', 'enemy'];
    for (let actionIndex = 0; actionIndex < order.length; actionIndex += 1) {
      if (!session || session.phase !== 'resolving') return;
      const side = order[actionIndex];
      const actor = side === 'player' ? session.player : session.enemy;
      const target = side === 'player' ? session.enemy : session.player;
      if (actor.hp <= 0 || target.hp <= 0) break;
      const move = side === 'player' ? playerMove : enemyMove;
      const statusCheck = statusActionCheck(actor);
      const actionMessages = [];
      if (statusCheck.message) actionMessages.push(statusCheck.message);

      session.turnNotice = null;
      session.fieldMessage = statusCheck.canAct
        ? side === 'enemy'
          ? `${actor.name} atacou! Usou ${move.name}.`
          : `${actor.name} usou ${move.name}!`
        : statusCheck.message;
      session.fieldMessageKind = 'move';
      session.fieldMessageSide = side;
      session.attackingSide = side;
      if (statusCheck.canAct && actor.hp > 0) {
        actionMessages.push(useMove(actor, target, move, side));
      }
      const residualMessage = residualStatusDamage(actor);
      if (residualMessage) actionMessages.push(residualMessage);
      session.log.push(actionMessages.join(' '));
      session.log = session.log.slice(-4);
      session.config.onProgress?.({ currentHp: session.player.hp });
      render();
      const calloutDuration = side === 'enemy'
        ? ENEMY_ATTACK_CALLOUT_MS
        : PLAYER_ATTACK_CALLOUT_MS;
      await new Promise(resolve => setTimeout(resolve, calloutDuration));
      if (!session || session.phase !== 'resolving') return;
      session.fieldMessage = null;
      session.fieldMessageKind = null;
      session.fieldMessageSide = null;
      session.attackingSide = null;
      session.animation = null;
      render();
      if (target.hp <= 0) break;
      if (side === 'player') {
        await new Promise(resolve => setTimeout(resolve, BETWEEN_ATTACKS_MS));
      }
    }

    if (!session) return;
    session.animation = null;
    session.attackingSide = null;
    session.fieldMessage = null;
    session.fieldMessageKind = null;
    session.fieldMessageSide = null;
    session.turnNotice = null;
    if (session.enemy.hp <= 0) {
      finishBattle('victory');
      return;
    }
    if (session.player.hp <= 0) {
      finishBattle('defeat');
      return;
    }
    session.turn += 1;
    session.fieldMessage = 'SUA VEZ';
    session.fieldMessageKind = 'ready';
    session.fieldMessageSide = 'player';
    render();
    await new Promise(resolve => setTimeout(resolve, YOUR_TURN_NOTICE_MS));
    if (!session || session.phase !== 'resolving') return;
    session.fieldMessage = null;
    session.fieldMessageKind = null;
    session.fieldMessageSide = null;
    session.phase = 'choice';
    render();
  }

  function bind() {
    if (!host) return;
    host.querySelectorAll('[data-battle-move]').forEach(button => {
      button.addEventListener('click', () => void resolveTurn(Number(button.dataset.battleMove)));
    });
    host.querySelectorAll('[data-battle-exit]').forEach(button => {
      button.addEventListener('click', () => {
        if (!session) return;
        if (session.phase === 'choice') {
          finishBattle('fled');
          return;
        }
        if (session.phase === 'resolving') return;
        close();
      });
    });
  }

  async function prepareBattle(config, sequence) {
    try {
      const pet = config.pet;
      const energyCost = Math.max(1, Math.round(Number(config.energyCost) || 25));
      const playerVisualPromise = playerBattleVisual(config.visual);
      const playerData = await hydrate(pet, config.dexNumber, config.speciesName);
      if (!session || sequence !== loadSequence) return;
      if (pet.energy < energyCost) {
        session.phase = 'error';
        session.error = `${pet.customName} precisa de pelo menos ${energyCost} de energia para batalhar.`;
        render();
        return;
      }
      if (playerData.currentHp <= playerData.maxHp * 0.2) {
        session.phase = 'error';
        session.error = `${pet.customName} precisa recuperar mais de 20% do HP antes de batalhar.`;
        render();
        return;
      }

      const playerMoves = await prepareMoves(
        {
          ...playerData.speciesData,
          moveLearnset: getMoveCatalog(pet, config.dexNumber, config.speciesName)
            .filter(move => move.learned)
            .map(move => ({ level: move.level, name: move.id })),
        },
        pet.level,
        pet.battle.equippedMoves,
        { exact: pet.battle.equippedMoves.length > 0 },
      );
      const playerVisual = await playerVisualPromise;
      if (!session || sequence !== loadSequence) return;
      pet.battle.equippedMoves = playerMoves
        .map(move => move.id)
        .filter((move, index, moves) => moves.indexOf(move) === index);
      const player = participantFrom(
        playerData.speciesData,
        pet.level,
        playerData.attributes,
        {
          bond: pet.bond,
          currentHp: playerData.currentHp,
          energy: pet.energy,
          happiness: pet.happiness,
          moves: playerMoves,
          name: pet.customName,
          visual: playerVisual,
        },
      );
      const opponent = await chooseOpponent(config, player);
      const enemyMoves = await prepareMoves(opponent.data, opponent.level);
      if (!session || sequence !== loadSequence) return;
      const enemy = opponent.participant;
      enemy.moves = enemyMoves;
      enemy.name = opponent.visual?.name || opponent.data.name;
      enemy.visual = opponent.visual;

      config.onStarted?.();
      player.energy = clamp(pet.energy);
      session.player = player;
      session.enemy = enemy;
      session.log = [`Um ${enemy.name} de nível ${enemy.level} apareceu em ${config.region?.name || 'uma área selvagem'}!`];
      session.phase = 'choice';
      session.turn = 1;
      session.attackingSide = null;
      session.fieldMessage = null;
      session.fieldMessageKind = null;
      session.fieldMessageSide = null;
      session.turnNotice = null;
      config.onProgress?.({ currentHp: player.hp });
      render();
    } catch (error) {
      if (!session || sequence !== loadSequence) return;
      session.phase = 'error';
      session.error = error instanceof Error
        ? `Não foi possível preparar a batalha: ${error.message}`
        : 'Não foi possível preparar a batalha agora.';
      render();
    }
  }

  function open(config) {
    if (!host || !config || !config.pet) return false;
    stopBattleSounds();
    loadSequence += 1;
    session = {
      attackingSide: null,
      config,
      damageDealt: 0,
      enemy: null,
      error: '',
      fieldMessage: null,
      fieldMessageKind: null,
      fieldMessageSide: null,
      log: [],
      phase: 'loading',
      player: null,
      result: null,
      scene: chooseBattleScene(),
      turn: 0,
      turnNotice: null,
    };
    render();
    void prepareBattle(config, loadSequence);
    return true;
  }

  function close() {
    if (!session) return;
    stopBattleSounds();
    const onExit = session.config.onExit;
    session = null;
    loadSequence += 1;
    render();
    onExit?.();
  }

  window.SuperPokegochiBattle = {
    allocateAttribute,
    attributeKeys: [...ATTRIBUTE_KEYS],
    attributeLabels: { ...ATTRIBUTE_LABELS },
    close,
    getLearnedMoves,
    getMoveCatalog,
    getSnapshot,
    hydrate,
    hydrateJourney,
    isOpen: () => Boolean(session),
    open,
    resetAttributes,
    restoreHp,
    setEquippedMoves,
    typeLabel,
  };
})();
