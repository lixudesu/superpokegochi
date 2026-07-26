const DEX = [
  {
    id: 'bulbasaur',
    name: 'Bulbasaur',
    type: 'Grass',
    typeClass: 'grass-type',
    img: 'assets/pokemons/BULBASAUR.webp',
    sprite: {
      src: 'assets/pokemons/BULBASAUR.webp',
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
        img: 'assets/pokemons/BULBASAUR.webp',
        sprite: {
          src: 'assets/pokemons/BULBASAUR.webp',
          frameWidth: 38,
          frameHeight: 38,
          frames: 49,
          sheetWidth: 1862,
        },
      },
      {
        id: 'ivysaur',
        name: 'Ivysaur',
        unlockLevel: 16,
        img: 'assets/pokemons/IVYSAUR.webp',
      },
      {
        id: 'venusaur',
        name: 'Venusaur',
        unlockLevel: 32,
        img: 'assets/pokemons/VENUSAUR.webp',
      },
    ],
    favoriteFood: 'Folha macia',
    moodLine: 'gosta de ficar no meio da grama.',
  },
];

const STORAGE_KEY = 'scrypet_tamagotchi_bulbasaur_v1';
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));
const now = () => Date.now();
const root = document.querySelector('[data-root]');
