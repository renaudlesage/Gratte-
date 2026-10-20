// Tablatures. n : [[corde (1 = Mi aigu … 6 = Mi grave), case], …], d : durée en croches (ou en doubles croches si res: 4), tie : note liée.
// tech : 'h' hammer-on, 'p' pull-off, '/' glissé montant, '\\' glissé descendant, 'pm' étouffé (palm mute).
const N = (s, f, d = 1, tech) => ({ n: [[s, f]], d, tech })
const C = (notes, d = 1, tech) => ({ n: notes, d, tech })
const X = (s, f, d, extra) => ({ n: [[s, f]], d, ...extra }) // note avec accord (ch) ou point d'orgue
const R = (d) => ({ n: [], d }) // silence

// Mélodie écrite en notation compacte : « [accord@]hauteur/durée[/parole] », « ~hauteur/durée » = note liée,
// « ^hauteur/durée » = point d'orgue, « -/durée » = silence, « | » = barre de mesure (ignorée).
// Hauteurs écrites pour la guitare (C4, F#4, Bb4…), placées automatiquement en 1re position.
// opts.transpose : demi-tons ajoutés (ex. −2 pour une partie de clarinette en si♭ jouée à la guitare).
// opts.mul : multiplie les durées (ex. 3 pour écrire en doubles croches avec des triolets « 1t » = 2/3).
const LETTER = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const OPEN_SOUND = [64, 59, 55, 50, 45, 40] // cordes 1 → 6, son réel
function place(written) {
  const s = written - 12 // la guitare sonne une octave sous l'écrit
  for (let str = 1; str <= 6; str++) {
    const f = s - OPEN_SOUND[str - 1]
    if (f >= 0 && f <= (str === 1 ? 12 : 4)) return [str, f]
  }
  throw new Error('Note hors de portée de la guitare : ' + written)
}
const NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
function melody(src, opts = {}) {
  const t = opts.transpose || 0
  return src.trim().split(/\s+/).filter((x) => x !== '|').map((tok) => {
    let ch
    if (tok.includes('@')) [ch, tok] = tok.split('@')
    const tie = tok.startsWith('~')
    const fermata = tok.startsWith('^')
    const [p, dRaw, ly] = tok.replace(/^[~^]/, '').split('/')
    const d = Math.round(parseFloat(dRaw) * (dRaw.endsWith('t') ? 2 / 3 : 1) * (opts.mul || 1))
    if (p === '-') return R(d)
    const m = p.match(/^([A-G])(#|b)?(\d)$/)
    if (!m) throw new Error('Hauteur inconnue : ' + p)
    const midi = 12 * (Number(m[3]) + 1) + LETTER[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + t
    const ev = { n: [place(midi)], d }
    // Note noire après transposition : dièse si la note écrite portait un dièse, bémol sinon (ex. Do♮ → Si♭)
    if (NAMES_SHARP[midi % 12].length > 1) ev.acc = m[2] === '#' ? '#' : 'b'
    if (ch) ev.ch = ch
    if (ly) ev.ly = ly
    if (tie) ev.tie = true
    if (fermata) ev.fermata = true
    return ev
  })
}

const spider = []
for (let s = 6; s >= 1; s--) for (let f = 1; f <= 4; f++) spider.push(N(s, f))

const pentaUp = [N(6, 5), N(6, 8), N(5, 5), N(5, 7), N(4, 5), N(4, 7), N(3, 5), N(3, 7), N(2, 5), N(2, 8), N(1, 5), N(1, 8)]

export const TABS = [
  {
    id: 'araignee',
    title: 'L’araignée (1-2-3-4)',
    kind: 'technique',
    level: 1,
    bpm: 60,
    beats: 4,
    tip: 'Un doigt par case : index case 1, majeur 2, annulaire 3, auriculaire 4, sur chaque corde. Échauffement idéal pour l’indépendance des doigts.',
    notes: spider,
  },
  {
    id: 'hammer-pull',
    title: 'Hammer-on et pull-off',
    kind: 'technique',
    level: 2,
    bpm: 60,
    beats: 4,
    tip: 'Hammer-on (h) : on attaque la première note, puis le doigt « frappe » la case suivante sans regratter. Pull-off (p) : on tire légèrement la corde en relevant le doigt.',
    notes: [N(3, 0), N(3, 2, 1, 'h'), N(3, 2), N(3, 0, 1, 'p'), N(3, 0), N(3, 2, 1, 'h'), N(3, 2), N(3, 0, 1, 'p'),
      N(2, 1), N(2, 3, 1, 'h'), N(2, 3), N(2, 1, 1, 'p'), N(2, 0), N(2, 1, 1, 'h'), N(2, 3, 1, 'h'), N(2, 1, 1, 'p')],
  },
  {
    id: 'glisses',
    title: 'Glissés',
    kind: 'technique',
    level: 2,
    bpm: 66,
    beats: 4,
    tip: 'Gardez la pression du doigt en glissant de la case de départ à la case d’arrivée : on n’attaque qu’une fois.',
    notes: [N(4, 2, 2), N(4, 4, 2, '/'), N(4, 4, 2), N(4, 2, 2, '\\'), N(3, 2, 2), N(3, 4, 2, '/'), N(3, 4, 2), N(3, 2, 2, '\\')],
  },
  {
    id: 'palm-mute',
    title: 'Riff rock étouffé (palm mute)',
    kind: 'technique',
    level: 2,
    bpm: 90,
    beats: 4,
    tip: 'Posez le tranchant de la main droite sur les cordes, juste devant le chevalet : le son devient court et percussif (PM). Relâchez pour les accents.',
    notes: [
      C([[6, 0], [5, 2]], 1, 'pm'), C([[6, 0], [5, 2]], 1, 'pm'), C([[6, 0], [5, 2]], 1, 'pm'), C([[6, 0], [5, 2]], 1, 'pm'),
      C([[6, 0], [5, 2]], 1, 'pm'), C([[6, 0], [5, 2]], 1, 'pm'), C([[6, 3], [5, 5]], 1), C([[6, 5], [5, 7]], 1),
      C([[6, 0], [5, 2]], 1, 'pm'), C([[6, 0], [5, 2]], 1, 'pm'), C([[6, 0], [5, 2]], 1, 'pm'), C([[6, 0], [5, 2]], 1, 'pm'),
      C([[5, 0], [4, 2]], 2), C([[6, 3], [5, 5]], 2),
    ],
  },
  {
    id: 'penta-la',
    title: 'Pentatonique de La mineur',
    kind: 'gamme',
    level: 2,
    bpm: 70,
    beats: 4,
    tip: 'Position 1, case 5 : index sur la case 5, annulaire sur la 7, auriculaire sur la 8. Montez puis redescendez, une note par croche.',
    notes: [...pentaUp, ...pentaUp.slice(0, -1).reverse(), N(6, 5, 1)],
  },
  {
    id: 'lick-blues',
    title: 'Phrase blues en La',
    kind: 'gamme',
    level: 3,
    bpm: 72,
    beats: 4,
    tip: 'Une phrase de 3 mesures à placer sur le blues en La (onglet Chansons, avec le groupe) : 4 répétitions = un tour de blues complet. Elle descend la pentatonique et finit sur la fondamentale.',
    notes: [N(1, 5, 2), N(2, 8), N(2, 5), N(3, 7), N(3, 5), N(4, 7, 2), N(3, 5), N(3, 7, 1, 'h'), N(2, 5, 2), N(3, 7, 2), N(4, 7, 4), { n: [], d: 6 }],
  },
  {
    id: 'hymne-joie',
    title: 'Hymne à la joie',
    kind: 'mélodie',
    by: 'Beethoven (1824)',
    level: 1,
    bpm: 80,
    beats: 4,
    tip: 'Tout se joue sur les deux cordes aiguës. Une note par temps, la dernière dure deux temps.',
    notes: [N(1, 0, 2), N(1, 0, 2), N(1, 1, 2), N(1, 3, 2), N(1, 3, 2), N(1, 1, 2), N(1, 0, 2), N(2, 3, 2),
      N(2, 1, 2), N(2, 1, 2), N(2, 3, 2), N(1, 0, 2), N(1, 0, 3), N(2, 3, 1), N(2, 3, 4)],
  },
  {
    id: 'clair-lune-melodie',
    title: 'Au clair de la lune (mélodie)',
    kind: 'mélodie',
    by: 'Traditionnel',
    level: 1,
    bpm: 90,
    beats: 4,
    tip: 'Trois notes seulement : Sol (corde 3 à vide), La (corde 3, case 2) et Si (corde 2 à vide).',
    notes: [N(3, 0, 2), N(3, 0, 2), N(3, 0, 2), N(3, 2, 2), N(2, 0, 4), N(3, 2, 4), N(3, 0, 2), N(2, 0, 2), N(3, 2, 2), N(3, 2, 2), N(3, 0, 8)],
  },
  {
    id: 'frere-jacques-melodie',
    title: 'Frère Jacques (mélodie)',
    kind: 'mélodie',
    by: 'Traditionnel',
    level: 1,
    bpm: 90,
    beats: 4,
    tip: 'Sur les cordes 2 et 3, plus un Ré grave (corde 4 à vide) à la fin. Idéal pour jouer en canon avec quelqu’un.',
    notes: [
      N(3, 0, 2), N(3, 2, 2), N(2, 0, 2), N(3, 0, 2), N(3, 0, 2), N(3, 2, 2), N(2, 0, 2), N(3, 0, 2),
      N(2, 0, 2), N(2, 1, 2), N(2, 3, 4), N(2, 0, 2), N(2, 1, 2), N(2, 3, 4),
      N(2, 3, 1), N(1, 0, 1), N(2, 3, 1), N(2, 1, 1), N(2, 0, 2), N(3, 0, 2), N(2, 3, 1), N(1, 0, 1), N(2, 3, 1), N(2, 1, 1), N(2, 0, 2), N(3, 0, 2),
      N(3, 0, 2), N(4, 0, 2), N(3, 0, 4), N(3, 0, 2), N(4, 0, 2), N(3, 0, 4),
    ],
  },
  // ---------- Morceaux du cours (transcrits des partitions de Ren) ----------
  {
    id: 'les-pompiers',
    title: 'Les pompiers',
    kind: 'cours',
    by: 'Traditionnel · « Les 2 premiers morceaux à la guitare »',
    level: 1,
    bpm: 70,
    beats: 2,
    tip: 'Main droite : posez le pouce sur la dernière corde (Mi grave) et alternez toujours majeur et index (m, i, m, i…). Trois notes : Sol (corde 3 à vide), Si (corde 2 à vide) et Ré (corde 4 à vide).',
    notes: [
      X(3, 0, 2, { ly: 'Au' }), X(3, 0, 2, { ly: 'feu' }),
      X(2, 0, 1, { ly: 'les' }), X(3, 0, 1, { ly: 'pom-' }), X(4, 0, 2, { ly: 'piers,' }),
      X(4, 0, 1, { ly: 'la' }), X(4, 0, 1, { ly: 'mai-' }), X(4, 0, 1, { ly: 'son' }), X(4, 0, 1, { ly: 'qui' }),
      X(2, 0, 2, { ly: 'brû-' }), X(3, 0, 2, { ly: 'le,' }),
      X(3, 0, 2, { ly: 'au' }), X(3, 0, 2, { ly: 'feu' }),
      X(2, 0, 1, { ly: 'les' }), X(3, 0, 1, { ly: 'pom-' }), X(4, 0, 2, { ly: 'piers,' }),
      X(4, 0, 1, { ly: 'v’là' }), X(4, 0, 1, { ly: 'la' }), X(4, 0, 1, { ly: 'mai-' }), X(4, 0, 1, { ly: 'son' }),
      X(3, 0, 4, { ly: 'brû-lée !' }),
    ],
  },
  {
    id: 'la-barbichette',
    sharps: 1, // armure : Sol majeur (Fa#)
    title: 'La barbichette',
    kind: 'cours',
    by: 'Traditionnel · « Les 2 premiers morceaux à la guitare »',
    level: 1,
    bpm: 72,
    beats: 2,
    tip: 'Les 2 premiers accords (G et D) en accompagnement : cochez « Accords ». Mesure 3 : restez sur la corde 3 (③), le La se fait avec le doigt 2. Avant-dernière note : Ré sur la corde 2, case 3 (②, doigt 3). Pouce posé sur la dernière corde, alternez m et i.',
    notes: [
      X(3, 0, 1, { ch: 'G', ly: 'Je' }), X(3, 0, 1, { ly: 'te' }), X(3, 0, 2, { ly: 'tiens,' }),
      X(3, 0, 1, { ly: 'tu' }), X(3, 0, 1, { ly: 'me' }), X(3, 0, 2, { ly: 'tiens' }),
      X(3, 0, 1, { ly: 'par' }), X(3, 2, 1, { ly: 'la' }), X(2, 0, 1, { ly: 'bar-' }), X(3, 0, 1, { ly: 'bi-' }),
      X(3, 2, 2, { ch: 'D', ly: 'chet-' }), X(4, 0, 2, { ly: 'te.' }),
      X(3, 0, 1, { ch: 'G', ly: 'Le' }), X(3, 0, 1, { ly: 'pre-' }), X(3, 0, 2, { ly: 'mier' }),
      X(3, 0, 1, { ly: 'de' }), X(3, 0, 1, { ly: 'nous' }), X(3, 0, 2, { ly: 'deux' }),
      X(3, 0, 1, { ly: 'qui' }), X(3, 0, 1, { ly: 'ri-' }), X(3, 2, 2, { ch: 'D', ly: 'ra' }),
      X(3, 0, 1, { ch: 'Em', ly: 'au-' }), X(3, 0, 1, { ly: 'ra' }), X(3, 2, 2, { ch: 'Am', ly: 'une' }),
      X(2, 3, 2, { ch: 'D', ly: 'ta-' }), X(3, 0, 2, { ch: 'G', ly: 'pette.' }),
    ],
  },
  {
    id: 'les-choux',
    title: 'Les choux',
    kind: 'cours',
    by: 'Traditionnel · partition du cours',
    level: 1,
    bpm: 80,
    beats: 2,
    tip: 'Mesure à 2 temps, presque tout en croches. Quatre notes : Ré (corde 4 à vide), Sol (corde 3 à vide), La (corde 3, case 2), Si (corde 2 à vide), plus un Do (corde 2, case 1) vers la fin.',
    notes: [
      N(4, 0), N(4, 0), N(2, 0), N(2, 0),
      N(3, 2), N(2, 0), N(3, 0, 2),
      N(3, 0), N(3, 0), N(3, 2), N(3, 2),
      N(3, 0), N(3, 2), N(2, 0), N(3, 0),
      N(4, 0), N(4, 0), N(2, 0), N(2, 0),
      N(3, 2), N(2, 0), N(3, 0, 2),
      N(3, 0), N(3, 0), N(3, 2), N(2, 1),
      N(2, 0), N(3, 2), N(3, 0, 2),
    ],
  },
  {
    id: 'joyeux-anniversaire',
    title: 'Joyeux anniversaire',
    kind: 'cours',
    by: 'Mildred et Patty Hill · partition du cours',
    level: 2,
    bpm: 90,
    beats: 3,
    tip: 'Valse à 3 temps qui commence par une levée de deux croches (« Joy-eux »). Le point d’orgue (𝄐) de la 6e mesure se tient un peu plus longtemps quand on chante. Cochez « Accords » pour entendre l’accompagnement de la 2e ligne.',
    notes: [
      R(4), N(3, 0), N(3, 0),
      N(3, 2, 2), N(3, 0, 2), N(2, 1, 2),
      N(2, 0, 4), N(3, 0), N(3, 0),
      N(3, 2, 2), N(3, 0, 2), N(2, 3, 2),
      N(2, 1, 4), N(3, 0), N(3, 0),
      X(1, 3, 2, { ch: 'C' }), N(1, 0, 2), X(2, 1, 2, { ch: 'C7' }),
      X(2, 0, 1, { ch: 'F' }), N(3, 2), X(3, 2, 2, { fermata: true }), N(1, 1), N(1, 1),
      X(1, 0, 2, { ch: 'C' }), N(2, 1, 2), X(2, 3, 2, { ch: 'G7' }),
      X(2, 1, 6, { ch: 'C' }),
    ],
  },
  // ---------- Recueil des Arquebusiers (parties de clarinette en si♭, jouées un ton plus bas à la guitare) ----------
  {
    id: 'li-vile-usteie',
    flats: 1, // Fa majeur (Sol majeur sur la partie de clarinette)
    sig: [6, 8],
    beats: 2, // deux temps (noire pointée)
    res: 6, // unité : double croche, 6 par temps
    u16: 1,
    beamGroup: 6,
    title: 'Li Vile Usteie',
    kind: 'arquebusiers',
    by: 'Air traditionnel de Visé · recueil des Arquebusiers, page 4',
    level: 2,
    bpm: 92,
    tip: 'À 6/8 : deux temps par mesure, chaque temps se divise en trois croches. Transcrit de la partie de clarinette en si♭ et transposé d’un ton vers le bas : vous jouez ainsi dans la même tonalité que la fanfare (Fa majeur). Enchaînement : levée, couplet, refrain, puis la dernière partie deux fois (1re et 2e fin). La 2e fin ramène au signe (début) : cochez « En boucle ».',
    notes: melody(`
      -/6 -/4 D4/2 |
      B4/4 B4/2 A#4/4 A4/2 | B4/6 D5/4 G4/2 | A4/4 G#4/2 A4/4 B4/2 | G4/6 -/4 B4/2 |
      B4/4 B4/2 C5/4 B4/2 | A4/6 C5/6 | B4/4 D4/2 B4/4 A4/2 | G4/6 -/4 D4/2 |
      C5/4 B4/2 D5/4 C5/2 | G#4/6 A4/4 B4/2 | D5/4 D5/2 E5/4 D5/2 | B4/6 -/4 B4/2 |
      A4/4 A4/2 G4/4 G4/2 | F#4/4 -/2 A4/6 | B4/4 B4/2 C5/4 C5/2 | D5/6 -/4 D4/2 |
      A4/4 G#4/2 A4/4 B4/2 | G4/6 -/4 G4/2 | A4/4 G#4/2 A4/4 B4/2 | D5/4 -/2 E5/6 |
      ~E5/4 D5/2 C5/2 B4/2 A4/2 | G4/4 -/2 D4/2 C#4/2 D4/2 | B4/6 A4/6 | G4/6 -/4 D4/2 |
      A4/4 G#4/2 A4/4 B4/2 | G4/6 -/4 G4/2 | A4/4 G#4/2 A4/4 B4/2 | D5/4 -/2 E5/6 |
      ~E5/4 D5/2 C5/2 B4/2 A4/2 | G4/4 -/2 D4/2 C#4/2 D4/2 | B4/6 A4/6 | G4/2 D4/2 E4/2 F#4/2 G4/2 A4/2
    `, { transpose: -2 }),
  },
  {
    id: 'li-vix-cinq',
    // Do majeur (Ré majeur sur la partie de clarinette)
    beats: 2,
    res: 12, // unité : 1/3 de double croche (triolets)
    title: 'Li Vix Cinq',
    kind: 'arquebusiers',
    by: 'Air traditionnel de Visé · recueil des Arquebusiers, page 5',
    level: 3,
    bpm: 104,
    tip: 'Marche à 2/4 en quatre parties, chacune jouée deux fois (reprises déjà déroulées ici, avec 1re et 2e fin). Transcrit de la partie de clarinette en si♭ et transposé d’un ton vers le bas : Do majeur, comme la fanfare. Attention au départ en triolet (Do-Ré-Mi rapides) et au rythme pointé (croche pointée + double croche) de la 3e partie. La 2e partie répète la même note : travaillez le rythme seul.',
    notes: (() => {
      const pick = '-/4 -/2 D4/1t E4/1t F#4/1t'
      const A = 'G4/4 D5/4 | B4/4 -/2 B4/1 D5/1 | C#5/2 B4/2 A4/2 G4/2 | D5/4 -/2 D4/1 F#4/1 | G4/3 A4/1 B4/3 C#5/1 | D5/4 -/3 E5/1 | D5/4 -/3 E5/1 | D5/4 -/3 E5/1 | D5/4 E5/3 C#5/1 | B4/4 A4/4 | G4/4 -/4 | -/8'
      const B = '-/2 D5/1 D5/1 D5/2 D5/1 D5/1 | D5/8 | ~D5/2 D5/1 D5/1 D5/2 D5/1 D5/1 | D5/8 | ~D5/2 D5/1 D5/1 D5/2 D5/1 D5/1 | D5/8 | ~D5/2 D5/1 D5/1 D5/2 D5/2'
      const C = 'D5/3 D5/1 D5/3 D5/1 | E5/2 D5/4 C#5/2 | B4/3 B4/1 C#5/1 B4/1 A4/1 B4/1 | C#5/2 A4/4 D5/2 | D5/4 D5/3 D5/1 | E5/2 D5/4 C#5/2 | B4/2 C#5/1 B4/1 A4/2 D5/2'
      const D1 = 'B4/4 C#5/1 B4/1 A4/1 B4/1 | C#5/2 A4/2 F#4/2 D4/2 | D5/4 C#5/1 D5/1 E5/1 D5/1 | C5/2 A4/2 F#4/2 D4/2'
      const D = `${D1} | ${D1} | D5/3 D5/1 D5/3 D5/1 | E5/2 D5/4 C#5/2 | B4/4 C#5/1 B4/1 A4/1 B4/1 | C#5/2 A4/4 D5/2 | D5/4 D5/3 D5/1 | E5/2 D5/4 C#5/2 | B4/2 C#5/1 B4/1 A4/2 D5/2`
      return melody([
        pick, A, pick, A, '-/8',
        B, 'D5/4 -/4', B, 'D5/4 -/3 D5/1',
        C, 'G4/1 D4/1 E4/1 F#4/1 G4/1 A4/1 B4/1 C#5/1', C, 'G4/4 -/2 D4/2',
        D, 'G4/4 -/2 D4/2', D, 'G4/4 -/4',
      ].join(' | '), { transpose: -2, mul: 3 })
    })(),
  },
  {
    id: 'brabanconne',
    res: 4, // durées en doubles croches (rythme pointé)
    title: 'La Brabançonne',
    kind: 'arquebusiers',
    by: 'Charles Rogier (paroles, 1860) · François Van Campenhout (musique, 1830) · hymne national belge, version de l’enseignement officiel',
    level: 3,
    bpm: 76,
    beats: 4,
    tip: 'En Do majeur, sans dièse. Le chant commence par une levée (« Ô Bel- ») : une demi-mesure de silence la précède ici pour garder les mesures alignées. Première position : Fa corde 4 case 3, Mi corde 4 case 2, Do corde 2 case 1, Ré corde 2 case 3, Mi aigu corde 1 à vide. Beaucoup de rythmes pointés (croche pointée + double croche) : comptez lentement, puis montez le tempo. Paroles du 1er couplet ; cochez « Accords » pour l’accompagnement.',
    notes: melody(`
      -/8 -/2 C@G4/2/Ô E4/3 F4/1/Bel- |
      G4/4/gi- A4/3/que, B4/1/ô C5/3/Mè- B4/1 C5/3/re E5/1/ché- |
      G@G4/8/ri- G4/2/e, -/1 B4/1/A B4/3/toi C5/1/nos |
      D5/8/cœurs, -/2 D5/2/à C5/3/toi B4/1/nos |
      C@C5/8/bras; -/4 -/2 A4/2/A |
      G4/4/toi A4/3/no- B4/1/tre C5/3/sang, B4/1 G@C5/3/ô D5/1/Pa- |
      B4/8/tri- B4/2/e, -/2 -/4 |
      G4/2/Nous G4/2/le G4/2/ju- B4/2/rons D5/4/tous, C5/3/tu A4/1/vi- |
      C@G4/8/vras! -/4 A4/3/Tu G4/1/vi- |
      G4/6/vras G4/2/tou- G4/4/jours G@A4/3/grande B4/1/et |
      D5/8/bel- C@C5/2/le, -/2 -/2 C5/2/Et |
      G@B4/4/ton B4/3/in- B4/1/vin- C@C5/3/ci- B4/1/ble C5/3/u- E5/1/ni- |
      G@D5/8/té -/4 -/2 G4/2/Au- |
      C@C5/4/ra C5/3/pour C5/1/de- C5/4/vise G@D5/3/im- C5/1/mor- |
      B4/6/tel- C5/2 D5/4/le: -/2 D5/2/Le |
      C@C5/6/Roi, C5/2/la C5/3/Loi, E5/1/la G@D5/3/Li- C5/1/ber- |
      B4/8/té, -/4 -/2 B4/2/Au- |
      C@C5/4/ra G4/2/pour G4/2/de- E5/2/vi- D5/2/se G@C5/3/im- B4/1/mor- |
      F@A4/8/tel- A4/2/le: -/2 -/2 G@D5/2/Le |
      C@C5/6/Roi, C5/2/la G@B4/3/Loi, A4/1/la B4/3/Li- D5/1/ber- |
      C@C5/8/té, -/4 G4/4/Le |
      C@E5/6/Roi, C5/2/la G@B4/3/Loi, G4/1/la A4/3/Li- G4/1/ber- |
      G4/8/té, -/4 G4/4/Le |
      C@E5/6/Roi, C5/2/la G@B4/3/Loi, G4/1/la B4/3/Li- D5/1/ber- |
      C@^C5/8/té. -/8
    `),
  },
  {
    id: 'tchant-walons',
    sharps: 2, // armure : Ré majeur (Fa#, Do#)
    res: 4, // durées en doubles croches (rythme pointé)
    title: 'Li tchant dès Walons',
    kind: 'arquebusiers',
    by: 'Théophile Bovy (paroles) · Louis Hillier (musique), © 1902 · hymne de la Wallonie',
    level: 3,
    bpm: 84,
    beats: 4,
    tip: 'Allegro marciale, en Ré majeur (Fa♯ et Do♯). Tout le chant repose sur le rythme pointé de la marche : croche pointée + double croche, long-court (« taaa-ta »). Première position : Fa♯ grave corde 4 case 4 (auriculaire), Do♯ corde 2 case 2, Ré corde 2 case 3, Fa♯ aigu corde 1 case 2, et un seul Sol♯ (corde 3, case 1). Les notes liées ne se rejouent pas. Paroles du 1er couplet ; cochez « Accords » pour l’accompagnement.',
    notes: melody(`
      D@F#4/4/Nos F#4/3/ès- F#4/1/tans A4/3/fîrs A4/1/di A4/3/nosse A4/1/pi- |
      D5/3/tite D5/1/pa- A4/4/trè- A4/3/ye F#4/1/Ca G4/3/lådje A4/1/èt |
      G@B4/4/long ~B4/3 C#5/1/on D5/4/djåse B4/4/di |
      A@C#5/3/sès D5/1/è- E5/8/fants; -/4 |
      D@F#4/4/Å F#4/3/pru- F#4/1/mî A4/3/rang A4/1/on A4/3/l'mèt' A4/1/po |
      D5/3/l'in- D5/1/dus- A4/4/trè- A4/3/ye F#4/1/Et G4/3/d'vins A4/1/lès |
      G@B4/3/årts G4/1/èle A@A4/3/ri- B4/1/gla- C#5/4/tih' ~C#5/3 D5/1/ot' |
      D@D5/12/tant. -/4 |
      D@A4/4/Nosse B4/3/tére C#5/1/èst D5/3/p'tite, F#4/1/mins E@G#4/3/nos A4/1/a- |
      A@B4/3/vans E4/1/l'ri- C#5/4/tchè- C#5/3/sse A4/1/Dès B4/3/o- C#5/1/mes |
      E7@E5/4/sin- E5/3/cieûs D5/1/qu'a- C#5/3/nô- B4/1/bli- A4/3/hèt B4/1/leû |
      A@C#5/16/nom; |
      D@D5/4/Et D5/3/nos D5/1/a- A4/3/vans A4/1/dès A4/3/lî- A4/1/bèr- |
      G@B4/3/tés B4/1/tim- D@F#4/4/pè- F#4/3/sse: D4/1/Vo- E4/3/la F#4/1/po- |
      A7@A4/4/qwè G4/3/qu'on F#4/1/z'est E4/4/fîr F#4/3/d'èsse G4/1/Wa- |
      D@F#4/16/lon! |
      D@D5/4/Et D5/3/nos D5/1/a- F#5/3/vans E5/1/dès D5/3/lî- C#5/1/bèr- |
      G@B4/3/tés D5/1/tim- D@D5/4/pè- D5/3/sse: F#4/1/Vo- A7@G4/3/la A4/1/po- |
      G@G4/8/qwè; B4/3 G4/1/Vo- A4/3/la B4/1/po- |
      A@C#5/12/qwè B4/3/qu'on B4/1/z'est |
      A@E5/8/fîr A7@E5/4/d'èsse D5/3 F#5/1/Wa- |
      D@D5/12/lon! -/4
    `),
  },
  {
    id: 'vive-le-vent',
    sharps: 1, // armure : Sol majeur (Fa#)
    title: 'Vive le vent (mélodie)',
    kind: 'cours',
    by: 'James Pierpont (1857) · partition du cours',
    level: 2,
    bpm: 100,
    beats: 4,
    partner: 'vive-le-vent-basse',
    tip: 'Tout se joue sur les cordes 2 et 3 : Si (corde 2 à vide), Do (case 1), Ré (case 3), Sol (corde 3 à vide), La (corde 3, case 2). Cochez « Entendre l’autre voix » pour jouer avec l’accompagnement.',
    notes: [
      N(2, 0), N(2, 0), N(2, 0, 2), N(2, 0), N(2, 0), N(2, 0, 2),
      N(2, 0), N(2, 3), N(3, 0), N(3, 2), N(2, 0, 4),
      N(2, 1), N(2, 1), N(2, 1, 2), N(2, 1), N(2, 0), N(2, 0, 2),
      N(2, 0), N(3, 2), N(3, 2), N(2, 0), N(3, 2, 2), N(2, 3, 2),
      N(2, 0), N(2, 0), N(2, 0, 2), N(2, 0), N(2, 0), N(2, 0, 2),
      N(2, 0), N(2, 3), N(3, 0), N(3, 2), N(2, 0, 4),
      N(2, 1), N(2, 1), N(2, 1, 2), N(2, 1), N(2, 0), N(2, 0, 2),
      N(2, 3), N(2, 3), N(2, 1), N(3, 2), N(3, 0, 4),
    ],
  },
  {
    id: 'vive-le-vent-basse',
    sharps: 1, // armure : Sol majeur (Fa#)
    title: 'Vive le vent (accompagnement)',
    kind: 'cours',
    by: 'Basse de la partition du cours',
    level: 2,
    bpm: 100,
    beats: 4,
    partner: 'vive-le-vent',
    tip: 'Basses alternées en croches : Sol grave (corde 6, case 3) et Ré (corde 4 à vide), puis Mi (corde 4, case 2) aux mesures 3 et 7, et La (corde 3, case 2) aux mesures 4 et 8. Cochez « Entendre l’autre voix » pour avoir la mélodie.',
    notes: [
      ...[1, 2].flatMap(() => [N(6, 3), N(4, 0), N(6, 3), N(4, 0), N(6, 3), N(4, 0), N(6, 3), N(4, 0)]),
      N(6, 3), N(4, 2), N(6, 3), N(4, 2), N(6, 3), N(4, 0), N(6, 3), N(4, 0),
      N(4, 0), N(3, 2), N(4, 0), N(3, 2), N(4, 0, 2), N(4, 0, 2),
      ...[1, 2].flatMap(() => [N(6, 3), N(4, 0), N(6, 3), N(4, 0), N(6, 3), N(4, 0), N(6, 3), N(4, 0)]),
      N(6, 3), N(4, 2), N(6, 3), N(4, 2), N(6, 3), N(4, 0), N(6, 3), N(4, 0),
      N(4, 0), N(3, 2), N(4, 0), N(4, 0), N(6, 3, 4),
    ],
  },
]
