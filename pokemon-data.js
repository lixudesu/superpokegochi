const FEATURED_DEX = [
  {
    id: 'bulbasaur',
    dexNumber: 1,
    evolvesFromDexNumber: null,
    evolutionRootDexNumber: 1,
    selectable: true,
    name: 'Bulbasaur',
    type: 'Grass',
    typeClass: 'grass-type',
    img: '/pokemons_ani/Front/BULBASAUR.webp',
    sprite: {
      src: '/pokemons_ani/Front/BULBASAUR.webp',
      frameWidth: 38,
      frameHeight: 38,
      frames: 49,
      sheetWidth: 1862,
    },
    forms: [
      {
        id: 'bulbasaur',
        name: 'Bulbasaur',
        unlockLevel: 1,
        assetReady: true,
        img: '/pokemons_ani/Front/BULBASAUR.webp',
        sprite: {
          src: '/pokemons_ani/Front/BULBASAUR.webp',
          frameWidth: 38,
          frameHeight: 38,
          frames: 49,
          sheetWidth: 1862,
        },
        shiny: {
          img: '/pokemons_ani/Front%20shiny/BULBASAUR.webp',
          sprite: {
            src: '/pokemons_ani/Front%20shiny/BULBASAUR.webp',
            frameWidth: 38,
            frameHeight: 38,
            frames: 49,
            sheetWidth: 1862,
          },
        },
      },
      {
        id: 'ivysaur',
        name: 'Ivysaur',
        unlockLevel: 16,
        assetReady: true,
        img: '/pokemons_ani/Front/IVYSAUR.webp',
        sprite: {
          src: '/pokemons_ani/Front/IVYSAUR.webp',
          frameWidth: 58,
          frameHeight: 58,
          frames: 55,
          sheetWidth: 3190,
        },
        shiny: {
          img: '/pokemons_ani/Front%20shiny/IVYSAUR.webp',
          sprite: {
            src: '/pokemons_ani/Front%20shiny/IVYSAUR.webp',
            frameWidth: 58,
            frameHeight: 58,
            frames: 55,
            sheetWidth: 3190,
          },
        },
      },
      {
        id: 'venusaur',
        name: 'Venusaur',
        unlockLevel: 32,
        assetReady: true,
        img: '/pokemons_ani/Front/VENUSAUR.webp',
        sprite: {
          src: '/pokemons_ani/Front/VENUSAUR.webp',
          frameWidth: 86,
          frameHeight: 86,
          frames: 83,
          sheetWidth: 7138,
        },
        shiny: {
          img: '/pokemons_ani/Front%20shiny/VENUSAUR.webp',
          sprite: {
            src: '/pokemons_ani/Front%20shiny/VENUSAUR.webp',
            frameWidth: 86,
            frameHeight: 86,
            frames: 83,
            sheetWidth: 7138,
          },
        },
      },
    ],
    favoriteFood: 'Folha macia',
    moodLine: 'gosta de ficar no meio da grama.',
  },
];

function catalogPokemonFromRow(row) {
  const [
    dexNumber,
    id,
    name,
    file,
    frames,
    frameWidth,
    frameHeight,
    sheetWidth,
    evolvesFromDexNumber,
    evolutionRootDexNumber,
  ] = row;
  const normalSrc = `/pokemons_ani/Front/${file}`;
  const shinySrc = `/pokemons_ani/Front%20shiny/${file}`;
  const sprite = { src: normalSrc, frameWidth, frameHeight, frames, sheetWidth };
  const shinySprite = { src: shinySrc, frameWidth, frameHeight, frames, sheetWidth };
  return {
    id,
    dexNumber,
    evolvesFromDexNumber,
    evolutionRootDexNumber,
    selectable: !evolvesFromDexNumber,
    name,
    type: 'Pokémon',
    typeClass: 'catalog-type',
    img: normalSrc,
    sprite,
    forms: [{
      id,
      name,
      unlockLevel: 1,
      assetReady: true,
      img: normalSrc,
      sprite,
      shiny: { img: shinySrc, sprite: shinySprite },
    }],
    favoriteFood: 'Berry',
    moodLine: 'gosta de explorar o gramado.',
  };
}

const CATALOG_DEX = POKEMON_CATALOG_DATA.map(catalogPokemonFromRow);
const featuredIds = new Set(FEATURED_DEX.map(mon => mon.id));
const DEX = [...FEATURED_DEX, ...CATALOG_DEX.filter(mon => !featuredIds.has(mon.id))];
const CATALOG_BY_DEX = new Map(CATALOG_DEX.map(mon => [mon.dexNumber, mon]));

function catalogEvolutionDepth(mon) {
  let depth = 0;
  let current = mon;
  const visited = new Set();

  while (current && current.evolvesFromDexNumber && !visited.has(current.dexNumber)) {
    visited.add(current.dexNumber);
    depth += 1;
    current = CATALOG_BY_DEX.get(current.evolvesFromDexNumber);
  }

  return depth;
}

DEX.filter(mon => mon.selectable !== false && !featuredIds.has(mon.id)).forEach(rootMon => {
  rootMon.forms = CATALOG_DEX
    .filter(mon => mon.evolutionRootDexNumber === rootMon.dexNumber)
    .sort((first, second) => catalogEvolutionDepth(first) - catalogEvolutionDepth(second) || first.dexNumber - second.dexNumber)
    .map(mon => ({
      ...mon.forms[0],
      dexNumber: mon.dexNumber,
      evolvesFromDexNumber: mon.evolvesFromDexNumber,
      evolutionRootDexNumber: mon.evolutionRootDexNumber,
      unlockLevel: catalogEvolutionDepth(mon) === 0 ? 1 : catalogEvolutionDepth(mon) * 16,
    }));
});

const STORAGE_KEY = 'scrypet_tamagotchi_bulbasaur_v1';
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));
const now = () => Date.now();
const root = document.querySelector('[data-root]');
