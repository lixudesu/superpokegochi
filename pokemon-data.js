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
    img: 'assets/pokemons/Front/BULBASAUR.webp',
    sprite: {
      src: 'assets/pokemons/Front/BULBASAUR.webp',
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
        img: 'assets/pokemons/Front/BULBASAUR.webp',
        sprite: {
          src: 'assets/pokemons/Front/BULBASAUR.webp',
          frameWidth: 38,
          frameHeight: 38,
          frames: 49,
          sheetWidth: 1862,
        },
        shiny: {
          img: 'assets/pokemons/Front%20shiny/BULBASAUR.webp',
          sprite: {
            src: 'assets/pokemons/Front%20shiny/BULBASAUR.webp',
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
        img: 'assets/pokemons/Front/IVYSAUR.webp',
        sprite: {
          src: 'assets/pokemons/Front/IVYSAUR.webp',
          frameWidth: 58,
          frameHeight: 58,
          frames: 55,
          sheetWidth: 3190,
        },
        shiny: {
          img: 'assets/pokemons/Front%20shiny/IVYSAUR.webp',
          sprite: {
            src: 'assets/pokemons/Front%20shiny/IVYSAUR.webp',
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
        img: 'assets/pokemons/Front/VENUSAUR.webp',
        sprite: {
          src: 'assets/pokemons/Front/VENUSAUR.webp',
          frameWidth: 86,
          frameHeight: 86,
          frames: 83,
          sheetWidth: 7138,
        },
        shiny: {
          img: 'assets/pokemons/Front%20shiny/VENUSAUR.webp',
          sprite: {
            src: 'assets/pokemons/Front%20shiny/VENUSAUR.webp',
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
  const normalSrc = `assets/pokemons/Front/${file}`;
  const shinySrc = `assets/pokemons/Front%20shiny/${file}`;
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

const STORAGE_KEY = 'scrypet_tamagotchi_bulbasaur_v1';
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));
const now = () => Date.now();
const root = document.querySelector('[data-root]');
