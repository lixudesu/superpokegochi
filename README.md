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
- Folhas, frutas e sujeira espalhadas pelo gramado.
- Mochila com frutas comuns, incomuns e raras.
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
- Descansar e comer frutas recuperam HP. Uma fruta cura de 20% a 35%.
- Veneno, queimadura, paralisia, sono, congelamento e confusão afetam os turnos
  e aparecem ao lado do nome do Pokémon.
- Nas batalhas de visita, XP, energia, fome e HP restante dos dois perfis são
  enviados para persistência.

Ao tocar em **Treino**, abre uma central com:

- **Treinar:** mostra HP, energia e fome antes de começar;
- **Histórico:** mostra cinco batalhas por vez, com resultado, adversário, nível,
  horário e XP;
- **Carregar mais:** adiciona mais cinco resultados à lista.

### Atributos e habilidades

Cada nível conquistado libera um ponto de atributo. Os pontos podem melhorar:

- Ataque;
- Defesa;
- Velocidade;
- Vitalidade e HP máximo.

A aba **Habilidades** permite equipar até quatro golpes aprendidos pelo Pokémon.
Os dados de tipos, golpes e status são consultados na PokéAPI e mantidos em cache
por 30 dias. Se a API estiver indisponível, o jogo usa dados equilibrados de
reserva.

A lista também mostra golpes futuros em cinza, com tipo, categoria, poder,
precisão e nível necessário. Golpes aprendidos por uma forma desbloqueada
permanecem disponíveis na mesma jornada. Os atributos podem ser resetados
gratuitamente nesta versão independente, sem alterar nível, XP ou golpes.

### Minigames

O botão **Brincar** abre os minigames em tela cheia:

- **Chuva de Frutas:** consome 8 de energia; sobreviva por 50 segundos, colete
  frutas e evite os itens perigosos;
- **Jogo da Memória:** encontre os pares de frutas. O jogador possui seis
  tentativas e consome 6 de energia.

Cada jornada possui duas missões diárias, reiniciadas à meia-noite no horário de
Brasília:

- somar 30 pontos na Chuva de Frutas;
- vencer uma partida da Memória de Frutas.

É possível tentar novamente enquanto houver energia. Cada missão concede uma
fruta e 35 XP uma vez por dia. Depois de concluída, novas partidas ainda aumentam
a felicidade, mas não repetem a recompensa. Derrotas com pontuação concedem um
pequeno XP de esforço, limitado a 10 XP por minigame a cada dia.

Descansar recupera toda a energia em aproximadamente uma hora. Durante o mesmo
período, o Pokémon recupera cerca de 50% do HP máximo.

As folhas coletadas no gramado concedem de 1 a 12 XP. Valores entre 1 e 2 são
comuns; recompensas maiores ficam progressivamente mais raras.

### Frutas

| Fruta | Tier | Cura de HP | XP |
| --- | --- | ---: | ---: |
| Maçã | Comum | 20% | 2 |
| Morango | Comum | 20% | 3 |
| Amora | Comum | 22% | 4 |
| Pera | Comum | 20% | 2 |
| Uva | Comum | 20% | 3 |
| Laranja | Comum | 22% | 4 |
| Banana | Comum | 25% | 4 |
| Melancia | Incomum | 35% | 7 |
| Abacaxi Energia | Rara | 30% | 8 |

O Abacaxi Energia também recupera 30 de energia. Um Pokémon ferido pode comer
para recuperar HP mesmo quando já está satisfeito.

### Ritmo de progresso

A curva de XP foi feita para valorizar a convivência com o companheiro. Com as
duas missões diárias, cerca de três batalhas e os itens do gramado, a referência
é chegar perto do nível 40 em um mês de atividade. O nível 100 continua sendo
uma meta de aproximadamente 7 a 10 meses para a maioria dos jogadores, e o
Shiny permanece ligado aos 30 dias de vínculo.

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
