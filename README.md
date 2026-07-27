# SuperPokégochi

Tamagotchi de Pokémon feito com HTML, CSS e JavaScript puro. O projeto funciona
sozinho, sem backend ou compilação, e salva o progresso no navegador com
`localStorage`.

![Prévia do SuperPokégochi](assets/superpokegochi-preview.png)

## O que já funciona

- Catálogo pesquisável com 1.025 espécies.
- Escolha de qualquer Pokémon do catálogo.
- Evoluções escolhidas pela primeira vez começam na forma inicial da linha.
- Nível, XP, vínculo e cuidados compartilhados pela linha evolutiva.
- Evolução opcional e troca livre entre as formas desbloqueadas.
- Sprites normais e Shiny animados em um gramado responsivo.
- Escala inteira de pixels para sprites mais nítidos em celulares.
- Controle de animações em **Automático**, **Ativado** ou **Desativado**.
- Fome, felicidade, energia, nível, XP e dias de vínculo.
- Comida, brincadeira, treino, descanso, mochila e histórico.
- Recompensa diária e ciclo de dia e noite no horário de Brasília.
- Aparência Shiny liberada com 30 dias de vínculo.
- Salvamento automático no navegador.

## Executar

Abra `index.html` diretamente ou inicie um servidor local:

```bash
python -m http.server 5182
```

Depois acesse `http://127.0.0.1:5182/`.

## Como cuidar e ganhar XP

| Ação | Resultado |
| --- | --- |
| Comida comum | Recupera fome e concede 4 XP |
| Fruta rara | Recupera mais fome e concede 8 XP |
| Brincar | Aumenta a felicidade e gasta energia |
| Treino | Minigame de três rodadas e principal fonte de XP |
| Descansar | Recupera 10 de energia e concede 4 XP a cada 30 minutos |

O XP do descanso considera o tempo transcorrido mesmo quando o jogo está
fechado. Cada período já recompensado fica registrado para não conceder o mesmo
XP duas vezes.

Com energia abaixo de 10, brincadeira e treino ficam bloqueados até o Pokémon
descansar. Ele ainda pode comer enquanto estiver acordado. Durante o descanso,
as demais ações ficam bloqueadas, mas o treinador pode encerrá-lo manualmente.

## Evolução e progresso compartilhado

O progresso pertence à linha evolutiva inteira, não a cada aparência.

```text
Ralts → Kirlia → Gardevoir
Nível compartilhado: 100
```

Ao alcançar o requisito, o treinador pode evoluir imediatamente ou continuar
com a forma atual. Depois de desbloqueada, qualquer forma da linha pode ser
usada novamente sem perder nível, XP, vínculo ou cuidados.

No catálogo completo, cada estágio evolutivo adicional é liberado a cada 16
níveis. Algumas linhas destacadas podem possuir configuração própria.

## Como trocar de Pokémon

Abra a **Pokébola no topo**, entre na aba **Pokémon** e escolha **Alterar Pokémon
companheiro**. A busca aceita nome, identificador ou número da Pokédex, como
`Pikachu`, `pikachu`, `25` ou `#025`.

Se uma evolução for escolhida e sua linha nunca tiver sido treinada, o cuidado
começa pela forma inicial. Se aquela forma já tiver sido desbloqueada, o jogo
recupera o progresso da linha e pode exibi-la imediatamente.

Os ícones de formas bloqueadas aparecem em cinza para facilitar a identificação.

## Animações e nitidez

Em **Pokébola → Pokémon → Animações**, escolha:

- **Automático**: acompanha a preferência de movimento reduzido do aparelho;
- **Ativado**: mantém as animações ligadas;
- **Desativado**: remove as animações.

As miniaturas do catálogo permanecem paradas para reduzir o consumo de recursos
em celulares. O companheiro principal continua animado conforme a configuração.

## Arquivos principais

```text
.
|-- assets/
|   |-- arrow-ios-back.svg
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

Para atualizar o catálogo depois de adicionar novos sprites:

```bash
node scripts/generate-pokemon-catalog.mjs
```

## Aviso

Projeto de fãs, sem afiliação oficial com Nintendo, Game Freak ou The Pokémon
Company. Pokémon e seus personagens pertencem aos respectivos detentores.
