# CRAPE — Especificación del motor de reglas

Estado: borrador del Paso 2. Los tipos están escritos en notación tipo TypeScript, pero la
especificación es independiente del lenguaje.

Leyenda: **[C]** regla confirmada · **[P]** provisional, pendiente de confirmación.

## 1. Configuración

Todos los números del juego son parámetros, no constantes dispersas en el código.

| Parámetro | Valor | Estado |
|---|---|---|
| `deckCount` (mazos) | 2 | [C] — un tercer mazo queda a evaluar con datos de simulación |
| `jokersPerDeck` | 2 (4 comodines, 108 cartas) | [C] |
| `pozoSize` | 11 | [C] |
| `handSize` | 5 | [C] |
| `discardPileCount` | 3 | [C] |
| Máximo de escaleras simultáneas | sin límite (el natural son los Ases existentes) | [C] |

## 2. Reglas

### Preparación
- R1 [C] Se mezclan todos los mazos juntos.
- R2 [C] Cada jugador recibe 11 cartas de pozo; solo la superior está visible.
- R3 [C] Cada jugador recibe 5 cartas de mano.
- R4 [C] El resto forma el mazo compartido de robo (76 cartas con la configuración base).
- R5 [P] Empieza quien tenga la carta visible del pozo más alta. Falta definir el desempate
  y cuánto vale un comodín en esa comparación (propuesta: empate → sorteo; comodín → la más alta).
  Se implementa como estrategia intercambiable.

### Turno
- R6 [C] Al iniciar el turno, el jugador roba hasta completar 5 cartas en la mano.
- R7 [C] Fuentes de juego: cualquier carta de la mano, la carta visible del propio pozo y la
  carta superior de cualquiera de las tres pilas de descarte propias, en cualquier momento del turno.
- R8 [C] Una escalera nueva solo se inicia con un As. Una escalera existente solo acepta el
  valor siguiente (A → 2 → … → K). Palos y colores no importan.
- R9 [C] El comodín vale cualquier carta excepto As, incluido el Rey. Su valor queda fijado
  por la posición que ocupa en la escalera.
- R10 [C] Se pueden iniciar varias escaleras en un mismo turno.
- R11 [C] Al jugar la carta del pozo se revela de inmediato la siguiente, que queda disponible
  en el mismo turno.
- R12 [C] Si la mano queda vacía por jugar cartas en escaleras, se roban 5 automáticamente y
  el turno continúa.
- R13 [C] Los Ases son de juego obligatorio; el resto de las jugadas es voluntario.
  Interpretación [P]: no se puede finalizar el turno mientras haya un As en la mano o como
  carta visible del pozo. Consecuencia: un As nunca puede descartarse.
- R14 [C] Todos los movimientos son irreversibles.

### Fin del turno
- R15 [C] El turno termina descartando exactamente una carta de la mano en una de las tres
  pilas propias. No se descarta desde el pozo ni se mueven cartas entre pilas. Los comodines
  pueden descartarse.
- R16 [C] Las pilas de descarte son visibles completas para ambos jugadores (abanico vertical),
  pero solo se puede jugar la carta superior.

### Escaleras completas y mazo
- R17 [C] Al llegar al Rey, la escalera se retira de la mesa y sus cartas se apartan
  (pila de reciclaje).
- R18 [C] Cuando el mazo de robo se agota, la pila de reciclaje se mezcla y pasa a ser el nuevo mazo.
- R19 [P] Si mazo y reciclaje están vacíos: se roba lo que haya. Un jugador sin cartas en la
  mano puede pasar el turno sin descartar (único caso). Si ambos pasan consecutivamente sin
  haber jugado ninguna carta, la partida termina como "bloqueada", sin ganador.
  Esto es una salvaguarda técnica para que el motor nunca quede en un estado indefinido;
  no pretende ser una regla del juego original.

### Victoria
- R20 [C] Gana quien juega la última carta de su pozo. La partida termina en ese instante,
  aun a mitad de turno. La mano y los descartes no cuentan.

### Orden de resolución de una jugada
1. Validar la jugada.
2. Mover la carta a la escalera.
3. Si la escalera llegó al Rey → pasa a la pila de reciclaje.
4. Si salió del pozo: si el pozo quedó vacío → victoria y fin. Si no, revelar la siguiente.
5. Si la mano quedó vacía → robar 5 (el paso 3 va antes para que esas cartas ya sean reciclables).

## 3. Modelo de datos

```ts
type Rank = 1 | 2 | ... | 13            // 1 = As, 11 = J, 12 = Q, 13 = K
type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'

type Card =
  | { id: string; kind: 'standard'; rank: Rank; suit: Suit }
  | { id: string; kind: 'joker' }

type Ladder = { id: string; cards: Card[] }   // valor siguiente = cards.length + 1

type PlayerState = {
  pozo: Card[]                 // el último elemento es la carta visible
  hand: Card[]
  discards: Card[][]           // 3 pilas; el último elemento de cada una es el tope
}

type GameStatus =
  | { kind: 'playing' }
  | { kind: 'won'; winner: PlayerId }
  | { kind: 'blocked' }        // solo por R19

type GameState = {
  config: GameConfig
  players: [PlayerState, PlayerState]
  stock: Card[]                // mazo de robo
  recycle: Card[]              // escaleras completas apartadas
  ladders: Ladder[]
  currentPlayer: PlayerId      // 0 | 1
  turnNumber: number
  status: GameStatus
  rng: RngState                // generador con semilla: partidas reproducibles
}
```

El estado es inmutable: cada operación devuelve un estado nuevo.

## 4. Acciones

```ts
type Source =
  | { from: 'hand'; cardId: string }
  | { from: 'pozo' }
  | { from: 'discard'; pile: number }

type Target =
  | { to: 'ladder'; ladderId: string }
  | { to: 'newLadder' }

type Action =
  | { type: 'play'; source: Source; target: Target }
  | { type: 'endTurn'; cardId: string; pile: number }
  | { type: 'pass' }           // solo válido en el caso de R19
```

## 5. API del motor

```ts
createGame(config, seed): GameState
applyAction(state, player, action): { ok: true; state; events } | { ok: false; error }
getLegalActions(state, player): Action[]      // para resaltar movimientos válidos
getPlayerView(state, player): PlayerView      // lo único que recibe un cliente online
```

`getPlayerView` oculta: la mano del rival, las cartas no reveladas de ambos pozos (también las
propias), y el orden del mazo y de la pila de reciclaje. Expone solo cantidades.

### Errores de validación
`GAME_FINISHED`, `NOT_YOUR_TURN`, `CARD_NOT_AVAILABLE`, `INVALID_PILE`, `LADDER_NOT_FOUND`,
`NEW_LADDER_REQUIRES_ACE`, `JOKER_CANNOT_BE_ACE`, `WRONG_RANK`, `ACE_MUST_BE_PLAYED`,
`PASS_NOT_ALLOWED`.

### Eventos (para animaciones y sincronización)
`CardPlayed`, `PozoRevealed`, `LadderStarted`, `LadderCompleted`, `CardsDrawn`,
`StockReshuffled`, `TurnEnded`, `GameWon`, `GameBlocked`.

## 6. Invariantes (se verifican en los tests)

- La cantidad total de cartas es siempre 108 y ningún `id` se repite.
- La mano nunca supera 5 cartas.
- Toda escalera empieza en As y es estrictamente secuencial; ninguna tiene 13 cartas en la mesa.
- Ninguna pila de descarte contiene un As (consecuencia de R13).
- Solo el jugador en turno puede modificar el estado.
- Con estado `won` o `blocked` ninguna acción es válida.

## 7. Casos de prueba mínimos

- Reparto: 11 + 5 por jugador, 76 en el mazo, misma semilla → misma partida.
- La partida de ejemplo del documento original, con el mazo armado a mano.
- Comodín: válido como 2…K, rechazado como As, cierra escalera como Rey.
- Cadena de pozo: jugar la carta visible revela la siguiente y permite jugarla.
- Mano vacía por jugadas → roba 5; mano vacía por descarte → no roba hasta su próximo turno.
- Inicio de turno con 0, 1 y 3 cartas → roba 5, 4 y 2.
- No se puede terminar el turno con un As en mano o en el pozo.
- Solo se juega el tope de cada pila de descarte; no existe una cuarta pila.
- Escalera completa → reciclaje; mazo agotado → se mezcla el reciclaje.
- Última carta del pozo → victoria inmediata, incluso con jugadas disponibles.
- Agotamiento total (R19).
- Partidas completas aleatorias con bots que verifican los invariantes en cada paso.

## 8. Puntos abiertos

1. R13: alcance exacto de la obligatoriedad de los Ases.
2. R5: desempate y valor del comodín al decidir quién empieza.
3. R19: comportamiento ante agotamiento total del mazo.
4. Tercer mazo: decidir con la frecuencia de agotamiento que arrojen las simulaciones.
5. Stack: TypeScript de punta a punta o motor en Java / Spring Boot.
