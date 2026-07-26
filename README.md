# SuperPokegochi

Tamagotchi de Pokemon feito com HTML, CSS e JavaScript puro. O progresso fica
salvo no navegador e o projeto nao precisa de backend ou compilacao.

![Previa do SuperPokegochi](assets/superpokegochi-preview.png)

## O que ja funciona

- Bulbasaur animado em um gramado responsivo.
- Fome, felicidade, energia, nivel e XP.
- Comida, brincadeira, treino e descanso manual na Pokebola.
- Evolucao opcional nos niveis 16 e 32.
- Troca livre entre as formas ja desbloqueadas.
- Aparencia Shiny liberada com 30 dias de vinculo.
- Ciclo de dia e noite pelo horario de Brasilia.
- Mochila, recompensa diaria e historico de atividades.
- Salvamento automatico com `localStorage`.

## Executar

Abra `index.html` diretamente ou inicie um servidor local:

```bash
python -m http.server 5182
```

Depois acesse `http://127.0.0.1:5182/`.

## Regras principais

| Acao | Resultado |
| --- | --- |
| Comida | Recupera fome e um pouco de felicidade |
| Brincar | Aumenta felicidade e gasta energia |
| Treino | Minigame de tres rodadas que entrega XP e premios |
| Descansar | Recupera 10 de energia a cada 30 minutos |

Com energia abaixo de 10, comida, brincadeira e treino ficam bloqueados ate o
Pokemon descansar. O descanso termina em 80 de energia, mas tambem pode ser
encerrado manualmente.

## Evolucao e aparencia

| Forma | Desbloqueio |
| --- | ---: |
| Bulbasaur | Nivel 1 |
| Ivysaur | Nivel 16 |
| Venusaur | Nivel 32 |

Evoluir e opcional. Um Bulbasaur de nivel 100 continua podendo usar a
aparencia de Bulbasaur, Ivysaur ou Venusaur que estiver desbloqueada, sem perder
nivel, XP ou atributos.

Para trocar de forma ou de cor, abra a **Pokebola no topo** e entre na aba
**Aparencia**. A versao Shiny aparece depois de 30 dias de vinculo.

## Como trocar de Pokemon

Atualmente apenas a familia do Bulbasaur esta cadastrada. Por isso, a Pokebola
troca a **aparencia da evolucao**, mas ainda nao troca para outra especie.

Para adicionar outro Pokemon:

1. Coloque os sprites normais em `assets/pokemons/Front/`.
2. Coloque os sprites Shiny em `assets/pokemons/Front shiny/`.
3. Adicione uma nova entrada ao array `DEX` em `pokemon-data.js`.
4. Configure as formas, niveis e dimensoes da sprite sheet usando
   `assets/pokemons/front-index.json`.

Quando o `DEX` tiver mais de uma entrada, a opcao **Companheiros** aparecera
automaticamente em **Mais**. Nessa tela sera possivel escolher qual Pokemon
fica ativo, e cada um mantera seu proprio progresso.

## Arquivos principais

```txt
.
|-- assets/
|   |-- grass.png
|   |-- superpokegochi-preview.png
|   `-- pokemons/
|       |-- Front/
|       |-- Front shiny/
|       `-- front-index.json
|-- index.html
|-- pokemon-data.js
|-- tamagotchi-system.js
|-- style.css
`-- README.md
```

- `pokemon-data.js`: cadastro dos Pokemon, evolucoes e sprites.
- `tamagotchi-system.js`: regras, estado, acoes e interface.
- `style.css`: layout responsivo e animacoes.

## Aviso

Projeto de fas, sem afiliacao oficial com Nintendo, Game Freak ou The Pokemon
Company. Pokemon e seus personagens pertencem aos respectivos detentores.
