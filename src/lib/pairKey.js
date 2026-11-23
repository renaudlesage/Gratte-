// Clé d'une paire d'accords, indépendante de l'ordre (Em|Am = Am|Em)
export const pairKey = (a, b) => [a, b].sort().join('|')
