// French for the course. The English lives in lib/course.ts as the source of
// truth; this file only supplies the other language, keyed by week number, so
// adding a week cannot silently half-translate the plan. A test checks that
// every week and phase is covered.

import type { CoursePhase, CourseWeek } from '@/lib/course'
import type { Lang } from '@/lib/i18n'

type WeekText = { title: string; focus: string; goal: string; watch?: string }

export const COURSE_FR: Record<number, WeekText> = {
  1: {
    title: 'Obtenir un son stable',
    focus:
      'Faire sortir une note de la meme facon deux fois de suite. Le bec entre environ un centimetre, la levre inferieure amortit les dents, et un souffle regulier. Rien d’autre ne compte pour l’instant.',
    goal: 'Tenir sol, la, si, do et re pendant huit temps lents chacun, avec le vumetre bien plat.',
    watch: 'Mordre le bec. Si votre levre inferieure fait mal, vous serrez au lieu de souffler.',
  },
  2: {
    title: 'Cinq notes sous les doigts',
    focus:
      'Les cinq notes qui ne demandent ni auriculaire ni cle d’octave, jusqu’a ne plus avoir a y penser. Ensuite un air compose uniquement de celles-la.',
    goal: 'Jouer Les cinq premieres notes a 90 bpm sans regarder le tableau de doigtes.',
  },
  3: {
    title: 'La cle d’octave',
    focus:
      'Les memes doigtes une octave plus haut. Le pouce gauche fait tout le travail et rien d’autre ne bouge.',
    goal: 'Des liaisons d’octave nettes dans les deux sens, sans note qui craque, et l’Hymne a la joie en entier.',
    watch:
      'Le pouce doit arriver avec l’air, pas apres. Un pouce en retard, c’est une note qui craque.',
  },
  4: {
    title: 'Descendre tout en bas',
    focus:
      'Le registre grave, qui demande un air plus lent et plus chaud et une gorge detendue. C’est la que la tension se voit en premier.',
    goal: 'Re, do, si et si bemol graves sortent du premier coup, trois fois sur quatre.',
    watch: 'Souffler plus fort empire les graves. Soufflez plus chaud et plus lentement.',
  },
  5: {
    title: 'Lire la portee',
    focus:
      'Ou vivent les notes sur la page. Activez Afficher la partition et lisez la note avant de la jouer, au lieu de lire son nom.',
    goal: 'Nommer n’importe quelle note entre le do grave et le do aigu en moins de trois secondes.',
  },
  6: {
    title: 'Une gamme qui compte',
    focus:
      'Do majeur sur deux octaves, en montant et en descendant, regulierement. C’est le squelette auquel toutes les autres tonalites se raccrochent.',
    goal: 'Deux octaves de do majeur a 80 bpm, notes egales, sans hesiter a la cle d’octave.',
  },
  7: {
    title: 'Un rythme que vous comptez',
    focus:
      'Compter a voix haute en jouant. Ecoutez d’abord chaque air lentement, frappez le rythme dans les mains, puis jouez-le.',
    goal: 'Jouer Joyeux anniversaire avec les notes longues vraiment tenues, au metronome a 80.',
    watch:
      'L’application evalue quelle note, jamais quand. Le rythme est votre affaire, alors comptez a voix haute.',
  },
  8: {
    title: 'Si bemol et la cle bis',
    focus:
      'La premiere alteration que vous croiserez partout, et ses trois doigtes. Bis dans les gammes, si bemol lateral pour les sauts.',
    goal: 'Fa majeur en montant et en descendant a 80 bpm, et le si bemol accessible sans reflechir au doigte.',
  },
  9: {
    title: 'Fa diese et la deuxieme alteration',
    focus:
      'L’autre alteration omnipresente. Meme principe : un doigte principal, un doigte de secours pour les passages delicats.',
    goal: 'Sol majeur et re majeur en montant et en descendant, sans hesiter sur le fa diese ni le do diese.',
  },
  10: {
    title: 'Le coup de langue',
    focus:
      'Separer les notes avec la langue plutot qu’avec le souffle. Dites "tu" contre la pointe de l’anche. Puis jouez le meme air lie, puis detache.',
    goal: 'When the Saints, une fois entierement lie et une fois entierement detache, et cela s’entend.',
    watch:
      'L’air ne s’arrete jamais pendant le coup de langue. La langue interrompt le son, les poumons non.',
  },
  11: {
    title: 'Des phrases plus longues, une a la fois',
    focus:
      'Utiliser les boutons de phrase : apprendre une ligne, puis la suivante, puis les relier. C’est ainsi que tout morceau long s’apprend.',
    goal: 'Frere Jacques en entier, lu sur la portee et non a partir des noms de notes.',
  },
  12: {
    title: 'Le souffle et les longues phrases',
    focus:
      'Ou respirer, et tenir une ligne jusqu’au bout. Amazing Grace existe pour cela.',
    goal: 'Jouer Amazing Grace avec les respirations prevues toujours aux memes endroits.',
  },
  13: {
    title: 'Votre morceau, saisi dans l’application',
    focus:
      'Trouvez la partition du morceau voulu. Saisissez-la dans Vos propres melodies, une ligne par phrase. Cochez diapason de concert s’il s’agit d’une partie de piano ou de chant.',
    goal: 'Le morceau est dans l’application, decoupe en phrases, et le bouton Ecouter joue quelque chose de reconnaissable.',
    watch:
      'Si tout sonne faux d’un ecart constant, c’est la case diapason de concert qui en est la cause.',
  },
  14: {
    title: 'La premiere moitie',
    focus:
      'Couplet et pre-refrain, phrase par phrase, lentement. Ecoutez, jouez, repetez la phrase jusqu’a ce qu’elle devienne ennuyeuse.',
    goal: 'La premiere moitie a mi-vitesse sans fausse note.',
  },
  15: {
    title: 'La seconde moitie',
    focus: 'Le refrain, de la meme facon. Puis reliez-le a la premiere moitie.',
    goal: 'Le morceau entier a mi-vitesse, du debut a la fin, sans s’arreter.',
  },
  16: {
    title: 'Jusqu’au tempo',
    focus:
      'Montez de cinq bpm a la fois. Des que les erreurs apparaissent, redescendez de dix et restez-y.',
    goal: 'Le morceau entier a un tempo proche du vrai.',
    watch:
      'Travailler vite et faux, c’est apprendre faux. Lentement et juste va plus vite au bout du compte.',
  },
  17: {
    title: 'En faire de la musique',
    focus:
      'Nuances et phrase. Plus fort vers le sommet d’une phrase, plus doux a la fin. Le vibrato sur les notes longues, seulement si vous le voulez.',
    goal: 'Deux versions qui sonnent clairement differemment l’une de l’autre.',
  },
  18: {
    title: 'Les points faibles',
    focus:
      'Regardez la carte des notes dans Progression pour voir celles que vous evitez, et travaillez-les specifiquement. Enregistrez-vous et reecoutez : desagreable et efficace.',
    goal: 'Les trois pires mesures ne sont plus les trois pires mesures.',
  },
  19: {
    title: 'Semaine libre',
    focus:
      'Volontairement vide. Les jours sans arrivent, et un plan sans marge est un plan qu’on abandonne en novembre. Reprenez la semaine qui s’est le moins bien passee, ou reposez-vous.',
    goal: 'Revenu a la semaine ou vous devriez etre, ou vraiment repose. Les deux comptent.',
  },
  20: {
    title: 'Jouez-le pour quelqu’un',
    focus:
      'Du debut a la fin, pour une personne, volontairement. Puis attaquez l’autre morceau, qui prendra desormais des jours et non des semaines.',
    goal: 'Une execution complete, au plus tard le 31 decembre, du morceau vise le 19 aout.',
  },
}

export const PHASES_FR: Record<string, { title: string; about: string }> = {
  sound: {
    title: 'Phase 1 : le son',
    about:
      'Obtenir une note fiable de l’instrument. Pas encore de musique, et c’est tres bien ainsi.',
  },
  reading: {
    title: 'Phase 2 : lecture et registre',
    about: 'La portee, tout le registre, et la gamme sur laquelle tout le reste se construit.',
  },
  technique: {
    title: 'Phase 3 : les passages ingrats',
    about:
      'Alterations, coup de langue et phrases. C’est la partie qui rend la vraie musique jouable.',
  },
  song: {
    title: 'Phase 4 : votre morceau',
    about: 'Mettre dans les doigts le morceau que vous voulez vraiment, une moitie a la fois.',
  },
  polish: {
    title: 'Phase 5 : la finition',
    about: 'La difference entre jouer les notes et jouer la musique.',
  },
}

/** A week in the requested language. English is the data itself. */
export function localiseWeek(week: CourseWeek, lang: Lang): CourseWeek {
  if (lang === 'en') return week
  const fr = COURSE_FR[week.week]
  if (!fr) return week
  return { ...week, title: fr.title, focus: fr.focus, goal: fr.goal, watch: fr.watch }
}

export function localisePhase(phase: CoursePhase, lang: Lang): CoursePhase {
  if (lang === 'en') return phase
  const fr = PHASES_FR[phase.id]
  return fr ? { ...phase, title: fr.title, about: fr.about } : phase
}
