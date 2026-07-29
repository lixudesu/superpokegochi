# SuperPokégochi

Tamagotchi de Pokémon feito com HTML, CSS e JavaScript puro. Esta é a versão
independente do jogo: não exige conta, backend, Supabase ou compilação. Todo o
progresso fica salvo no navegador com `localStorage`.

![Prévia do SuperPokégochi](assets/superpokegochi-preview.png)

## O que está disponível

- Catálogo pesquisável com 1.025 espécies.
- Até seis Pokémon cuidados, com troca rápida do companheiro ativo.
- Nível, XP, vínculo e necessidades compartilhados pela linha evolutiva.
- Evolução opcional e troca entre todas as formas já desbloqueadas.
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

- Cada batalha consome 15 de energia e 6 de fome.
- É necessário possuir pelo menos 20 de energia, mais de 10 de fome e mais de
  20% do HP.
- Vitória concede mais XP; derrota concede uma parte; fugir não concede XP.
- O HP restante continua salvo depois da batalha.
- Descansar e comer frutas recuperam HP.

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

### Minigames

O botão **Brincar** abre os minigames em tela cheia e consome 30 de energia:

- **Chuva de Frutas:** sobreviva por 50 segundos, colete frutas e evite os itens
  perigosos;
- **Jogo da Memória:** encontre os pares de frutas. O jogador possui seis
  tentativas e, depois de perder, precisa aguardar uma hora.

As recompensas principais de fruta e XP respeitam o intervalo configurado pelo
jogo para evitar ganho excessivo.

### Frutas

| Fruta | Tier | Cura de HP | XP |
| --- | --- | ---: | ---: |
| Maçã | Comum | 5% | 1 |
| Morango | Comum | 5% | 2 |
| Amora | Comum | 6% | 2 |
| Pera | Comum | 5% | 1 |
| Uva | Comum | 5% | 2 |
| Laranja | Comum | 7% | 2 |
| Banana | Comum | 8% | 2 |
| Melancia | Incomum | 15% | 4 |
| Abacaxi Energia | Rara | 12% | 5 |

O Abacaxi Energia também recupera 30 de energia. Um Pokémon ferido pode comer
para recuperar HP mesmo quando já está satisfeito.

## Evolução e progresso compartilhado

O progresso pertence à linha evolutiva inteira, não a cada aparência:

```text
Ralts → Kirlia → Gardevoir
Nível compartilhado: 100
```

Ao alcançar o requisito, o treinador decide se deseja evoluir. Depois de
desbloqueada, qualquer forma da linha pode ser usada novamente sem perder nível,
XP, vínculo, HP ou histórico.

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
