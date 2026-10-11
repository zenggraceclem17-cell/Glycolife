// Fiches éducatives courtes. Contenu À FAIRE VALIDER par un professionnel de santé.

export interface Lesson {
  id: string;
  icon: string; // nom Ionicons
  title: string;
  minutes: number;
  paragraphs: string[];
  quiz: { question: string; answer: boolean; explanation: string };
}

export const LESSONS: Lesson[] = [
  {
    id: 'comprendre',
    icon: 'help-circle-outline',
    title: 'Comprendre le diabète',
    minutes: 2,
    paragraphs: [
      "Le diabète, c'est trop de sucre dans le sang. Le corps n'arrive plus à bien utiliser le sucre des aliments, souvent à cause de l'insuline qui manque ou qui marche mal.",
      "Le type 2 est le plus fréquent chez l'adulte. Le type 1 apparaît souvent chez les jeunes et demande de l'insuline chaque jour.",
      "Bien suivi, on vit longtemps avec le diabète : mesures régulières, traitement pris chaque jour, repas équilibrés et activité physique.",
    ],
    quiz: {
      question: 'Le diabète peut se soigner tout seul si on se sent bien.',
      answer: false,
      explanation: "Même sans symptôme, le sucre élevé abîme le corps petit à petit. Il faut continuer le suivi et le traitement.",
    },
  },
  {
    id: 'hypo',
    icon: 'arrow-down-circle-outline',
    title: 'Hypoglycémie et règle des 15',
    minutes: 2,
    paragraphs: [
      "L'hypoglycémie, c'est quand le sucre descend trop bas (sous 0,70 g/L). Signes : tremblements, sueurs, faim brutale, vertiges, cœur qui bat vite.",
      'Règle des 15 : prenez 15 g de sucre rapide (3 morceaux de sucre, ou ½ verre de jus ou de soda), attendez 15 minutes, puis remesurez. Recommencez si c\'est encore bas.',
      "Si la personne est inconsciente : ne rien donner par la bouche (risque d'étouffement), la mettre sur le côté et appeler les secours.",
    ],
    quiz: {
      question: 'Si un proche diabétique est inconscient, il faut lui faire boire du jus sucré.',
      answer: false,
      explanation: "Jamais rien par la bouche chez une personne inconsciente. Mettez-la sur le côté et appelez les secours.",
    },
  },
  {
    id: 'hyper',
    icon: 'arrow-up-circle-outline',
    title: 'Hyperglycémie',
    minutes: 2,
    paragraphs: [
      "L'hyperglycémie, c'est trop de sucre dans le sang (au-dessus de votre cible, souvent 1,80 g/L). Signes : grande soif, envie d'uriner souvent, fatigue, vue trouble.",
      "Que faire : boire de l'eau, remesurer, vérifier si un médicament a été oublié. Ne changez jamais vos doses sans l'avis de votre médecin.",
      "Au-dessus de 2,50 g/L avec vomissements ou grande fatigue : allez à l'hôpital.",
    ],
    quiz: {
      question: "Boire de l'eau aide quand la glycémie est haute.",
      answer: true,
      explanation: "Oui, l'eau aide le corps à éliminer une partie du sucre. Évitez les boissons sucrées.",
    },
  },
  {
    id: 'assiette',
    icon: 'restaurant-outline',
    title: "L'assiette kinoise équilibrée",
    minutes: 3,
    paragraphs: [
      "Moitié de l'assiette : légumes (pondu, ndunda, matembele, gombo). Un quart : protéines (poisson, poulet, haricots, œuf). Un quart : féculent (fufu, chikwangue, riz, plantain).",
      'Le fufu et la chikwangue font monter vite la glycémie : gardez une petite portion, et accompagnez-les de beaucoup de légumes.',
      "Remplacez les sodas et jus sucrés par de l'eau. Une bouteille de soda contient environ 7 morceaux de sucre.",
    ],
    quiz: {
      question: "Une bonne assiette contient surtout du fufu et peu de légumes.",
      answer: false,
      explanation: 'Les légumes doivent occuper la moitié de l’assiette ; le féculent seulement un quart.',
    },
  },
  {
    id: 'activite',
    icon: 'walk-outline',
    title: 'Bouger chaque jour',
    minutes: 2,
    paragraphs: [
      "30 minutes de marche par jour aident l'insuline à mieux fonctionner et font baisser la glycémie.",
      "Pas besoin de salle de sport : marcher jusqu'au marché, monter les escaliers, danser, faire le ménage, tout compte.",
      'Si vous prenez des médicaments qui font baisser le sucre, gardez toujours un peu de sucre sur vous quand vous bougez.',
    ],
    quiz: {
      question: 'Marcher après le repas peut aider à faire baisser la glycémie.',
      answer: true,
      explanation: "Une marche de 10 à 15 minutes après le repas aide les muscles à utiliser le sucre.",
    },
  },
  {
    id: 'pieds',
    icon: 'footsteps-outline',
    title: 'Prendre soin de ses pieds',
    minutes: 2,
    paragraphs: [
      'Le diabète peut diminuer la sensibilité des pieds : une blessure peut passer inaperçue et s\'infecter.',
      'Chaque jour : regardez vos pieds (ou demandez à un proche), lavez-les, séchez bien entre les orteils.',
      'Évitez de marcher pieds nus, portez des chaussures confortables, et montrez toute plaie à un soignant rapidement.',
    ],
    quiz: {
      question: 'Il faut regarder ses pieds tous les jours.',
      answer: true,
      explanation: 'Oui : une petite plaie soignée tôt évite de graves complications.',
    },
  },
  {
    id: 'mesurer',
    icon: 'water-outline',
    title: 'Bien mesurer sa glycémie',
    minutes: 2,
    paragraphs: [
      'Lavez-vous les mains à l\'eau et au savon et séchez-les bien : du sucre sur les doigts fausse la mesure.',
      'Piquez sur le côté du bout du doigt (moins douloureux), changez de doigt à chaque fois.',
      'Gardez les bandelettes au sec et vérifiez leur date. Notez la valeur tout de suite dans GlycoLife.',
    ],
    quiz: {
      question: 'Il est inutile de se laver les mains avant la mesure.',
      answer: false,
      explanation: 'Un reste de sucre ou de fruit sur les doigts peut donner une valeur faussement haute.',
    },
  },
];
