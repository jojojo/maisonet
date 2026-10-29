export const kioskGameTitles = {
    'memory-match': 'Les paires de la maison',
    'whack-a-mole': 'Tape-taupe',
    'tic-tac-toe': 'Morpion',
    '2048': '2048',
    pong: 'Pong',
    breakout: 'Casse-briques',
    'dino-runner': 'Petit dinosaure',
    flappy: 'Petit oiseau',
    'fruit-ninja': 'Découpe de fruits',
    stack: 'La tour',
} as const;

export type KioskGameId = keyof typeof kioskGameTitles;
