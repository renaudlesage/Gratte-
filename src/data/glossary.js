// Glossaire du débutant : une phrase par mot, un exemple ou une image, et le niveau de vocabulaire.
//
// Niveaux (tiers) :
//   1 — mot de tous les jours qui prend un sens particulier à la guitare (case, à vide, grave…)
//       → piège : l'élève croit le connaître ;
//   2 — mot de musique, utile bien au-delà de la guitare (accord, tempo, mesure, transposer…)
//       → priorité : servent partout, rarement expliqués ;
//   3 — mot technique de guitariste (frette, barré, palm mute…) → expliqué au moment où il sert.
//
// Détection dans un texte (voir findTerms) :
//   forms     : formes cherchées (insensibles à la casse, frontières de mots, accents respectés)
//   before    : motif (source de RegExp, ancré par $) que le texte juste avant doit vérifier
//   notBefore : motif (ancré par $) que le texte juste avant ne doit pas vérifier
//   after     : le texte juste après doit commencer par ce motif
// Seule la 1re occurrence de chaque mot est repérée ; les formes longues passent en premier
// (« gamme pentatonique » avant « gamme », « mini-barré » avant « barré »).

export const TIERS = {
  1: { label: 'Mot courant, sens guitare', short: 'Sens guitare' },
  2: { label: 'Mot de musique', short: 'Musique' },
  3: { label: 'Mot de guitariste', short: 'Guitare' },
}

const NOTE_BEFORE = '(?:^|[^\\p{L}])(?:do|ré|re|mi|fa|sol|la|si|[a-g])(?:#|♯|b|♭)?\\s+$|accords?\\s+$'

export const GLOSSARY = [
  // ——— Tier 1 : mots courants, sens guitare
  {
    id: 'case',
    term: 'case',
    forms: ['case', 'cases'],
    tier: 1,
    def: 'L’espace entre deux frettes sur le manche ; « case 2 » veut dire la 2e en partant de la tête de la guitare.',
    ex: 'Comme les cases d’une marelle : on compte à partir du bout du manche.',
  },
  {
    id: 'a-vide',
    term: 'à vide',
    forms: ['à vide'],
    tier: 1,
    def: 'Une corde jouée à vide est grattée sans qu’aucun doigt n’appuie dessus.',
    ex: 'En tablature, c’est le chiffre 0.',
  },
  {
    id: 'etouffee',
    term: 'étouffée',
    forms: ['étouffée', 'étouffées', 'étouffé', 'étouffés', 'étouffer', 'étouffez', 'étouffe'],
    notBefore: '«[\\s\\u00a0\\u202f]*$',
    tier: 1,
    def: 'Une corde étouffée est empêchée de vibrer : elle fait « ploc » au lieu de sonner.',
    ex: 'Par accident (un doigt la frôle), c’est un défaut ; exprès (palm mute), c’est un effet.',
  },
  {
    id: 'friser',
    term: 'friser',
    forms: ['frise', 'frisent', 'friser', 'frisé'],
    tier: 1,
    def: 'Une corde qui frise fait un bruit de « bzzz » parce qu’elle touche une frette en vibrant.',
    ex: 'Souvent, le doigt est trop loin de la frette ou n’appuie pas assez.',
  },
  {
    id: 'manche',
    term: 'manche',
    forms: ['manche'],
    tier: 1,
    def: 'La longue partie de la guitare où la main gauche appuie sur les cordes.',
  },
  {
    id: 'grave-aigu',
    term: 'grave / aigu',
    forms: ['grave', 'graves', 'aigu', 'aiguë', 'aigus', 'aiguës'],
    notBefore: '(?:pas|si|rien de|c[’\']est)\\s+(?:très\\s+)?$',
    tier: 1,
    def: 'Un son grave est bas (comme une grosse voix), un son aigu est haut (comme un sifflet).',
    ex: 'Mi grave = la corde la plus grosse ; Mi aigu = la plus fine.',
  },
  {
    id: 'corne',
    term: 'corne',
    forms: ['corne'],
    tier: 1,
    def: 'La peau du bout des doigts qui s’épaissit en jouant et rend l’appui moins douloureux.',
    ex: 'Elle se forme en une à deux semaines de séances courtes.',
  },
  {
    id: 'mecanique',
    term: 'mécanique',
    forms: ['mécanique', 'mécaniques'],
    tier: 1,
    def: 'La clé, sur la tête de la guitare, que l’on tourne pour tendre ou détendre une corde.',
  },
  {
    id: 'chevalet',
    term: 'chevalet',
    forms: ['chevalet'],
    tier: 1,
    def: 'La pièce collée sur la caisse, où les cordes sont attachées côté main droite.',
  },
  {
    id: 'sillet',
    term: 'sillet',
    forms: ['sillet'],
    tier: 1,
    def: 'La petite barre crantée au bout du manche, près de la tête, où les cordes reposent.',
  },
  {
    id: 'position',
    term: 'position',
    forms: ['position'],
    after: '^[\\s\\u00a0]*\\d',
    tier: 1,
    def: 'Une zone du manche où la main reste sans se déplacer, chaque doigt ayant sa case.',
    ex: 'Pentatonique position 1 : l’index en case 5, les autres doigts juste après.',
  },
  {
    id: 'phalange',
    term: 'phalange',
    forms: ['phalange', 'phalanges'],
    tier: 1,
    def: 'Chacun des petits os du doigt, entre deux articulations.',
  },
  {
    id: 'majeur-doigt',
    term: 'majeur (doigt)',
    forms: ['majeur'],
    notBefore: NOTE_BEFORE,
    tier: 1,
    def: 'Le doigt du milieu, numéroté 2 sur les diagrammes.',
    ex: '1 = index, 2 = majeur, 3 = annulaire, 4 = auriculaire.',
  },
  {
    id: 'annulaire',
    term: 'annulaire',
    forms: ['annulaire'],
    tier: 1,
    def: 'Le doigt de la bague, entre le majeur et le petit doigt ; numéroté 3 sur les diagrammes.',
  },
  {
    id: 'auriculaire',
    term: 'auriculaire',
    forms: ['auriculaire'],
    tier: 1,
    def: 'Le petit doigt, numéroté 4 sur les diagrammes.',
  },

  // ——— Tier 2 : mots de musique
  {
    id: 'accord',
    term: 'accord',
    forms: ['accord', 'accords'],
    notBefore: '(?:^|[.!?«—–]\\s*|(?:être|suis|es|est|sommes|êtes|sont|mettre|mettez|tomber)\\s+)d[’\']$',
    tier: 2,
    def: 'Plusieurs notes jouées ensemble qui sonnent bien ; à la guitare, une forme de la main gauche.',
    ex: '{Em} est un accord : deux doigts posés, six cordes grattées.',
  },
  {
    id: 'majeur',
    term: 'majeur (accord)',
    forms: ['majeur', 'majeurs'],
    before: NOTE_BEFORE,
    tier: 2,
    def: 'Un accord majeur a une couleur lumineuse, joyeuse.',
    ex: '{G}, {C}, {D} sont majeurs. Sans rien après la lettre, un accord est majeur.',
  },
  {
    id: 'mineur',
    term: 'mineur',
    forms: ['mineur', 'mineurs'],
    tier: 2,
    def: 'Un accord mineur a une couleur plus sombre, plus triste ; on l’écrit avec un « m ».',
    ex: '{Em} = Mi mineur, {Am} = La mineur.',
  },
  {
    id: 'accord-7',
    term: 'accord de 7e',
    forms: ['accords de 7e', 'accord de 7e', 'accords de septième', 'accord de septième'],
    tier: 2,
    def: 'Un accord auquel on ajoute une 4e note qui crée une tension, typique du blues.',
    ex: '{E7} = {E} avec une note en plus, qui donne envie d’aller vers l’accord suivant.',
  },
  {
    id: 'tempo',
    term: 'tempo',
    forms: ['tempo', 'tempos'],
    tier: 2,
    def: 'La vitesse de la musique, mesurée en BPM.',
    ex: 'Ralentir le tempo, c’est jouer le même morceau plus lentement.',
  },
  {
    id: 'bpm',
    term: 'BPM',
    forms: ['bpm'],
    tier: 2,
    def: 'Battements par minute : le nombre de temps (de clics du métronome) en une minute.',
    ex: '60 BPM = un clic par seconde, comme la trotteuse d’une horloge.',
  },
  {
    id: 'metronome',
    term: 'métronome',
    forms: ['métronome', 'métronomes'],
    tier: 2,
    def: 'Un outil qui fait un clic régulier pour garder le tempo.',
  },
  {
    id: 'temps',
    term: 'temps',
    forms: ['temps'],
    before: '(?:^|[^\\p{L}])(?:\\d+e?|\\d+er|chaque|par|un|deux|trois|quatre|premier|dernier|du|des|le|ce)\\s+$',
    notBefore: '(?:prenez|prendre|prends|prend|avoir|avez|ai|a|en|tout|même)\\s+le\\s+$',
    tier: 2,
    def: 'La pulsation régulière de la musique, celle sur laquelle on tape du pied.',
    ex: 'Le métronome fait un clic par temps.',
  },
  {
    id: 'mesure',
    term: 'mesure',
    forms: ['mesure', 'mesures'],
    notBefore: '(?:à|dans\\s+la|sur)\\s+$',
    tier: 2,
    def: 'Un groupe de temps (souvent 4) ; on recommence à compter « 1 » à chaque mesure.',
    ex: '« 1, 2, 3, 4 | 1, 2, 3, 4 » : deux mesures de 4 temps.',
  },
  {
    id: 'croche',
    term: 'croche',
    forms: ['croche', 'croches'],
    tier: 2,
    def: 'Une durée d’un demi-temps : deux croches par clic, « 1 et 2 et… ».',
    ex: 'En croches, on gratte bas sur le chiffre, haut sur le « et ».',
  },
  {
    id: 'noire',
    term: 'noire',
    forms: ['noire', 'noires'],
    tier: 2,
    def: 'Une durée d’un temps : une note ou un coup par clic du métronome.',
  },
  {
    id: 'grille',
    term: 'grille',
    forms: ['grille', 'grilles'],
    tier: 2,
    def: 'La suite des accords d’une chanson, dans l’ordre où on les joue.',
    ex: '{G} – {D} – {Em} – {C} est une grille de 4 accords.',
  },
  {
    id: 'gamme',
    term: 'gamme',
    forms: ['gamme', 'gammes'],
    tier: 2,
    def: 'Une suite de notes choisies qui vont bien ensemble, jouées dans l’ordre.',
    ex: 'Do ré mi fa sol la si do est une gamme.',
  },
  {
    id: 'fondamentale',
    term: 'fondamentale',
    forms: ['fondamentale', 'fondamentales'],
    tier: 2,
    def: 'La note qui donne son nom à un accord ou à une gamme.',
    ex: 'Dans {Am} et dans la gamme de La, la fondamentale est La.',
  },
  {
    id: 'arpege',
    term: 'arpège',
    forms: ['arpège', 'arpèges', 'arpéger'],
    tier: 2,
    def: 'Jouer les notes d’un accord une par une au lieu de les gratter ensemble.',
    ex: 'Comme égrener un collier perle par perle.',
  },
  {
    id: 'transposer',
    term: 'transposer',
    forms: ['transposer', 'transposez', 'transposée', 'transposé', 'transposition'],
    tier: 2,
    def: 'Jouer une chanson plus haut ou plus bas en changeant tous ses accords de la même façon.',
    ex: 'Pour chanter plus confortablement, sans changer la mélodie.',
  },
  {
    id: 'tonalite',
    term: 'tonalité',
    forms: ['tonalité', 'tonalités'],
    tier: 2,
    def: 'La « maison » d’un morceau : la note et la gamme autour desquelles il tourne.',
    ex: 'Un blues en La revient toujours à l’accord de La.',
  },
  {
    id: 'shuffle',
    term: 'shuffle',
    forms: ['shuffle'],
    tier: 2,
    def: 'Un rythme qui balance : le « et » arrive un peu en retard, « ta-da, ta-da ».',
    ex: 'Le rythme du blues, comme un cheval au petit trot.',
  },
  {
    id: 'improviser',
    term: 'improviser',
    forms: ['improviser', 'improvisez', 'improvise', 'improvisation'],
    tier: 2,
    def: 'Inventer sa musique en jouant, sans partition, avec des notes qui vont bien.',
  },
  {
    id: 'riff',
    term: 'riff',
    forms: ['riff', 'riffs'],
    tier: 2,
    def: 'Une courte phrase musicale qui se répète et qu’on reconnaît tout de suite.',
  },
  {
    id: 'accordage',
    term: 'accorder',
    forms: ['accordage', 'accordages', 'accorder', 'accordez', 'accordée', 'accordé', 'désaccordée', 'désaccordé', 'désaccorde'],
    tier: 2,
    def: 'Régler la tension de chaque corde pour qu’elle donne la bonne note.',
    ex: 'Une guitare désaccordée sonne faux même avec les doigts bien placés.',
  },
  {
    id: 'accordeur',
    term: 'accordeur',
    forms: ['accordeur', 'accordeurs'],
    tier: 2,
    def: 'Un outil qui écoute une corde et dit si elle est trop haute, trop basse ou juste.',
  },

  // ——— Tier 3 : mots de guitariste
  {
    id: 'frette',
    term: 'frette',
    forms: ['frette', 'frettes'],
    tier: 3,
    def: 'Une des barrettes de métal posées en travers du manche ; elles séparent les cases.',
    ex: 'On appuie juste à côté d’une frette, pas dessus.',
  },
  {
    id: 'mediator',
    term: 'médiator',
    forms: ['médiator', 'médiators', 'mediator'],
    tier: 3,
    def: 'Un petit triangle en plastique tenu dans la main droite pour gratter les cordes.',
  },
  {
    id: 'diagramme',
    term: 'diagramme',
    forms: ['diagramme', 'diagrammes'],
    tier: 3,
    def: 'Le dessin d’un accord : les lignes verticales sont les cordes, les points les doigts, × = ne pas jouer, o = à vide.',
  },
  {
    id: 'tablature',
    term: 'tablature',
    forms: ['tablature', 'tablatures'],
    tier: 3,
    def: 'La partition des guitaristes : 6 lignes pour les 6 cordes, et des chiffres pour les cases.',
    ex: 'La ligne du haut est la corde la plus fine.',
  },
  {
    id: 'barre',
    term: 'barré',
    forms: ['barré', 'barrés', 'barrer', 'barrez'],
    tier: 3,
    def: 'L’index couché à plat appuie sur plusieurs cordes à la fois, comme le ferait un capodastre.',
    ex: 'Le barré de {F} : l’index sur les 6 cordes en case 1.',
  },
  {
    id: 'mini-barre',
    term: 'mini-barré',
    forms: ['mini-barré'],
    tier: 3,
    def: 'Un petit barré sur 2 cordes seulement, pour préparer le vrai barré.',
  },
  {
    id: 'capodastre',
    term: 'capodastre',
    forms: ['capodastre', 'capodastres', 'capo'],
    tier: 3,
    def: 'Une pince posée en travers du manche qui fait un barré à votre place et rend tout plus aigu.',
    ex: 'Capo en case 2 : les mêmes formes d’accords sonnent un ton plus haut.',
  },
  {
    id: 'power-chord',
    term: 'power chord',
    forms: ['power chord', 'power chords'],
    tier: 3,
    def: 'Un accord de deux ou trois notes (la fondamentale et sa quinte), ni majeur ni mineur, base du rock.',
    ex: '{E5} : la corde de Mi grave à vide et la case 2 de la corde de La.',
  },
  {
    id: 'palm-mute',
    term: 'palm mute',
    forms: ['palm mute'],
    tier: 3,
    def: 'Étouffer légèrement les cordes avec le tranchant de la main droite, près du chevalet, pour un son court et sourd.',
  },
  {
    id: 'hammer-on',
    term: 'hammer-on',
    forms: ['hammer-on', 'hammer-ons', 'hammer on'],
    tier: 3,
    def: 'Faire sonner une note en frappant la corde avec un doigt de la main gauche, sans regratter.',
    ex: 'Comme un petit marteau (« hammer » en anglais).',
  },
  {
    id: 'pull-off',
    term: 'pull-off',
    forms: ['pull-off', 'pull-offs', 'pull off'],
    tier: 3,
    def: 'Faire sonner une note en retirant un doigt qui accroche légèrement la corde au passage.',
    ex: 'L’inverse du hammer-on : on « tire » (« pull ») la corde en partant.',
  },
  {
    id: 'glisse',
    term: 'glissé',
    forms: ['glissé', 'glissés'],
    tier: 3,
    def: 'Faire glisser un doigt d’une case à une autre en gardant la pression, la note change sans regratter.',
  },
  {
    id: 'lies',
    term: 'liés',
    forms: ['notes liées', 'liés'],
    tier: 3,
    def: 'Les notes jouées sans regratter : hammer-on, pull-off et glissés.',
  },
  {
    id: 'pentatonique',
    term: 'pentatonique',
    forms: ['gamme pentatonique', 'pentatonique', 'pentatoniques'],
    tier: 3,
    def: 'Une gamme de cinq notes qui sonnent bien sur presque tout un blues ou un rock.',
    ex: '« Penta » veut dire cinq.',
  },
  {
    id: 'doigt-pivot',
    term: 'doigt pivot',
    forms: ['doigt pivot', 'doigt guide'],
    tier: 3,
    def: 'Un doigt qui reste sur sa corde (ou y glisse) pendant un changement d’accord et guide les autres.',
  },
  {
    id: 'travis',
    term: 'Travis',
    forms: ['travis'],
    tier: 3,
    def: 'Un jeu aux doigts où le pouce alterne deux basses pendant que les autres doigts jouent la mélodie.',
  },
  {
    id: 'defi-minute',
    term: 'défi minute',
    forms: ['défi minute'],
    tier: 3,
    def: 'Dans l’appli : compter combien de changements propres entre deux accords vous faites en 60 secondes.',
  },
]

export const GLOSSARY_MAP = Object.fromEntries(GLOSSARY.map((g) => [g.id, g]))

// ——— Détection
const IS_WORD = /[\p{L}\p{N}]/u
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Espaces souples (insécables compris) et tirets facultatifs entre les mots d'une forme
const formSource = (f) =>
  f
    .split(/([\s-])/)
    .map((p) => (p === ' ' ? '[\\s\\u00a0\\u202f]+' : p === '-' ? '[-\\u2011\\s]?' : escapeRe(p)))
    .join('')

const COMPILED = GLOSSARY.map((g) => ({
  g,
  len: Math.max(...g.forms.map((f) => f.length)),
  re: new RegExp(g.forms.map(formSource).sort((a, b) => b.length - a.length).join('|'), 'giu'),
  before: g.before ? new RegExp(`(?:${g.before})`, 'iu') : null,
  notBefore: g.notBefore ? new RegExp(`(?:${g.notBefore})`, 'iu') : null,
  after: g.after ? new RegExp(g.after, 'iu') : null,
})).sort((a, b) => b.len - a.len)

// Première occurrence valable de chaque mot du glossaire : [{ start, end, id }] triés
export function findTerms(text, { exclude = [] } = {}) {
  const s = String(text ?? '')
  const taken = []
  const overlaps = (a, b) => taken.some((t) => a < t.end && b > t.start)
  for (const c of COMPILED) {
    if (exclude.includes(c.g.id)) continue
    c.re.lastIndex = 0
    let m
    while ((m = c.re.exec(s))) {
      const start = m.index
      const end = start + m[0].length
      if (!m[0].length) {
        c.re.lastIndex++
        continue
      }
      if (start > 0 && IS_WORD.test(s[start - 1])) continue
      if (end < s.length && IS_WORD.test(s[end])) continue
      const prev = s.slice(Math.max(0, start - 40), start)
      if (c.before && !c.before.test(prev)) continue
      if (c.notBefore && c.notBefore.test(prev)) continue
      if (c.after && !c.after.test(s.slice(end, end + 20))) continue
      if (overlaps(start, end)) continue
      taken.push({ start, end, id: c.g.id })
      break
    }
  }
  return taken.sort((a, b) => a.start - b.start)
}

// Découpe le texte en morceaux : { text } ou { text, id } pour un mot du glossaire
export function glossarySegments(text, opts) {
  const s = String(text ?? '')
  const out = []
  let i = 0
  for (const t of findTerms(s, opts)) {
    if (t.start > i) out.push({ text: s.slice(i, t.start) })
    out.push({ text: s.slice(t.start, t.end), id: t.id })
    i = t.end
  }
  if (i < s.length) out.push({ text: s.slice(i) })
  return out
}

// Pour une suite de textes (les étapes d'une leçon) : ne repérer chaque mot qu'à sa 1re apparition.
// Renvoie, pour chaque texte, la liste des mots à exclure (prop `exclude` de <GlossaryText>).
export function glossaryExcludes(texts) {
  const seen = []
  return texts.map((t) => {
    const ex = [...seen]
    for (const f of findTerms(t, { exclude: ex })) seen.push(f.id)
    return ex
  })
}
