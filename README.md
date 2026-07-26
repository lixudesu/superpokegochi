# SuperPokegochi

Tamagotchi de Pokemon feito com HTML, CSS e JavaScript puro. O progresso fica
salvo no navegador e o projeto nao precisa de backend ou compilacao.

![Previa do SuperPokegochi](assets/superpokegochi-preview.png)

## O que ja funciona

- Catalogo com as 1.025 especies e busca por nome ou ID.
- Escolha direta apenas de especies-base; evolucoes aparecem com cadeado.
- Sprites normais e Shiny animados em um gramado responsivo.
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

Com energia abaixo de 10, brincadeira e treino ficam bloqueados ate o Pokemon
descansar, mas ele ainda pode comer enquanto estiver acordado. Durante o
descanso, todas as acoes ficam bloqueadas. O descanso termina em 80 de energia,
mas tambem pode ser encerrado manualmente.

## Evolucao e aparencia

| Forma | Desbloqueio |
| --- | ---: |
| Bulbasaur | Nivel 1 |
| Ivysaur | Nivel 16 |
| Venusaur | Nivel 32 |

Evoluir e opcional. Um Bulbasaur de nivel 100 continua podendo usar a
aparencia de Bulbasaur, Ivysaur ou Venusaur que estiver desbloqueada, sem perder
nivel, XP ou atributos.

Para trocar de forma ou usar a versao Shiny, abra a **Pokebola no topo** e
entre na aba **Aparencia**. A versao Shiny aparece depois de 30 dias de vinculo.

## Como trocar de Pokemon

Abra **Companheiros** pelo botao lateral ou por **Mais > Companheiros**. Busque
pelo nome, identificador textual ou numero da Pokedex, como `Pikachu`,
`pikachu`, `25` ou `#025`, e selecione o resultado.

Somente especies-base podem ser escolhidas diretamente. Evolucoes continuam
pesquisaveis, mas aparecem com cadeado e informam sua especie anterior. Na
familia Bulbasaur, Ivysaur e Venusaur sao liberados nos niveis 16 e 32 pela
aba **Aparencia**.

As especies-base possuem progresso separado. Apenas os resultados da busca sao
carregados na tela, evitando carregar todas as sprite sheets de uma vez.

Para atualizar o catalogo depois de adicionar novos assets:

```bash
node scripts/generate-pokemon-catalog.mjs
```

O gerador usa `front-index.json`, confere os sprites Normal e Shiny e associa
cada especie ao numero oficial da Pokedex e a sua cadeia de evolucao.

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
|-- pokemon-catalog.js
|-- pokemon-data.js
|-- tamagotchi-system.js
|-- style.css
|-- scripts/
|   `-- generate-pokemon-catalog.mjs
`-- README.md
```

- `pokemon-catalog.js`: catalogo gerado das 1.025 especies.
- `pokemon-data.js`: montagem do DEX e configuracao especial das evolucoes.
- `tamagotchi-system.js`: regras, estado, acoes e interface.
- `style.css`: layout responsivo e animacoes.

## Aviso

Projeto de fas, sem afiliacao oficial com Nintendo, Game Freak ou The Pokemon
Company. Pokemon e seus personagens pertencem aos respectivos detentores.
