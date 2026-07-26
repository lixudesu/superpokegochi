# Pokemon Tamagotchi

Um Tamagotchi de Pokemon feito com HTML, CSS e JavaScript puro. O projeto
atual usa o Bulbasaur como primeiro companheiro e foi preparado para receber
novos Pokemon e novas formas futuramente.

O jogo funciona inteiramente no navegador, sem backend e sem processo de
compilacao.

## Recursos atuais

- Bulbasaur animado por sprite sheet.
- Fundo de grama responsivo.
- Ciclo de dia e noite baseado no horario de Brasilia.
- Fome, felicidade, energia, nivel e XP.
- Vinculo calculado pela quantidade de dias com o companheiro ativo.
- Mochila com comidas comuns e fruta rara.
- Recompensa diaria de comidas.
- Acao de brincar para aumentar a felicidade.
- Minigame de treino com tres rodadas.
- Descanso manual dentro de uma Pokebola.
- Evolucao opcional e troca de aparencia.
- Historico das atividades recentes.
- Progresso salvo automaticamente no navegador.
- Layout adaptado para celular e desktop.

## Como executar

Nao e necessario instalar dependencias.

### Abrir diretamente

Abra o arquivo `index.html` no navegador.

### Usar um servidor local

Na pasta do projeto, execute:

```bash
python -m http.server 5182
```

Depois acesse:

```txt
http://127.0.0.1:5182/
```

## Cuidados

### Comida

A mochila possui cinco tipos de comida:

| Comida | Fome | Felicidade | Raridade |
| --- | ---: | ---: | --- |
| Maca | +25 | +2 | Comum |
| Berry | +25 | +2 | Comum |
| Biscoito | +25 | +2 | Comum |
| Doce | +25 | +2 | Comum |
| Fruta rara | +40 | +5 | Rara |

O Pokemon recusa comida quando a fome esta acima de 90.

No primeiro acesso de cada dia, o jogador recebe tres comidas. Cada item tem
12% de chance de ser uma Fruta rara.

### Brincar

Brincar aplica as seguintes mudancas:

```txt
Felicidade: +12
Energia:    -12
Fome:       -5
```

Quando a energia fica abaixo de 10, o Pokemon precisa descansar antes de
comer, brincar ou treinar.

### Treino

O treino abre um minigame de precisao com tres rodadas. O jogador deve parar
o marcador dentro ou proximo da area verde.

| Resultado | XP por rodada |
| --- | ---: |
| Quase | 4 XP |
| Bom | 8 XP |
| Perfeito | 12 XP |

Ao concluir o treino:

```txt
Energia:    -20
Fome:       -10
Felicidade: +4
XP:         soma das tres rodadas
```

O treino tambem entrega uma recompensa:

- 70% de chance de uma comida comum.
- 25% de chance de duas comidas comuns.
- 5% de chance de uma Fruta rara.

O treino exige mais de 30 de energia e mais de 20 de fome.

### Descanso

O descanso nao comeca sozinho. Quando a energia esta abaixo de 10, Comida,
Brincar e Treino ficam bloqueados, mas o jogador continua livre para escolher
quando usar `Descansar`.

Durante o descanso:

- O Pokemon entra em uma Pokebola no centro do gramado.
- A Pokebola possui uma animacao suave.
- A energia recupera 10 pontos a cada 30 minutos.
- O descanso termina automaticamente ao chegar a 80 de energia.
- O jogador pode usar `Levantar` a qualquer momento.

Se levantar ainda cansado, o Pokemon permanece acordado e nao volta
automaticamente para a Pokebola.

## Status e passagem do tempo

Os atributos variam de 0 a 100. Enquanto o tempo passa, o jogo reduz:

```txt
Fome:       -4 por hora
Felicidade: -2 por hora
Energia:    -3 por hora, quando nao esta descansando
```

O calculo offline considera no maximo 24 horas desde a ultima atualizacao.
Nao existe vida, morte ou perda definitiva do companheiro.

Os estados visuais atuais sao:

- Descansando.
- Treinando.
- Com fome.
- Cansado.
- Carente.
- Feliz.
- Tranquilo.

Quando esta cansado, o sprite se movimenta de forma bem mais lenta e sutil.

## Nivel e XP

A quantidade de XP necessaria aumenta a cada nivel:

```txt
XP necessario = 100 + nivel atual * 10
```

O nivel e todos os atributos continuam os mesmos quando a aparencia e
alterada.

## Evolucao e aparencias

As formas configuradas atualmente sao:

| Forma | Nivel de desbloqueio | Asset |
| --- | ---: | --- |
| Bulbasaur | 1 | Disponivel |
| Ivysaur | 16 | Pendente |
| Venusaur | 32 | Pendente |

Ao atingir o nivel necessario, o jogador pode:

- Evoluir e usar a nova forma imediatamente.
- Continuar com a forma atual.
- Trocar de aparencia depois pelo painel da Pokebola.

Evoluir nao altera nivel, XP ou atributos. Assim, um Pokemon de nivel 100
pode usar livremente as aparencias de Bulbasaur, Ivysaur ou Venusaur que ja
estiverem desbloqueadas.

Para ativar as formas pendentes, adicione:

```txt
assets/pokemons/IVYSAUR.webp
assets/pokemons/VENUSAUR.webp
```

O sistema detecta automaticamente se o arquivo configurado existe.

## Vinculo

O vinculo representa ha quantos dias o Pokemon esta ativo. Ele comeca em
`1 dia` e aumenta conforme o tempo real passa. O valor nao depende de treino,
comida ou evolucao.

## Ciclo de dia e noite

O gramado usa o fuso horario `America/Sao_Paulo`:

- Dia: das 06:00 ate 17:59.
- Noite: das 18:00 ate 05:59.

## Salvamento

O progresso e salvo automaticamente no `localStorage` do navegador com a
chave:

```txt
scrypet_tamagotchi_bulbasaur_v1
```

O salvamento inclui atributos, nivel, XP, mochila, historico, descanso,
aparencia selecionada, decisoes de evolucao e data inicial do vinculo.

Limpar os dados do site no navegador remove o progresso local.

## Adicionando novos Pokemon

Os Pokemon sao cadastrados no array `DEX` de `pokemon-data.js`.

Exemplo simplificado:

```js
{
  id: 'novo-pokemon',
  name: 'Novo Pokemon',
  type: 'Grass',
  typeClass: 'grass-type',
  img: 'assets/pokemons/NOVO-POKEMON.webp',
  forms: [
    {
      id: 'novo-pokemon',
      name: 'Novo Pokemon',
      unlockLevel: 1,
      img: 'assets/pokemons/NOVO-POKEMON.webp'
    }
  ],
  favoriteFood: 'Berry',
  moodLine: 'gosta de ficar no meio da grama.'
}
```

Para um sprite sheet animado, informe tambem:

```js
sprite: {
  src: 'assets/pokemons/NOVO-POKEMON.webp',
  frameWidth: 38,
  frameHeight: 38,
  frames: 49,
  sheetWidth: 1862
}
```

Cada forma pode ter seu proprio arquivo estatico ou sua propria configuracao
de sprite sheet.

## Estrutura do projeto

```txt
.
|-- assets/
|   |-- grass.png
|   `-- pokemons/
|       `-- BULBASAUR.webp
|-- index.html
|-- pokemon-data.js
|-- tamagotchi-system.js
|-- style.css
|-- app.js
`-- README.md
```

### Arquivos principais

- `index.html`: estrutura base e carregamento dos arquivos.
- `pokemon-data.js`: cadastro dos Pokemon, formas e assets.
- `tamagotchi-system.js`: estado, regras, acoes e renderizacao.
- `style.css`: interface, responsividade e animacoes.
- `assets/grass.png`: textura usada no gramado.
- `assets/pokemons/BULBASAUR.webp`: sprite sheet atual.
- `app.js`: versao anterior preservada e nao carregada pelo HTML atual.

## Tecnologias

- HTML5.
- CSS3.
- JavaScript puro.
- LocalStorage.

## Aviso

Este e um projeto de fas, sem afiliacao oficial com Nintendo, Game Freak ou
The Pokemon Company. Pokemon e seus personagens pertencem aos respectivos
detentores de direitos.
