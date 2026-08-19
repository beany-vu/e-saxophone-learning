// French for the practice material. Same shape as lib/course-i18n.ts: English
// stays the source of truth in lib/curriculum.ts, and this file supplies the
// other language keyed by item id. A test fails if an item is added without a
// translation, so the two cannot drift.

import type { PracticeItem } from '@/lib/curriculum'
import type { Lang } from '@/lib/i18n'

type ItemText = { title: string; about: string; tip?: string; phrases?: string[] }

export const ITEMS_FR: Record<string, ItemText> = {
  'long-tones': {
    title: 'Sons files',
    about:
      'Tenez chaque note aussi longtemps que votre souffle le permet, et gardez un volume constant du debut a la fin. L’exercice le moins excitant qui soit, et celui qui transforme le plus vite votre son.',
    tip: 'Surveillez le vumetre sur la page Moniteur. L’objectif est une ligne bien droite.',
    phrases: ['Les cinq'],
  },
  'first-five': {
    title: 'Les cinq premieres notes',
    about:
      'Sol, la, si, do, re et retour. Ces cinq notes tombent sous les doigts sans auriculaire ni cle d’octave, ce qui en fait le point de depart.',
    tip: 'Visez le meme volume sur chaque note. Un volume qui vacille est un probleme de souffle, pas de doigts.',
    phrases: ['En montant', 'En descendant'],
  },
  'reading-five': {
    title: 'Lecture : les cinq premieres',
    about:
      'Les memes cinq notes, mais dans le desordre, pour vous obliger a lire chacune au lieu de reciter le motif. Activez Afficher la partition et lisez la portee, pas les lettres.',
    tip: 'Si vous vous surprenez a reciter sol la si do re, l’exercice ne sert plus a rien. Ralentissez et lisez.',
    phrases: ['Premiere ligne', 'Deuxieme ligne'],
  },
  'octave-jumps': {
    title: 'Liaisons d’octave',
    about:
      'Le meme doigte avec et sans la cle d’octave. Votre pouce gauche fait tout le travail, et rien d’autre ne doit bouger.',
    tip: 'Si la note aigue craque, c’est le pouce qui arrive en retard, pas le souffle.',
    phrases: ['Sol et la', 'Si et do'],
  },
  'chromatic-crawl': {
    title: 'Marche chromatique',
    about:
      'Chaque demi-ton du sol au do et retour. C’est la que la cle bis, les cles laterales et la cle de sol diese cessent d’etre de la theorie.',
    tip: 'Le si bemol a trois doigtes. L’entraineur accepte la note quelle que soit la maniere de la produire.',
    phrases: ['Montee', 'Descente'],
  },
  'f-major': {
    title: 'Fa majeur, rencontre avec le si bemol',
    about:
      'La gamme qui vous force a apprendre le si bemol, l’alteration que vous croiserez le plus souvent. Utilisez la cle bis a l’interieur de la gamme : elle est faite pour cela.',
    tip: 'Le si bemol a trois doigtes. Bis quand la gamme le traverse, si bemol lateral quand vous y sautez.',
    phrases: ['En montant', 'En descendant'],
  },
  'g-major': {
    title: 'Sol majeur, rencontre avec le fa diese',
    about:
      'L’autre alteration incontournable. Un seul diese, et il tombe exactement la ou votre main droite se trouve deja.',
    tip: 'Le fa diese se joue 1 2 3 avec le majeur droit. La cle laterale de fa diese ne sert que dans les passages delicats.',
    phrases: ['En montant', 'En descendant'],
  },
  'rhythm-basics': {
    title: 'Rythme : long, court, plus court',
    about:
      'Trois lignes aux durees volontairement differentes. Appuyez sur Ecouter, frappez le rythme, comptez a voix haute, puis jouez. L’application n’evalue pas le rythme : celui-la depend de vos oreilles.',
    tip: 'Comptez a voix haute, vraiment a voix haute. Compter dans sa tete derive sans qu’on s’en apercoive.',
    phrases: ['Notes egales', 'Une note tenue', 'Deux fois plus vite'],
  },
  'low-register': {
    title: 'Descendre tout en bas',
    about:
      'Re, do, si et si bemol graves, puis on remonte. Les graves demandent une gorge detendue et un air plus lent, et ce sont les premiers a s’effondrer quand vous vous crispez.',
    tip: 'Si une note grave refuse de sortir, soufflez plus chaud et plus lentement plutot que plus fort.',
    phrases: ['Jusqu’au si bemol grave', 'Retour vers le haut'],
  },
  'c-major-two-octaves': {
    title: 'Do majeur, deux octaves',
    about:
      'La gamme complete d’un do a l’autre et retour. Tous les doigts, les deux mains, et la cle d’octave au milieu.',
    tip: 'Assez lentement pour que les notes soient egales. La vitesse est un resultat, pas un objectif.',
    phrases: ['Montee de la gamme', 'Descente de la gamme'],
  },
  'd-major': {
    title: 'Re majeur, deux dieses',
    about:
      'Fa diese et do diese dans la meme gamme, dans le bas de l’instrument ou vivent les cles d’auriculaire. Celle-ci demasque une main droite paresseuse.',
    phrases: ['En montant', 'En descendant'],
  },
  arpeggios: {
    title: 'Arpeges : do, fa et sol',
    about:
      'Le squelette d’un accord, joue note par note. Les melodies sautent sans arret le long de ces formes : les avoir dans les doigts rend un morceau nouveau lisible.',
    tip: 'Les sauts ratent quand les doigts bougent l’un apres l’autre. Faites-les bouger ensemble, arrivant comme un seul.',
    phrases: ['Do majeur', 'Fa majeur', 'Sol majeur'],
  },
  tonguing: {
    title: 'Coup de langue : meme note, separee',
    about:
      'Quatre fois chaque note, separees par la langue qui dit "tu" contre la pointe de l’anche, et non en coupant l’air. Puis jouez le tout lie et ecoutez la difference.',
    tip: 'L’air coule sans interruption en dessous. Votre langue interrompt le son ; vos poumons jamais.',
    phrases: ['Sur do', 'Sur re', 'Sur mi', 'Retour a la maison'],
  },
  'long-phrase': {
    title: 'Un souffle, huit notes',
    about:
      'Une ligne qui monte, des notes tenues, un seul souffle du debut a la fin. Le controle du souffle decide de la ou vous pouvez respirer dans un vrai morceau.',
    tip: 'Inspirez par les coins de la bouche sans deplacer le bec. Travaillez la respiration, pas seulement les notes.',
    phrases: ['Tout d’un trait'],
  },
  'awkward-corners': {
    title: 'Les enchainements ingrats',
    about:
      'Les trois changements de doigts qui font trebucher tout le monde : do diese vers re, sol diese vers la, et si bemol vers si. Chacun deplace plusieurs doigts a la fois, et chacun est l’endroit ou un morceau s’effondre.',
    tip: 'Jouez-les jusqu’a ce qu’ils deviennent ennuyeux. L’ennui est l’objectif.',
    phrases: ['Do diese vers re', 'Sol diese vers la', 'Si bemol vers si'],
  },
  dynamics: {
    title: 'Fort et doux',
    about:
      'Chaque note tenue deux fois : une fois aussi fort que vous pouvez le tenir, une fois aussi doux. La hauteur ne doit pas bouger entre les deux, ce qui est le plus difficile et tout l’interet.',
    tip: 'Le jeu doux tend a baisser et le jeu fort a monter. Surveillez un accordeur pendant l’exercice.',
    phrases: ['Cinq notes, deux fois chacune'],
  },
  twinkle: {
    title: 'Ah vous dirai-je maman',
    about:
      'Traditionnel. Deux notes a la fois, aucune alteration, et la forme est deja dans votre tete : c’est ce qui en fait un bon premier morceau.',
    phrases: ['Premiere ligne', 'Deuxieme ligne'],
  },
  'happy-birthday': {
    title: 'Joyeux anniversaire',
    about:
      'Traditionnel, et dans le domaine public depuis 2016. A savoir par coeur, car c’est le seul air qu’on vous demandera vraiment de jouer.',
    tip: 'La troisieme ligne saute une octave entiere. Preparez le pouce avant d’en avoir besoin.',
    phrases: [
      'Joyeux anniversaire',
      'Joyeux anniversaire (bis)',
      'Joyeux anniversaire cher ...',
      'Joyeux anniversaire (fin)',
    ],
  },
  'ode-to-joy': {
    title: 'Hymne a la joie',
    about:
      'Beethoven, 1824. Uniquement des degres conjoints, aucun saut : c’est en realite un exercice de gamme deguise.',
    phrases: ['Premiere ligne, qui monte', 'Deuxieme ligne, la reponse'],
  },
  'frere-jacques': {
    title: 'Frere Jacques',
    about:
      'Traditionnel. Quatre courtes phrases, chacune repetee : vous avez donc immediatement une deuxieme tentative pour chacune.',
    phrases: [
      'Frere Jacques',
      'Frere Jacques (bis)',
      'Dormez-vous',
      'Dormez-vous (bis)',
      'Sonnez les matines',
      'Sonnez les matines (bis)',
      'Din dan don',
      'Din dan don (bis)',
    ],
  },
  saints: {
    title: 'When the Saints Go Marching In',
    about:
      'Traditionnel. L’air que tout saxophoniste apprend, et le premier qui sonne comme un saxophone plutot que comme un exercice.',
    tip: 'Jouez-le trop lentement d’abord. C’est une marche, et se precipiter est l’erreur habituelle.',
    phrases: [
      'Oh when the saints',
      'Oh when the saints (bis)',
      'Oh when the saints go marching in',
      'Oh I want to be in that number',
    ],
  },
  'amazing-grace': {
    title: 'Amazing Grace',
    about:
      'Traditionnel. Des notes longues et de grands sauts, ce qui en fait une epreuve de souffle plutot que de doigts.',
    tip: 'Le saut du sol vers le mi est le passage difficile. Gardez l’air en mouvement a travers lui.',
    phrases: ['Premiere ligne', 'Deuxieme ligne'],
  },
}

// One table per language. English is the data itself, in lib/curriculum.ts.
// A language absent from here falls back to English rather than showing gaps,
// and CONTENT_LANGUAGES says which are actually covered, so the fallback is
// visible rather than quietly pretending.
const BY_LANG: Partial<Record<Lang, Record<string, ItemText>>> = { fr: ITEMS_FR }

export const CONTENT_LANGUAGES: Lang[] = ['en', ...(Object.keys(BY_LANG) as Lang[])]

/** An item in the requested language, phrases included. */
export function localiseItem(item: PracticeItem, lang: Lang): PracticeItem {
  if (lang === 'en') return item
  const fr = BY_LANG[lang]?.[item.id]
  if (!fr) return item
  return {
    ...item,
    title: fr.title,
    about: fr.about,
    tip: fr.tip ?? item.tip,
    phrases: item.phrases?.map((p, i) => ({ ...p, label: fr.phrases?.[i] ?? p.label })),
  }
}
