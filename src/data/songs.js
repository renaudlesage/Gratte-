// Chansons du domaine public. Format : [Accord] marque le début d'une mesure ;
// une ligne commençant par « # » est un titre de section. Grilles simplifiées pour débuter.
export const SONGS = [
  {
    id: 'clair-de-la-lune',
    title: 'Au clair de la lune',
    by: 'Traditionnel (XVIIIe s.)',
    bpm: 90,
    beats: 4,
    text: `# Couplet
[G]Au clair de la [G]lune, [D]mon ami Pier-[G]rot,
[G]Prête-moi ta [G]plume [D]pour écrire un [G]mot.
[D]Ma chandelle est [Em]morte, [A7]je n'ai plus de [D]feu,
[G]Ouvre-moi ta [G]porte [D]pour l'amour de [G]Dieu.`,
  },
  {
    id: 'frere-jacques',
    title: 'Frère Jacques',
    by: 'Traditionnel',
    bpm: 100,
    beats: 4,
    text: `[G]Frère Jacques, [G]frère Jacques,
[G]Dormez-vous ? [G]Dormez-vous ?
[G]Sonnez les matines, [G]sonnez les matines,
[D]Ding, ding, dong ! [G]Ding, ding, dong !`,
  },
  {
    id: 'pres-de-ma-blonde',
    title: 'Auprès de ma blonde',
    by: 'Traditionnel (XVIIe s.)',
    bpm: 110,
    beats: 4,
    text: `# Couplet
[G]Dans les jardins d'mon [D]père, les lilas sont fleu-[G]ris,
[G]Tous les oiseaux du [D]monde viennent y faire leur [G]nid.
# Refrain
Au-[G]près de ma [G]blonde, qu'il fait [D]bon, fait bon, fait [G]bon,
Au-[G]près de ma [C]blonde, qu'il [D]fait bon dor-[G]mir.`,
  },
  {
    id: 'amazing-grace',
    title: 'Amazing Grace',
    by: 'John Newton (1779)',
    bpm: 80,
    beats: 3,
    text: `# Verse 1
A-[G]mazing [G]grace, how [C]sweet the [G]sound
That [G]saved a [G]wretch like [D]me. [D]
I [G]once was [G]lost, but [C]now am [G]found,
Was [G]blind but [D]now I [G]see. [G]
# Verse 2
'Twas [G]grace that [G]taught my [C]heart to [G]fear,
And [G]grace my [G]fears re-[D]lieved; [D]
How [G]precious [G]did that [C]grace ap-[G]pear
The [G]hour I [D]first be-[G]lieved. [G]`,
  },
  {
    id: 'oh-susanna',
    title: 'Oh! Susanna',
    by: 'Stephen Foster (1848)',
    bpm: 100,
    beats: 4,
    text: `# Verse
I [G]come from Ala-[G]bama with my [G]banjo on my [D]knee,
I'm [G]going to Loui-[G]siana, my [D]true love for to [G]see.
# Chorus
Oh! Su-[C]sanna, [C]oh don't you [G]cry for [D]me,
For I [G]come from Ala-[G]bama with my [D]banjo on my [G]knee.`,
  },
  {
    id: 'scarborough-fair',
    title: 'Scarborough Fair',
    by: 'Traditionnel anglais',
    bpm: 84,
    beats: 3,
    text: `Are you [Em]going to [Em]Scarbo-[D]rough [Em]Fair? [Em]
[G]Parsley, [Em]sage, rose-[G]mary and [A]thyme. [Em]
Re-[Em]member [G]me to [G]one who lives [D]there, [D]
She [Em]once was a [D]true love of [Em]mine. [Em]`,
  },
  {
    id: 'blues-mi',
    title: 'Blues en Mi (12 mesures)',
    by: 'Grille instrumentale',
    bpm: 90,
    beats: 4,
    text: `# Grille de blues
[E7] [E7] [E7] [E7]
[A7] [A7] [E7] [E7]
[B7] [A7] [E7] [B7]`,
  },
]

export const SONG_TEMPLATE = `# Couplet
[G]Première mesure [D]deuxième mesure
[Em]troisième [C]quatrième
# Refrain
[C] [G] [D] [D]`

// Analyse le texte : lignes, sections et liste ordonnée des mesures
export function parseSong(text) {
  const lines = []
  const bars = []
  String(text || '')
    .split('\n')
    .forEach((raw) => {
      const line = raw.replace(/\s+$/, '')
      if (!line.trim()) {
        lines.push({ type: 'blank' })
        return
      }
      if (line.trim().startsWith('#')) {
        lines.push({ type: 'section', text: line.trim().replace(/^#+\s*/, '') })
        return
      }
      const parts = []
      const re = /\[([^\]]+)\]/g
      let last = 0
      let m
      let pending = null
      while ((m = re.exec(line))) {
        const before = line.slice(last, m.index)
        if (pending !== null || before) parts.push({ chord: pending, text: before, bar: pending !== null ? bars.length - 1 : null })
        bars.push(m[1].trim())
        pending = m[1].trim()
        last = re.lastIndex
      }
      const rest = line.slice(last)
      if (pending !== null || rest) parts.push({ chord: pending, text: rest, bar: pending !== null ? bars.length - 1 : null })
      lines.push({ type: 'line', parts })
    })
  return { lines, bars }
}
