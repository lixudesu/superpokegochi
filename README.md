# SuperPokégochi

Tamagotchi de Pokémon feito com HTML, CSS e JavaScript puro. Esta é a versão
independente do jogo: não exige conta, backend, Supabase ou compilação. Todo o
progresso fica salvo no navegador com `localStorage`.

![Prévia do SuperPokégochi](assets/superpokegochi-preview.png)

## O que está disponível

- Catálogo pesquisável com 1.025 espécies.
- Até seis jornadas individuais, com troca rápida do companheiro ativo.
- É possível cuidar de dois Pokémon da mesma espécie com níveis e rotas diferentes.
- Nível, XP, vínculo e necessidades compartilhados apenas dentro da mesma jornada.
- Evolução opcional, ramificações permanentes e troca entre as formas desbloqueadas.
- Sprites normais, Shiny e sprites de costas nas batalhas.
- Fome, felicidade, energia, HP, vínculo e dias juntos.
- Folhas, Berries e sujeira espalhadas pelo gramado.
- Mochila com Berries, ingredientes de curry e medicamentos em pixel art.
- Música em loop, sons de alimentação e evolução.
- Ciclo de dia e noite no horário de Brasília.
- Shiny liberado após 30 dias de vínculo.
- Salvamento automático mesmo ao fechar o jogo.

## Atualização 2.0

### Batalhas

O antigo treino foi substituído por batalhas em turnos. O adversário é escolhido
de acordo com o nível e o poder do companheiro.

- Cada batalha consome 25 de energia e 6 de fome.
- É necessário possuir pelo menos 25 de energia, mais de 10 de fome e mais de
  20% do HP.
- Uma luta neutra costuma durar de quatro a seis turnos. Críticos e vantagens de
  tipo encurtam o confronto.
- O treino busca adversários de poder compatível, não apenas de nível parecido.
- Vitória concede mais XP. Na derrota, o XP varia conforme o dano causado e pode
  chegar a cerca de metade da recompensa de vitória; fugir não concede XP.
- O HP restante continua salvo depois da batalha.
- Descansar, consumir Berries e usar medicamentos recuperam HP.
- Veneno, queimadura, paralisia, sono, congelamento e confusão afetam os turnos
  e aparecem ao lado do nome do Pokémon.
- Nas batalhas de visita, XP, energia, fome e HP restante dos dois perfis são
  enviados para persistência.

Ao tocar em **Treino**, abre uma central com:

- **Treinar:** mostra HP, energia e fome antes de escolher uma região;
- **Regiões:** define a faixa de nível, espécies selvagens e dificuldade;
- **Histórico:** mostra cinco batalhas por vez, com resultado, adversário, nível,
  região, horário e XP;
- **Carregar mais:** adiciona mais cinco resultados à lista.

| Região | Níveis | Dificuldade |
| --- | ---: | --- |
| Bosque Inicial | 1–5 | Tranquilo |
| Floresta Verde | 6–15 | Fácil |
| Floresta Densa | 16–30 | Moderado |
| Montanha Rochosa | 31–50 | Equilibrado |
| Caverna Cristal | 51–70 | Desafiador |
| Ruínas Antigas | 71–90 | Difícil |
| Pico Lendário | 91–120 | Extremo |
| Desconhecido | nível do companheiro ±10 | Imprevisível |

Todas as regiões ficam abertas desde o começo, mas entrar acima da faixa indicada
mantém a dificuldade real dos adversários. Em **Desconhecido**, o encontro usa
todo o catálogo, sorteia níveis entre 10 abaixo e 10 acima do companheiro e possui
uma pequena chance de trazer Pokémon lendários. Enfrentar adversários abaixo do
seu nível reduz bastante o XP, então revisitar áreas antigas não permite farmar
recompensas altas.

As primeiras oito batalhas concluídas do dia entregam 100% do XP. Da nona à
décima sexta, o rendimento cai para 50%; depois disso, fica em 10% até a virada
do dia no horário de Brasília. Fugir não conta nesse ciclo.

### Atributos e habilidades

Cada nível conquistado libera um ponto de atributo. Os pontos podem melhorar:

- Ataque;
- Defesa;
- Velocidade;
- Vitalidade e HP máximo.

A aba **Habilidades** permite equipar de um a quatro golpes aprendidos pelo Pokémon.
Os dados de tipos, golpes e status são consultados na PokéAPI e mantidos em cache
por 30 dias. Se a API estiver indisponível, o jogo usa dados equilibrados de
reserva.

A lista também mostra golpes futuros em cinza, com tipo, categoria, poder,
precisão e nível necessário. Golpes aprendidos por uma forma desbloqueada
permanecem disponíveis na mesma jornada. Os atributos podem ser resetados
gratuitamente nesta versão independente, sem alterar nível, XP ou golpes.

### Minigames

O botão **Brincar** abre os minigames em tela cheia:

- **Chuva de Berries:** consome 8 de energia; sobreviva por 50 segundos, colete
  Berries e evite os itens perigosos;
- **Jogo da Memória:** encontre os pares de Berries. O jogador possui uma vida
  para cada carta do tabuleiro e consome 6 de energia. O baralho é embaralhado
  em uma variável privada; cartas cobertas não expõem a resposta no HTML.

Cada jornada possui duas missões diárias, reiniciadas à meia-noite no horário de
Brasília:

- somar 30 pontos na Chuva de Berries;
- vencer uma partida da Memória de Berries.

É possível tentar novamente enquanto houver energia. Cada missão concede uma
Berry ou ingrediente de curry e 30 XP uma vez por dia. Depois de concluída, novas partidas ainda aumentam
a felicidade, mas não repetem a recompensa. Derrotas com pontuação concedem um
pequeno XP de esforço, limitado a 10 XP por minigame a cada dia.

Descansar recupera toda a energia em aproximadamente uma hora. Durante o mesmo
período, o Pokémon recupera cerca de 50% do HP máximo.

As folhas coletadas no gramado concedem de 1 a 12 XP. Valores entre 1 e 2 são
comuns; recompensas maiores ficam progressivamente mais raras.

### Itens e mochila

A mochila exibe somente os itens que o jogador possui. O inventário é separado
em três grupos:

- **Berries:** recuperam fome, HP e outros atributos. Aparecem no gramado e podem
  ser obtidas em minigames, batalhas e presentes;
- **Ingredientes de curry:** recuperam bastante fome e podem ser encontrados em
  minigames, batalhas e presentes;
- **Medicamentos:** focados em recuperação de HP e progressão. São encontrados
  principalmente em batalhas e presentes. A Superpoção recupera até 120 HP e o
  Doce Raro avança exatamente um nível.

Inventários antigos são convertidos automaticamente para os novos itens sem
perder as quantidades salvas.

### Ritmo de progresso

Não existe mais limite máximo de nível. A experiência necessária para avançar é
calculada por `75 × nível^1,18`, arredondada para múltiplos de 5. A curva começa
acessível e cresce continuamente; por exemplo, o nível 55 para 56 exige 8.485 XP.
Ao carregar um save antigo, o jogo preserva o nível e converte proporcionalmente
o progresso da barra para a curva atual, evitando perda ou ganho artificial de
níveis. O Shiny permanece ligado aos 30 dias de vínculo.

## Jornadas, evolução e progresso

Cada Pokémon cuidado possui uma jornada própria. Dentro dela, o progresso é
compartilhado entre as formas desbloqueadas:

```text
Ralts → Kirlia → Gardevoir
Jornada A · nível compartilhado: 100
```

Ao alcançar o requisito, o treinador pode evoluir ou escolher **Evoluir depois**.
Nas linhas ramificadas, como Eevee, todas as rotas compatíveis continuam
disponíveis até uma delas ser escolhida. Depois da escolha, as rotas incompatíveis
somem somente daquela jornada, mas o treinador ainda pode alternar entre Eevee e
a evolução escolhida.

Também é possível começar outra jornada com a mesma espécie:

```text
Eevee A · Nv. 42 → Jolteon
Eevee B · Nv. 18 → ainda sem evolução
```

Essas jornadas mantêm níveis, atributos, golpes, vínculo, HP e históricos
independentes.

## Executar

É recomendado iniciar um servidor local:

```bash
python -m http.server 5182
```

Depois acesse `http://127.0.0.1:5182/`.

## Arquivos principais

```text
.
|-- assets/
|   |-- items/
|   |-- musics/
|   |-- sounds/
|   `-- pokemons/
|       |-- Back/
|       |-- Back shiny/
|       |-- Front/
|       `-- Front shiny/
|-- battle/
|   |-- assets/
|   |-- battle.css
|   `-- battle-system.js
|-- minigames/
|   |-- assets/
|   |-- minigames.css
|   `-- minigames.js
|-- index.html
|-- pokemon-catalog.js
|-- pokemon-data.js
|-- style.css
|-- tamagotchi-system.js
`-- README.md
```

O arquivo `app.js` foi mantido apenas como legado e não é carregado pelo
`index.html`.

## Aviso

Projeto de fãs, sem afiliação oficial com Nintendo, Game Freak ou The Pokémon
Company. Pokémon e seus personagens pertencem aos respectivos detentores.
