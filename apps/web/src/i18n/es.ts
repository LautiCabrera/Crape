/**
 * Español: idioma de referencia. Su forma define el tipo `Dictionary`,
 * así que a cualquier otro idioma que le falte un texto no compila.
 */
export const es = {
  tagline: 'Gana quien vacía primero su pozo de 11 cartas.',
  botName: 'Bot',
  you: 'Vos',
  player1: 'Jugador 1',
  player2: 'Jugador 2',
  yourName: 'Tu nombre',
  newGame: 'Nueva partida',

  mode: {
    label: 'Modo de juego',
    bot: 'Contra un bot',
    hotseat: 'Dos jugadores',
  },

  difficulty: {
    label: 'Dificultad del bot',
    easy: 'Fácil',
    normal: 'Normal',
    hard: 'Difícil',
  },

  settings: {
    title: 'Ajustes',
    close: 'Cerrar',
    language: 'Idioma',
    help: 'Ayuda de movimientos',
    helpFull: 'Completa',
    helpTargets: 'Solo destinos',
    helpNone: 'Sin ayuda',
    helpFullHint: 'Marca las cartas que tienen jugada y resalta los destinos válidos.',
    helpTargetsHint: 'Resalta los destinos válidos al seleccionar una carta, sin marcar cuáles tienen jugada.',
    helpNoneHint: 'No marca ni resalta nada: probás un destino y la mesa te dice si es válido.',
    botSpeed: 'Velocidad del bot',
    slow: 'Lenta',
    normal: 'Normal',
    fast: 'Rápida',
    confirmDiscard: 'Confirmar antes de descartar',
    confirmDiscardHint: 'Pide un segundo toque en la pila, porque descartar termina el turno y no se deshace.',
  },

  table: {
    center: 'Centro de la mesa',
    zoneOf: (name: string) => `Zona de ${name}`,
    inTurn: 'En turno',
    pozo: 'Pozo',
    discards: 'Descartes',
    hand: (count: number) => `Mano · ${count}`,
    yourHand: (count: number) => `Tu mano · ${count}`,
    stock: (count: number) => `Mazo · ${count}`,
    setAside: (count: number) => `Apartadas · ${count}`,
    next: (rank: string) => `Sigue ${rank}`,
    newLadder: 'Nueva escalera',
    pass: 'Pasar turno',
    quit: 'Salir',
    cardsInPozo: (count: number) => `${count} cartas en el pozo`,
    cardsInHand: (count: number) => `${count} cartas en la mano`,
    playOnLadder: (rank: string) => `Jugar en la escalera que sigue con ${rank}`,
    startLadder: 'Iniciar una escalera nueva',
    discardOnPile: (pile: number) => `Descartar en la pila ${pile}`,
    pile: (pile: number) => `Pila de descarte ${pile}`,
  },

  status: {
    turnOf: (name: string) => `Turno de ${name}`,
    start: 'Seleccioná una carta y después su destino.',
    playOrDiscard: 'Jugala en una escalera resaltada, o descartala en una de tus pilas para terminar el turno.',
    chooseLadder: 'Elegí la escalera resaltada donde querés jugarla.',
    choosePile: 'Elegí una de tus pilas de descarte: al descartar termina tu turno.',
    chooseDestination: 'Elegí una escalera para jugarla, o una de tus pilas para descartarla y terminar el turno.',
    confirmDiscard: 'Tocá de nuevo la misma pila para confirmar: descartar termina tu turno.',
    noMoves: 'Esa carta no tiene movimientos disponibles ahora.',
    aceFirst: 'Tenés un As disponible: hay que jugarlo antes de hacer otra cosa con esa carta.',
    aceForced: 'Tenés un As disponible: es obligatorio jugarlo.',
    canPass: 'No tenés cartas en la mano ni mazo para robar: jugá lo que puedas o pasá el turno.',
    invalid: 'Ese movimiento no es válido.',
  },

  events: {
    ladderCompleted: '¡Escalera completa! Sus cartas quedan apartadas hasta que se agote el mazo.',
    stockReshuffled: 'El mazo se agotó: se mezclaron las escaleras completas para seguir robando.',
    pozoRevealed: 'Se reveló una nueva carta del pozo.',
    handRefilled: 'Mano vacía: se roban cartas nuevas y el turno continúa.',
  },

  handoff: {
    gameStarts: 'Empieza la partida',
    turnChange: 'Cambio de turno',
    starterRule: 'Empieza quien tiene la carta visible del pozo más alta; si empatan, se sortea.',
    passDevice: 'Pasale el dispositivo. Su mano se muestra recién al continuar.',
    iAm: (name: string) => `Soy ${name}, continuar`,
  },

  end: {
    over: 'Partida terminada',
    youWon: '¡Ganaste!',
    won: (name: string) => `¡Ganó ${name}!`,
    emptiedIn: (turns: number) => `El pozo quedó vacío en ${turns} turnos.`,
    blocked: 'Partida bloqueada',
    blockedText: 'Se agotó el mazo y ningún jugador puede seguir. No hay ganador.',
    again: 'Jugar otra',
    home: 'Volver al inicio',
  },

  cards: {
    joker: 'Comodín',
    hearts: 'corazones',
    diamonds: 'diamantes',
    clubs: 'tréboles',
    spades: 'picas',
    name: (rank: string, suit: string) => `${rank} de ${suit}`,
    standsFor: (rank: string) => `vale ${rank}`,
  },
};

export type Dictionary = typeof es;
