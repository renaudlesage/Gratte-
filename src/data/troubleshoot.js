// « Ça coince ? » : arbre de diagnostic des blocages de débutant.
//
// Principe (diagnostic avant l'aide, aide minimale d'abord) :
//   1. Le symptôme est formulé comme le débutant le vit.
//   2. 1 ou 2 questions à réponses en un toucher distinguent les causes
//      (option → `next` : question suivante, ou `cause` : cause trouvée).
//   3. Pour la cause, 3 indices dévoilés un à un :
//      piste (une question qui oriente) → consigne précise → exemple guidé.
//   4. Une action dans l'appli pour s'entraîner, puis « Ça marche mieux ? ».
//      « Toujours pas » → cause suivante de `order`, puis `fallback` (revenir à plus simple).
//   5. `check` : le réflexe pour repérer ce souci tout seul la prochaine fois.
//
// Type de cause (pour adapter la réponse, pas pour juger) : voir TYPES.
// Dans les textes, {Em} désigne un accord (affiché selon la notation, voir lib/chordText.js).
// Dans les actions, les valeurs '$chord', '$pair', '$chords', '$pattern', '$barre' sont remplacées
// par le contexte de l'écran (voir resolveAction) ; `defaults` sert quand le contexte manque.

export const TYPES = {
  geste: {
    label: 'Un geste à ajuster',
    help: 'Vous savez quoi faire : c’est la façon de le faire qui se règle, en répétant lentement.',
  },
  idee: {
    label: 'Une idée à éclaircir',
    help: 'Il manque une information ou une règle. Une fois comprise, le problème disparaît.',
  },
  methode: {
    label: 'Une façon de s’entraîner à changer',
    help: 'Le travail est là, mais la manière de s’exercer vous freine.',
  },
  reflexe: {
    label: 'Un réflexe de vérification',
    help: 'Vous savez le faire, il suffit de prendre l’habitude de vérifier.',
  },
  materiel: {
    label: 'Ça vient de la guitare, pas de vous',
    help: 'Le réglage ou l’état de l’instrument est en cause.',
  },
  corps: {
    label: 'Votre corps vous prévient',
    help: 'Écoutez-le : la bonne réponse est souvent de faire moins, ou autrement.',
  },
}

const BARRE_CHORDS = ['F', 'Bm', 'F#m', 'B']

// Causes partagées par plusieurs symptômes
const VOISIN = {
  title: 'Un doigt voisin frôle la corde',
  type: 'geste',
  hints: [
    'Une corde a besoin de place pour vibrer. Regardez les doigts posés sur les cordes d’à côté : est-ce que l’un d’eux la touche, même un tout petit peu ?',
    'Cambrez le doigt voisin : il doit arriver sur sa corde par le bout, la phalange bien arrondie, comme un petit marteau. Avancez un peu le poignet sous le manche pour laisser de la place.',
    'Exemple sur {Em} : la corde de Sol (3) est souvent étouffée par l’annulaire posé sur la corde de Ré. Jouez la corde de Ré, puis celle de Sol, une par une. Si Sol fait « ploc », redressez l’annulaire jusqu’à voir un petit espace sous le doigt, puis rejouez Sol.',
  ],
  check: 'Après avoir posé un accord, jouez les cordes une par une, de la plus grosse à la plus fine : c’est le contrôle qualité du guitariste.',
  action: { label: 'Vérifier {$chord} au micro', tab: 'accords', params: { focus: '$chord' }, defaults: { chord: 'Em' } },
}

const POSITION = {
  title: 'Le doigt est trop loin de la frette',
  type: 'geste',
  hints: [
    'Regardez où le bout de votre doigt touche la corde. Est-il près de la barre métallique (la frette) ou au milieu de la case ?',
    'Placez le bout du doigt tout près de la frette qui ferme la case, du côté de la caisse de la guitare : presque contre elle, mais pas dessus. Rejouez cette corde seule.',
    'Exemple sur {Em} : le majeur est sur la corde de La, case 2. Posez-le à 2 ou 3 mm de la frette entre la case 2 et la case 3. Jouez la corde de La seule. Si elle frise encore, rapprochez le doigt d’un millimètre et rejouez. Faites pareil pour l’annulaire.',
  ],
  check: 'Avant de gratter, un coup d’œil : chaque doigt est-il collé à « sa » frette ?',
  action: { label: 'Vérifier {$chord} au micro', tab: 'accords', params: { focus: '$chord' }, defaults: { chord: 'Em' } },
}

const PRESSION = {
  title: 'Le doigt n’appuie pas assez',
  type: 'geste',
  hints: [
    'Pour sonner, la corde doit être plaquée contre la frette. Est-ce que la vôtre la touche vraiment ?',
    'Grattez la corde en boucle tout en appuyant de plus en plus : au début le son frise, puis il devient net. Arrêtez d’augmenter à ce moment-là : c’est la bonne force. Le pouce, derrière le manche, sert d’appui.',
    'Exemple : sur la corde de Mi aigu, case 3, posez l’auriculaire sans appuyer et grattez toutes les secondes. Appuyez un peu plus à chaque coup. Comptez au bout de combien de coups le son est net, puis gardez exactement cette force.',
  ],
  check: 'Si une note frise, demandez-vous d’abord : « mon doigt est-il près de la frette ? », puis seulement « est-ce que j’appuie assez ? ».',
  action: { label: 'Vérifier {$chord} au micro', tab: 'accords', params: { focus: '$chord' }, defaults: { chord: 'Em' } },
}

const ANGLE = {
  title: 'Le doigt est couché à plat',
  type: 'geste',
  hints: [
    'Avec quelle partie du doigt touchez-vous la corde : le bout, ou le plat (la pulpe) ?',
    'Posez le doigt sur le bout, phalange arrondie, ongle court. Le pouce descend un peu derrière le manche : la main s’ouvre et les doigts se redressent tout seuls.',
    'Exemple : faites un « C » avec la main gauche comme pour tenir une balle de tennis. Gardez cette forme et posez-la sur le manche. Les doigts arrivent sur les cordes par le haut, comme des marteaux, et ne touchent plus les cordes voisines.',
  ],
  check: 'Regardez vos ongles : si vous voyez le plat du doigt sur la corde, redressez. Des ongles courts aident beaucoup.',
  action: { label: 'Vérifier {$chord} au micro', tab: 'accords', params: { focus: '$chord' }, defaults: { chord: 'Em' } },
}

const NE_PAS_ARRETER = {
  title: 'La main droite s’arrête pendant le changement',
  type: 'methode',
  hints: [
    'Dans une chanson, la musique attend-elle votre main gauche ?',
    'La main droite ne s’arrête jamais. Sur le dernier temps de la mesure, lâchez l’accord et grattez les cordes à vide pendant que la main gauche part vers l’accord suivant.',
    'Exemple {G} → {C} à 60 BPM : comptez « 1, 2, 3, 4 ». Sur le 4, la main gauche se soulève, la droite gratte les cordes à vide. Sur le 1 suivant, {C} est posé. Ce petit son à vide passe inaperçu dans une chanson.',
  ],
  check: 'Écoutez-vous : s’il y a un trou dans le rythme au changement, c’est que la main droite a attendu.',
  action: {
    label: 'Enchaînement lent à 60 BPM',
    tab: 'pratique',
    params: { mode: 'enchainement', chords: '$chords', bpm: 60 },
    defaults: { chords: ['G', 'C'] },
  },
}

export const SYMPTOMS = [
  {
    id: 'frise',
    label: 'Une corde frise',
    sub: 'Un bruit de « bzzz » au lieu d’une note nette',
    icon: '〰️',
    tags: ['accord', 'barre', 'tab'],
    intro: 'C’est le souci n°1 des débutants, et il se règle presque toujours. Trouvons d’où il vient.',
    questions: [
      {
        id: 'q1',
        text: 'Jouez les cordes une par une. Celle qui frise, c’est :',
        options: [
          { label: 'Une corde où j’ai un doigt', next: 'q2' },
          { label: 'Une corde à vide (sans doigt)', cause: 'voisin' },
          { label: 'Elle frise même sans rien appuyer', cause: 'guitare' },
        ],
      },
      {
        id: 'q2',
        text: 'Regardez le bout de ce doigt. Il est :',
        options: [
          { label: 'Au milieu de la case, ou loin de la frette', cause: 'position' },
          { label: 'Tout près de la frette, mais j’appuie doucement', cause: 'pression' },
          { label: 'Tout près de la frette, et j’appuie fort', cause: 'angle' },
          { label: 'Je ne sais pas', cause: 'position' },
        ],
      },
    ],
    causes: {
      position: POSITION,
      pression: PRESSION,
      angle: ANGLE,
      voisin: VOISIN,
      guitare: {
        title: 'La guitare elle-même',
        type: 'materiel',
        hints: [
          'Si la corde frise sans qu’aucun doigt ne la touche, ce n’est pas votre main. Est-ce que la guitare est bien accordée ?',
          'Accordez d’abord : une corde trop détendue frise. Vérifiez ensuite qu’aucun objet ne vibre : capodastre rangé sur la tête, sangle, bouton qui bouge.',
          'Si elle frise encore une fois accordée, les cordes sont peut-être trop basses ou une frette dépasse : montrez la guitare à votre prof ou à un magasin de musique, c’est un réglage rapide.',
        ],
        check: 'Accordez à chaque début de séance : c’est le premier suspect quand quelque chose sonne bizarre.',
        action: { label: 'Ouvrir l’accordeur', tab: 'outils', params: { tool: 'accordeur' } },
      },
    },
    order: ['position', 'pression', 'angle', 'voisin', 'guitare'],
    fallback: {
      text: 'Revenez à un accord à deux doigts comme {Em} et réglez une seule corde à la fois. Quand {Em} sonne clair, retentez votre accord.',
      action: { label: 'Leçon : premier accord', tab: 'lecons', params: { id: 'l2' } },
    },
  },

  {
    id: 'muette',
    label: 'Une corde ne sonne pas',
    sub: 'Un « ploc » sourd, la corde est étouffée',
    icon: '🔇',
    tags: ['accord', 'barre'],
    intro: 'Une corde muette, c’est presque toujours un doigt mal placé ou une corde qu’il ne fallait pas jouer. On cherche lequel.',
    questions: [
      {
        id: 'q1',
        text: 'La corde qui ne sonne pas, c’est :',
        options: [
          { label: 'Une corde où j’ai un doigt', next: 'q2' },
          { label: 'Une corde à vide (sans doigt)', cause: 'voisin' },
          { label: 'Une corde marquée × sur le diagramme', cause: 'croix' },
        ],
      },
      {
        id: 'q2',
        text: 'Regardez ce doigt :',
        options: [
          { label: 'Il est couché, je touche avec le plat', cause: 'angle' },
          { label: 'Il est sur le bout, mais j’appuie peu', cause: 'pression' },
          { label: 'Il est sur la frette ou loin d’elle', cause: 'position' },
          { label: 'Je ne sais pas', cause: 'angle' },
        ],
      },
    ],
    causes: {
      voisin: VOISIN,
      angle: ANGLE,
      pression: PRESSION,
      position: POSITION,
      croix: {
        title: 'Cette corde ne fait pas partie de l’accord',
        type: 'idee',
        hints: [
          'Sur le diagramme, que veut dire le × au-dessus d’une corde ?',
          '× veut dire « ne pas jouer cette corde ». C’est normal qu’elle ne sonne pas : commencez votre coup de médiator sur la première corde qui n’a pas de ×.',
          'Exemple sur {D} : les cordes 6 et 5 ont un ×. Posez le médiator sur la corde de Ré (4) et grattez vers le bas à partir d’elle seulement. Le pouce gauche peut effleurer la corde 6 pour l’étouffer si elle sonne quand même.',
        ],
        check: 'Avant de jouer un nouvel accord, repérez sur le diagramme la corde de départ : la première sans ×.',
        action: { label: 'Revoir {$chord} dans le dictionnaire', tab: 'accords', params: { focus: '$chord' }, defaults: { chord: 'D' } },
      },
    },
    order: ['angle', 'voisin', 'pression', 'position'],
    fallback: {
      text: 'Posez l’accord et jouez les cordes une par une, très lentement. Corrigez une seule corde, puis passez à la suivante. Si l’accord reste difficile, revenez à {Em} quelques minutes.',
      action: { label: 'Leçon : premier accord', tab: 'lecons', params: { id: 'l2' } },
    },
  },

  {
    id: 'douleur',
    label: 'J’ai mal au bout des doigts',
    sub: 'Ou à la main, au poignet, au dos',
    icon: '🩹',
    tags: ['accord', 'barre'],
    intro: 'Un peu de sensibilité au bout des doigts est normale au début. D’autres douleurs, non. Voyons ce qui se passe.',
    safety: 'Douleur au poignet, à l’avant-bras ou au pouce, fourmillements ou engourdissement : arrêtez de jouer maintenant. Ces douleurs-là ne s’endurcissent pas, elles s’aggravent. Si ça dure, parlez-en à un adulte ou à un médecin.',
    questions: [
      {
        id: 'q1',
        text: 'Où avez-vous mal ?',
        options: [
          { label: 'Au bout des doigts (ça pique, ça brûle)', next: 'q2' },
          { label: 'Au poignet, à l’avant-bras ou au pouce', cause: 'poignet' },
          { label: 'Au dos, à l’épaule ou au cou', cause: 'posture' },
        ],
      },
      {
        id: 'q2',
        text: 'Qu’est-ce qui vous ressemble le plus ?',
        options: [
          { label: 'Je débute, ou je joue longtemps d’affilée', cause: 'corne' },
          { label: 'J’appuie de toutes mes forces', cause: 'force' },
        ],
      },
    ],
    causes: {
      corne: {
        title: 'La peau n’est pas encore habituée',
        type: 'corps',
        hints: [
          'Le bout des doigts doit s’endurcir (la corne). Combien de temps dure votre séance sans pause ?',
          'Faites plusieurs séances courtes (10 minutes, deux ou trois fois par jour) plutôt qu’une longue. Arrêtez dès que ça brûle. Ne jouez pas si la peau est fendue ou s’il y a une ampoule : laissez-la guérir.',
          'Exemple de semaine : 3 fois 10 minutes par jour, avec une pause dès que ça pique. Évitez de jouer juste après un bain (la peau ramollie fait plus mal). En une à deux semaines, la corne se forme et la douleur disparaît.',
        ],
        check: 'Fixez la durée avant de commencer (10 minutes) et arrêtez à la fin, même si vous êtes lancé.',
        action: { label: 'Pendant la pause : entraîner l’oreille', tab: 'pratique', params: { mode: 'oreille' } },
      },
      force: {
        title: 'Vous appuyez plus fort que nécessaire',
        type: 'geste',
        hints: [
          'Il faut beaucoup moins de force qu’on ne le croit. Avez-vous déjà cherché la force minimale ?',
          'Posez le doigt tout près de la frette (il faut moins de force à cet endroit). Appuyez jusqu’à ce que la note soit nette, puis relâchez un peu : si elle reste nette, vous serriez trop. Relâchez aussi le pouce derrière le manche.',
          'Exemple sur {Em} : grattez en boucle en relâchant doucement les deux doigts jusqu’à entendre le premier « bzzz », puis appuyez juste un peu plus. Retenez cette sensation : c’est votre force de travail.',
        ],
        check: 'Pendant que vous jouez, essayez de remuer le pouce gauche : s’il est bloqué, vous serrez trop.',
        action: { label: 'Vérifier {$chord} au micro', tab: 'accords', params: { focus: '$chord' }, defaults: { chord: 'Em' } },
      },
      poignet: {
        title: 'Le poignet ou la main sont trop sollicités',
        type: 'corps',
        stop: true,
        hints: [
          'Arrêtez pour aujourd’hui. Quand vous reprendrez : votre poignet gauche est-il plié très fort quand vous jouez ?',
          'Gardez le poignet le plus droit possible : manche un peu relevé, pouce derrière le manche sans écraser, coude détendu. Pour le barré, la force vient du bras qui tire un peu vers l’arrière, pas du pouce qui serre.',
          'Reprise : 5 minutes avec des accords faciles ({Em}, {Am}), puis secouez les mains et faites une pause. Si la douleur revient, dure plusieurs jours, ou s’il y a des fourmillements : parlez-en à un adulte et consultez un médecin.',
        ],
        check: 'Toutes les 5 minutes, posez la guitare, secouez les mains et vérifiez : aucune douleur au poignet ?',
        action: { label: 'Revoir la posture (leçon 1)', tab: 'lecons', params: { id: 'l1' } },
      },
      posture: {
        title: 'La posture fatigue le dos ou les épaules',
        type: 'corps',
        hints: [
          'Comment êtes-vous assis ? Le dos est-il penché vers la guitare pour voir le manche ?',
          'Asseyez-vous sur une chaise sans accoudoirs, dos droit, la caisse posée sur la cuisse et collée au corps. Les épaules restent basses et détendues. Ne vous penchez pas pour regarder : inclinez juste la tête.',
          'Exemple : avant de jouer, haussez les épaules vers les oreilles, puis laissez-les tomber. Gardez-les là. Si vous regardez trop le manche, fermez les yeux sur un accord que vous connaissez.',
        ],
        check: 'Au début de chaque morceau, un « contrôle posture » : dos droit, épaules basses, guitare collée au corps.',
        action: { label: 'Revoir la posture (leçon 1)', tab: 'lecons', params: { id: 'l1' } },
      },
    },
    order: ['corne', 'force', 'posture', 'poignet'],
    fallback: {
      text: 'Faites une vraie pause d’un ou deux jours. Si la douleur continue, parlez-en à un adulte ou à un médecin avant de reprendre.',
      action: { label: 'Revoir la posture (leçon 1)', tab: 'lecons', params: { id: 'l1' } },
    },
  },

  {
    id: 'changement',
    label: 'Je change d’accord trop lentement',
    sub: 'La musique s’arrête pendant que je cherche',
    icon: '🐢',
    tags: ['changement', 'accord'],
    intro: 'Tout le monde est lent au début : la vitesse vient en répétant des changements propres. Voyons ce qui vous freine.',
    questions: [
      {
        id: 'q1',
        text: 'Pendant le changement, que se passe-t-il ?',
        options: [
          { label: 'Je pose les doigts un par un', cause: 'unparun' },
          { label: 'Je ne sais plus où vont les doigts', cause: 'memoire' },
          { label: 'Je vais vite, mais l’accord sonne mal', cause: 'precipite' },
          { label: 'J’arrête de gratter pour changer', cause: 'arret' },
        ],
      },
    ],
    causes: {
      unparun: {
        title: 'Les doigts voyagent un par un',
        type: 'geste',
        hints: [
          'Vos doigts pourraient-ils se déplacer ensemble, en même temps ?',
          'Déplacez la forme en bloc : tous les doigts se lèvent et se reposent ensemble. Repérez un doigt « pivot » qui reste en place ou glisse sur sa corde, et laissez les autres s’organiser autour.',
          'Exemple {Em} → {Am} : majeur et annulaire descendent ensemble d’une corde, puis l’index se pose case 1 sur la corde de Si. Sans gratter : posez {Em}, soulevez la forme d’un centimètre, posez {Am}. Dix fois, lentement.',
        ],
        check: 'Regardez votre main au changement : si les doigts arrivent l’un après l’autre, refaites le geste « en bloc », sans gratter.',
        action: {
          label: 'Défi minute {$a} ↔ {$b}',
          tab: 'pratique',
          params: { mode: 'minute', pair: '$pair' },
          defaults: { pair: ['Em', 'Am'] },
        },
      },
      memoire: {
        title: 'La forme de l’accord n’est pas encore mémorisée',
        type: 'idee',
        hints: [
          'Pourriez-vous décrire l’accord à voix haute sans regarder le schéma ?',
          'Apprenez chaque accord comme une image : posez-le, fermez les yeux, levez la main, reposez-le, puis ouvrez les yeux et comparez au diagramme. Cinq fois par accord.',
          'Exemple {C} : un « escalier » qui descend : annulaire corde de La case 3, majeur corde de Ré case 2, index corde de Si case 1. Dites-le en le posant : « 3-2-1 ». Puis yeux fermés.',
        ],
        check: 'Testez-vous : pouvez-vous poser l’accord les yeux fermés ? Si non, il n’est pas encore prêt pour un enchaînement rapide.',
        action: { label: 'Revoir {$chord} dans le dictionnaire', tab: 'accords', params: { focus: '$chord' }, defaults: { chord: 'C' } },
      },
      precipite: {
        title: 'La vitesse passe avant la propreté',
        type: 'methode',
        hints: [
          'Qu’est-ce qui doit venir en premier : un changement rapide ou un changement propre ?',
          'Ralentissez jusqu’à ce que chaque accord sonne propre en arrivant. La vitesse vient toute seule en répétant des changements propres ; répéter des changements ratés entraîne surtout… à les rater.',
          'Exemple au défi minute : 20 changements propres valent mieux que 40 brouillons. Visez d’abord un changement toutes les 3 secondes, tous nets, puis essayez d’en faire un de plus à chaque nouvel essai.',
        ],
        check: 'Au défi minute, regardez le bilan « nets ou approximatifs » : s’il y a beaucoup d’approximatifs, ralentissez.',
        action: {
          label: 'Défi minute {$a} ↔ {$b}',
          tab: 'pratique',
          params: { mode: 'minute', pair: '$pair' },
          defaults: { pair: ['Em', 'Am'] },
        },
      },
      arret: NE_PAS_ARRETER,
    },
    order: ['unparun', 'precipite', 'arret', 'memoire'],
    fallback: {
      text: 'Revenez à la paire la plus simple, {Em} ↔ {Am}, et ne travaillez qu’elle quelques jours. Ce que vos doigts y apprennent servira pour toutes les autres paires.',
      action: { label: 'Défi minute {Em} ↔ {Am}', tab: 'pratique', params: { mode: 'minute', pair: ['Em', 'Am'] } },
    },
  },

  {
    id: 'accelere',
    label: 'J’accélère sans le vouloir',
    sub: 'Ou je ralentis, je ne reste pas régulier',
    icon: '⏩',
    tags: ['rythme'],
    intro: 'Presser le tempo est très courant, surtout quand on est content de jouer ! Cherchons à quel moment ça arrive.',
    questions: [
      {
        id: 'q1',
        text: 'Quand est-ce que ça arrive ?',
        options: [
          { label: 'Quand je joue sans métronome', cause: 'sansclic' },
          { label: 'Avec le métronome, je passe devant le clic', cause: 'presse' },
          { label: 'Je ralentis au moment de changer d’accord', cause: 'arret' },
        ],
      },
    ],
    causes: {
      sansclic: {
        title: 'Personne ne garde le tempo',
        type: 'methode',
        hints: [
          'Sans métronome, qui vous dit si vous allez trop vite ?',
          'Au début, jouez toujours avec le métronome (ou le groupe), à un tempo lent, et comptez à voix haute « 1 et 2 et 3 et 4 et ». Votre oreille apprend le tempo, et vos mains suivent.',
          'Exemple : rythme « Quatre temps » à 60 BPM, un coup vers le bas par clic, en tapant du pied. Quand l’évaluation au micro dépasse 85 %, montez de 5 BPM, pas plus.',
        ],
        check: 'De temps en temps, enregistrez-vous avec le métronome et réécoutez : c’est là qu’on entend si on presse.',
        action: {
          label: 'Rythme au métronome',
          tab: 'pratique',
          params: { mode: 'rythmes', pattern: '$pattern', bpm: 60 },
          defaults: { pattern: 'noires' },
        },
      },
      presse: {
        title: 'La main droite part en avance',
        type: 'geste',
        hints: [
          'Votre main droite fait-elle un mouvement de la même taille à chaque coup ?',
          'Gardez un balancier régulier du poignet, de la même amplitude à chaque coup, même quand vous ne touchez pas les cordes. Tapez du pied sur le clic. Baissez le tempo de 10 BPM : il est plus facile d’être régulier lentement.',
          'Exemple à 60 BPM : un coup vers le bas seulement sur le clic, pendant 4 mesures. Le but est que le clic « disparaisse » sous votre coup. Si l’évaluation dit que vous pressez, attendez le clic au lieu de le devancer.',
        ],
        check: 'Après une évaluation au micro, lisez où vous pressez ou traînez : c’est votre point à surveiller.',
        action: {
          label: 'Rythme lent au métronome',
          tab: 'pratique',
          params: { mode: 'rythmes', pattern: '$pattern', bpm: 60 },
          defaults: { pattern: 'noires' },
        },
      },
      arret: NE_PAS_ARRETER,
    },
    order: ['presse', 'sansclic', 'arret'],
    fallback: {
      text: 'Revenez au rythme le plus simple : un coup vers le bas par clic, à 60 BPM. Quand c’est régulier, ajoutez les coups vers le haut.',
      action: { label: 'Rythme « Quatre temps » à 60', tab: 'pratique', params: { mode: 'rythmes', pattern: 'noires', bpm: 60 } },
    },
  },

  {
    id: 'barre',
    label: 'Le barré ne sonne pas',
    sub: 'Des cordes frisent ou sont muettes sous l’index',
    icon: '🧱',
    tags: ['barre'],
    intro: 'Le barré demande souvent plusieurs semaines : c’est normal, et ça finit toujours par venir. Cherchons quelles cordes posent problème.',
    safety: 'Courtes séances (5 minutes). Si le poignet ou le pouce font mal, arrêtez pour aujourd’hui.',
    questions: [
      {
        id: 'q1',
        text: 'Quelles cordes ne sonnent pas ?',
        options: [
          { label: 'Celles sous l’index seul (souvent Sol ou Si)', cause: 'index' },
          { label: 'Celles des autres doigts', cause: 'autres' },
          { label: 'Presque toutes, et le pouce fatigue vite', cause: 'force' },
        ],
      },
    ],
    causes: {
      index: {
        title: 'Les plis de l’index tombent sur une corde',
        type: 'geste',
        hints: [
          'Votre index n’est pas tout plat : il a des creux aux articulations. Où tombent-ils ?',
          'Roulez l’index un peu sur sa tranche, côté pouce : c’est plus dur et plus plat. Collez-le à la frette, et faites-le glisser d’un ou deux millimètres vers le haut ou le bas du manche pour qu’aucun pli ne tombe sur une corde.',
          'Exemple : posez seulement l’index en barré sur la case 5 (c’est plus facile qu’en case 1). Jouez les 6 cordes une par une et ajustez jusqu’à ce qu’elles sonnent. Puis faites pareil case 3, puis case 2, puis case 1.',
        ],
        check: 'Après avoir posé le barré, jouez les cordes une par une : celle qui est muette vous dit où ajuster l’index.',
        action: { label: 'Vérifier {$barre} au micro', tab: 'accords', params: { focus: '$barre' }, defaults: { barre: 'Bm' } },
      },
      autres: {
        title: 'Les autres doigts sont trop couchés',
        type: 'geste',
        hints: [
          'Pendant que l’index barre, comment sont les autres doigts : arrondis ou à plat ?',
          'Les doigts 2, 3 et 4 doivent rester bien cambrés, sur le bout, pour ne pas toucher les cordes que l’index fait sonner. Avancer le coude un peu vers l’avant aide la main à se placer.',
          'Exemple sur {F} : posez d’abord annulaire et auriculaire (cases 3 sur La et Ré) et le majeur (Sol case 2), bien arrondis, puis couchez l’index. Jouez corde par corde.',
        ],
        check: 'Regardez sous vos doigts : on doit voir un petit tunnel sous chaque doigt arrondi.',
        action: { label: 'Vérifier {$barre} au micro', tab: 'accords', params: { focus: '$barre' }, defaults: { barre: 'F' } },
      },
      force: {
        title: 'La force vient du pouce au lieu du bras',
        type: 'geste',
        hints: [
          'D’où vient la force de votre barré : du pouce qui serre, ou d’ailleurs ?',
          'Le bras tire très légèrement vers l’arrière (vers vous), comme son propre poids : c’est lui qui plaque l’index. Le pouce reste derrière le manche, à peu près en face du majeur, sans écraser. Serrez au moment de gratter, relâchez entre deux.',
          'Exemple : posez le barré, puis décollez le pouce du manche. En tirant doucement le coude vers l’arrière, les cordes sonnent-elles encore ? Si oui, vous avez trouvé la bonne force. 5 minutes, puis pause.',
        ],
        check: 'Si le pouce blanchit ou fait mal, c’est qu’il travaille à la place du bras.',
        action: { label: 'Vérifier {$barre} au micro', tab: 'accords', params: { focus: '$barre' }, defaults: { barre: 'Bm' } },
      },
    },
    order: ['index', 'force', 'autres'],
    fallback: {
      text: 'Revenez une marche en arrière : le mini-barré sur 2 cordes et le power chord {F5} préparent la main. Le barré complet viendra après quelques semaines.',
      action: { label: 'Leçon : préparer le barré', tab: 'lecons', params: { id: 'l10a' } },
    },
  },

  {
    id: 'faux',
    label: 'Ça sonne faux même avec le bon accord',
    sub: 'Les doigts sont bien placés, mais quelque chose cloche',
    icon: '🎯',
    tags: ['accord', 'tab'],
    intro: 'Quand les doigts sont au bon endroit et que ça sonne faux, c’est souvent l’accordage. Vérifions dans l’ordre.',
    questions: [
      {
        id: 'q1',
        text: 'Avez-vous accordé la guitare avec l’accordeur aujourd’hui ?',
        options: [
          { label: 'Non, ou je ne sais pas', cause: 'accordage' },
          { label: 'Oui, l’accordeur est content', next: 'q2' },
        ],
      },
      {
        id: 'q2',
        text: 'Qu’est-ce qui sonne faux ?',
        options: [
          { label: 'Un accord en particulier', cause: 'case' },
          { label: 'Certaines notes, surtout quand j’appuie fort', cause: 'tire' },
          { label: 'Tout, quand je joue avec une chanson ou le groupe', cause: 'reference' },
        ],
      },
    ],
    causes: {
      accordage: {
        title: 'La guitare est désaccordée',
        type: 'reflexe',
        hints: [
          'Une guitare se désaccorde toute seule (chaleur, transport, cordes neuves). Quand l’avez-vous accordée pour la dernière fois ?',
          'Accordez à chaque début de séance : une corde à la fois, jusqu’à ce que l’aiguille soit au centre. Si la note est trop haute, descendez un peu en dessous, puis remontez doucement : la corde tient mieux.',
          'Exemple : jouez la corde 6 (la plus grosse). L’accordeur doit afficher Mi (E). S’il affiche autre chose ou que l’aiguille est à gauche, tournez la mécanique lentement en rejouant la corde. Des cordes neuves se détendent pendant quelques jours : réaccordez souvent.',
        ],
        check: 'Faites de l’accordage le premier geste de chaque séance, avant même de jouer une note.',
        action: { label: 'Ouvrir l’accordeur', tab: 'outils', params: { tool: 'accordeur' } },
      },
      case: {
        title: 'Un doigt est sur la mauvaise case ou la mauvaise corde',
        type: 'reflexe',
        hints: [
          'Comparez votre main au diagramme, doigt par doigt. Tout correspond ?',
          'Vérifiez pour chaque doigt le numéro de corde (6 = la plus grosse) et le numéro de case. Puis utilisez la vérification au micro : elle signale les « notes étrangères », signe d’un doigt mal placé.',
          'Exemple sur {C} : l’annulaire se pose souvent sur la corde 6 au lieu de la corde 5 (La). Comptez les cordes depuis la plus grosse : « 6, 5 » : l’annulaire va sur la 5, case 3.',
        ],
        check: 'Pour un nouvel accord, posez les doigts en disant tout haut « corde, case » pour chacun.',
        action: { label: 'Vérifier {$chord} au micro', tab: 'accords', params: { focus: '$chord' }, defaults: { chord: 'C' } },
      },
      tire: {
        title: 'Les doigts tirent la corde et la font monter',
        type: 'geste',
        hints: [
          'En appuyant, est-ce que votre doigt pousse la corde sur le côté ?',
          'Appuyez droit vers le manche, sans tirer la corde vers le haut ou le bas, et sans écraser : trop de force fait monter la note. Les notes aiguës, sur les cordes fines, y sont les plus sensibles.',
          'Exemple : jouez la corde de Si case 1 et regardez l’accordeur : il doit afficher Do (C) au centre. Appuyez très fort : l’aiguille monte. Retrouvez la force qui garde l’aiguille au centre.',
        ],
        check: 'Si un accord sonne juste « doucement » et faux « fort », c’est que vous tirez la corde.',
        action: { label: 'Ouvrir l’accordeur', tab: 'outils', params: { tool: 'accordeur' } },
      },
      reference: {
        title: 'Vous n’êtes pas dans la même tonalité que la musique',
        type: 'idee',
        hints: [
          'La chanson est-elle prévue avec un capodastre ou dans une autre tonalité ?',
          'Vérifiez dans Chansons si un capodastre est conseillé, et à quelle case. Vérifiez aussi l’accordage choisi dans l’accordeur : un accordage alternatif (Drop D, ½ ton plus bas…) change toutes les notes.',
          'Exemple : un enregistrement joué avec un capodastre en case 2 sonne un ton plus haut que vos accords sans capodastre. Posez le capodastre en case 2, ou transposez la chanson dans l’appli.',
        ],
        check: 'Avant de jouer avec un enregistrement, vérifiez : accordage standard ? capodastre ? même tonalité ?',
        action: { label: 'Ouvrir l’accordeur', tab: 'outils', params: { tool: 'accordeur' } },
      },
    },
    order: ['accordage', 'case', 'tire', 'reference'],
    fallback: {
      text: 'Accordez la guitare, puis jouez un accord simple comme {Em} et faites-le vérifier au micro. S’il est reconnu, la guitare va bien : le souci vient de l’accord travaillé.',
      action: { label: 'Vérifier {Em} au micro', tab: 'accords', params: { focus: 'Em' } },
    },
  },

  {
    id: 'rythme',
    label: 'Je me perds dans le rythme',
    sub: 'Le « et », le haut et le bas se mélangent',
    icon: '🥁',
    tags: ['rythme'],
    intro: 'Le rythme s’apprend avec le corps avant de s’apprendre avec la tête. Voyons ce qui vous fait décrocher.',
    questions: [
      {
        id: 'q1',
        text: 'Qu’est-ce qui coince ?',
        options: [
          { label: 'Je ne sais pas où tombe le « et »', cause: 'et' },
          { label: 'Ma main s’arrête quand il n’y a pas de coup', cause: 'balancier' },
          { label: 'Je mélange les coups vers le haut et vers le bas', cause: 'sens' },
        ],
      },
    ],
    causes: {
      et: {
        title: 'Le « et » est le milieu entre deux temps',
        type: 'idee',
        hints: [
          'Entre deux clics du métronome, il y a un moment exactement au milieu. Que se passe-t-il à ce moment-là ?',
          'Comptez « 1 et 2 et 3 et 4 et » : les chiffres tombent sur les clics, les « et » pile au milieu. Dites-le à voix haute avant de jouer, puis en jouant.',
          'Exemple : tapez du pied sur chaque clic. Pied qui descend = le chiffre, pied qui remonte = le « et ». En rythme folk : « 1 · 2 et · et 4 et » — sur le 3, la main passe dans le vide.',
        ],
        check: 'Si vous décrochez, arrêtez de jouer, comptez une mesure à voix haute, et reprenez sur le « 1 ».',
        action: { label: 'Croches à 60 BPM', tab: 'pratique', params: { mode: 'rythmes', pattern: 'croches', bpm: 60 } },
      },
      balancier: {
        title: 'Le bras s’arrête au lieu de balancer',
        type: 'geste',
        hints: [
          'Que fait votre main droite quand il n’y a pas de coup à jouer ?',
          'Le bras ne s’arrête jamais : bas, haut, bas, haut, en continu, comme un balancier. Quand il ne faut pas jouer, la main passe quand même, juste à côté des cordes.',
          'Exemple en rythme folk : faites d’abord des croches bas-haut régulières. Puis, sur le 3, écartez juste la main des cordes pendant le coup vers le bas, sans arrêter le mouvement.',
        ],
        check: 'Regardez votre main : elle doit bouger tout le temps, même pendant les « trous ».',
        action: {
          label: 'Rythme au métronome',
          tab: 'pratique',
          params: { mode: 'rythmes', pattern: '$pattern', bpm: 60 },
          defaults: { pattern: 'folk' },
        },
      },
      sens: {
        title: 'Le sens du coup ne suit pas le temps',
        type: 'idee',
        hints: [
          'Y a-t-il une règle pour savoir si un coup va vers le haut ou vers le bas ?',
          'La règle : sur les chiffres (le clic), la main descend ; sur les « et », elle monte. Toujours, même quand on saute un coup.',
          'Exemple : à 60 BPM, dites « bas » sur chaque clic et « haut » entre les clics, en bougeant la main sans toucher les cordes. Puis touchez les cordes.',
        ],
        check: 'Un doute sur le sens ? Demandez-vous : « suis-je sur un chiffre ou sur un “et” ? »',
        action: { label: 'Croches à 60 BPM', tab: 'pratique', params: { mode: 'rythmes', pattern: 'croches', bpm: 60 } },
      },
    },
    order: ['et', 'balancier', 'sens'],
    fallback: {
      text: 'Revenez à un seul coup vers le bas par clic, puis aux croches régulières. Le rythme folk viendra quand les croches seront faciles.',
      action: { label: 'Rythme « Quatre temps » à 60', tab: 'pratique', params: { mode: 'rythmes', pattern: 'noires', bpm: 60 } },
    },
  },

  {
    id: 'tab',
    label: 'Je n’arrive pas à lire la tablature',
    sub: 'Les lignes et les chiffres m’embrouillent',
    icon: '🔢',
    tags: ['tab'],
    intro: 'La tablature se lit en quelques minutes une fois qu’on connaît deux règles. Voyons laquelle vous manque.',
    questions: [
      {
        id: 'q1',
        text: 'Qu’est-ce qui bloque ?',
        options: [
          { label: 'Je ne sais pas quelle ligne est quelle corde', cause: 'lignes' },
          { label: 'Je ne sais pas ce que veulent dire les chiffres', cause: 'chiffres' },
          { label: 'Je comprends, mais je me perds en jouant', cause: 'tempo' },
        ],
      },
    ],
    causes: {
      lignes: {
        title: 'Les lignes sont « à l’envers »',
        type: 'idee',
        hints: [
          'La ligne du haut de la tablature correspond-elle à la corde la plus grosse ou la plus fine ?',
          'La ligne du haut est la corde la plus fine (Mi aigu, corde 1), celle du bas la plus grosse (Mi grave, corde 6). C’est l’inverse de ce que vous voyez en baissant les yeux sur la guitare.',
          'Astuce : comme sur une partition, l’aigu est en haut. Exemple : un 0 sur la ligne du bas = la grosse corde de Mi jouée à vide, la note la plus grave de la guitare.',
        ],
        check: 'Avant de jouer, posez le doigt sur la ligne du haut et dites : « corde fine ».',
        action: { label: 'Tablature : Au clair de la lune', tab: 'pratique', params: { mode: 'tabs', tab: 'clair-lune-melodie' } },
      },
      chiffres: {
        title: 'Le chiffre est une case, pas un doigt',
        type: 'idee',
        hints: [
          'Sur une tablature, le chiffre indique-t-il quel doigt utiliser, ou autre chose ?',
          'Le chiffre est le numéro de la case où appuyer. 0 = corde à vide, sans appuyer. On lit de gauche à droite ; deux chiffres l’un au-dessus de l’autre se jouent en même temps.',
          'Exemple : un 3 sur la 2e ligne en partant du haut = corde de Si, case 3 (c’est la note Ré). Un 0 sur la même ligne = corde de Si à vide.',
        ],
        check: 'Pour chaque note, dites deux choses : « quelle ligne = quelle corde » et « quel chiffre = quelle case ».',
        action: { label: 'Tablature : Au clair de la lune', tab: 'pratique', params: { mode: 'tabs', tab: 'clair-lune-melodie' } },
      },
      tempo: {
        title: 'Le tempo est trop rapide pour lire',
        type: 'methode',
        hints: [
          'Avez-vous le temps de lire la note suivante pendant que vous jouez celle-ci ?',
          'Baissez le tempo autant qu’il le faut et travaillez une petite partie (une mesure ou deux) avant d’enchaîner. La régularité compte plus que la vitesse.',
          'Exemple : « Au clair de la lune » à 50 BPM, seulement la première mesure, 4 fois de suite. Puis la deuxième. Puis les deux ensemble. Montez de 5 BPM quand c’est facile.',
        ],
        check: 'Si vous vous arrêtez souvent, le tempo est trop rapide : baissez-le avant de recommencer.',
        action: { label: 'Tablature : Au clair de la lune', tab: 'pratique', params: { mode: 'tabs', tab: 'clair-lune-melodie' } },
      },
    },
    order: ['lignes', 'chiffres', 'tempo'],
    fallback: {
      text: 'Relisez la leçon « Lire une tablature » et commencez par la mélodie la plus courte, sur deux cordes seulement.',
      action: { label: 'Leçon : lire une tablature', tab: 'lecons', params: { id: 'l11' } },
    },
  },

  {
    id: 'mediator',
    label: 'Le médiator accroche ou m’échappe',
    sub: 'Il tourne dans les doigts, ou le son est dur',
    icon: '🔺',
    tags: ['rythme'],
    intro: 'Tenir un médiator demande un peu d’habitude. Voyons ce qui se passe.',
    questions: [
      {
        id: 'q1',
        text: 'Que fait le médiator ?',
        options: [
          { label: 'Il tourne ou m’échappe des doigts', cause: 'prise' },
          { label: 'Il accroche les cordes, le son est dur', cause: 'trop' },
          { label: 'Je n’ai pas de médiator', cause: 'sans' },
        ],
      },
    ],
    causes: {
      prise: {
        title: 'La prise est trop lâche',
        type: 'geste',
        hints: [
          'Entre quelles parties des doigts tenez-vous le médiator ?',
          'Posez le médiator sur le côté de l’index plié, pointe vers les cordes, et refermez le pouce à plat par-dessus. Serrez juste assez pour qu’il ne tourne pas.',
          'Exemple : tenez-le comme une clé que vous tournez dans une serrure. Seule la pointe dépasse, à peine 2 ou 3 mm. Un médiator fin (souple) est plus facile au début.',
        ],
        check: 'Toutes les quelques mesures, regardez votre médiator : la pointe dépasse-t-elle toujours de la même longueur ?',
        action: { label: 'Rythme « Quatre temps » à 60', tab: 'pratique', params: { mode: 'rythmes', pattern: 'noires', bpm: 60 } },
      },
      trop: {
        title: 'Le médiator s’enfonce trop entre les cordes',
        type: 'geste',
        hints: [
          'Quelle longueur de médiator dépasse de vos doigts ?',
          'Ne laissez dépasser que la pointe, et effleurez les cordes au lieu de les « creuser ». Relâchez le poignet : le mouvement vient du poignet, comme pour secouer de l’eau de la main.',
          'Exemple : grattez lentement les 6 cordes vers le bas en visant seulement le dessus des cordes. Écoutez : le son doit être rond, sans claquement. Puis faites pareil vers le haut, en touchant surtout les cordes aiguës.',
        ],
        check: 'Si vous entendez un « clac » à chaque coup, raccourcissez la pointe et relâchez le poignet.',
        action: { label: 'Croches à 60 BPM', tab: 'pratique', params: { mode: 'rythmes', pattern: 'croches', bpm: 60 } },
      },
      sans: {
        title: 'Jouer sans médiator',
        type: 'idee',
        hints: [
          'On peut très bien gratter sans médiator ! Avec quoi pourriez-vous gratter vers le bas et vers le haut ?',
          'Vers le bas : le dos de l’ongle de l’index (ou le pouce). Vers le haut : la pulpe de l’index ou du pouce. Gardez le poignet souple.',
          'Exemple : sur {Em}, grattez vers le bas avec l’ongle de l’index, au clic du métronome, à 60 BPM. Le son est plus doux qu’au médiator : c’est normal.',
        ],
        check: 'Gardez les ongles de la main droite propres et pas trop courts si vous grattez avec.',
        action: { label: 'Rythme « Quatre temps » à 60', tab: 'pratique', params: { mode: 'rythmes', pattern: 'noires', bpm: 60 } },
      },
    },
    order: ['prise', 'trop', 'sans'],
    fallback: {
      text: 'Relisez la leçon « Le premier rythme » : elle montre la prise du médiator et le mouvement du poignet.',
      action: { label: 'Leçon : le premier rythme', tab: 'lecons', params: { id: 'l4' } },
    },
  },
]

export const SYMPTOM_MAP = Object.fromEntries(SYMPTOMS.map((s) => [s.id, s]))

// Étiquettes de contexte d'un écran : accord(s), paire, barré, rythme, tablature
export function contextTags(context = {}) {
  const tags = new Set(context.topics || [])
  const chords = context.chords || []
  if (chords.length) tags.add('accord')
  if (chords.length >= 2) tags.add('changement')
  if (chords.some((c) => BARRE_CHORDS.includes(c))) tags.add('barre')
  if (context.pattern) tags.add('rythme')
  return tags
}

// Symptômes triés : d'abord ceux qui correspondent à l'écran, dans l'ordre de la liste
export function rankSymptoms(context = {}) {
  const tags = contextTags(context)
  const score = (s) => s.tags.filter((t) => tags.has(t)).length
  const scored = SYMPTOMS.map((s, i) => ({ s, i, n: score(s) }))
  const forHere = scored.filter((x) => x.n > 0).sort((a, b) => b.n - a.n || a.i - b.i).map((x) => x.s)
  const others = scored.filter((x) => x.n === 0).map((x) => x.s)
  return { forHere, others }
}

// Remplace les '$…' d'une action par le contexte (ou par action.defaults)
export function resolveAction(action, context = {}) {
  if (!action) return null
  const chords = context.chords || []
  const d = action.defaults || {}
  const barre = chords.find((c) => BARRE_CHORDS.includes(c)) || d.barre || d.chord
  const chord = chords[0] || d.chord || d.barre
  const pair = chords.length >= 2 ? chords.slice(0, 2) : d.pair
  const all = chords.length >= 2 ? chords : d.chords
  const pattern = context.pattern || d.pattern
  const val = { $chord: chord, $barre: barre, $pair: pair, $chords: all, $pattern: pattern }
  const params = {}
  for (const [k, v] of Object.entries(action.params || {})) {
    const r = typeof v === 'string' && v in val ? val[v] : v
    if (r !== undefined && r !== null) params[k] = r
  }
  const [a, b] = params.pair || []
  const label = action.label
    .replace(/\{\$chord\}/g, chord ? `{${chord}}` : 'l’accord')
    .replace(/\{\$barre\}/g, barre ? `{${barre}}` : 'le barré')
    .replace(/\{\$a\}/g, a ? `{${a}}` : '')
    .replace(/\{\$b\}/g, b ? `{${b}}` : '')
  return { label, tab: action.tab, params }
}
