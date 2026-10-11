// Aliments courants à Kinshasa. Glucides par portion : ESTIMATIONS à faire valider
// par un professionnel de santé (nutritionniste) avant tout usage réel.

export interface Food {
  id: string;
  name: string;
  portion: string;
  carbs: number; // g de glucides par portion
  kind: 'feculent' | 'sucre' | 'legume' | 'proteine' | 'fruit' | 'boisson';
}

export const FOODS: Food[] = [
  { id: 'fufu', name: 'Fufu (manioc)', portion: '1 boule moyenne', carbs: 90, kind: 'feculent' },
  { id: 'chikwangue', name: 'Chikwangue', portion: '1 morceau', carbs: 70, kind: 'feculent' },
  { id: 'riz', name: 'Riz', portion: '1 assiette', carbs: 55, kind: 'feculent' },
  { id: 'pain', name: 'Pain', portion: '½ baguette', carbs: 60, kind: 'feculent' },
  { id: 'mikate', name: 'Mikate (beignets)', portion: '3 beignets', carbs: 45, kind: 'feculent' },
  { id: 'plantain', name: 'Banane plantain', portion: '1 banane', carbs: 60, kind: 'feculent' },
  { id: 'patate', name: 'Patate douce', portion: '1 moyenne', carbs: 40, kind: 'feculent' },
  { id: 'spaghetti', name: 'Spaghetti', portion: '1 assiette', carbs: 60, kind: 'feculent' },
  { id: 'mais', name: 'Maïs grillé', portion: '1 épi', carbs: 30, kind: 'feculent' },
  { id: 'haricots', name: 'Haricots (madesu)', portion: '1 louche', carbs: 30, kind: 'feculent' },
  { id: 'pondu', name: 'Pondu', portion: '1 louche', carbs: 8, kind: 'legume' },
  { id: 'ndunda', name: 'Ndunda (légumes)', portion: '1 louche', carbs: 5, kind: 'legume' },
  { id: 'poisson', name: 'Poisson (mbisi)', portion: '1 morceau', carbs: 0, kind: 'proteine' },
  { id: 'poulet', name: 'Poulet / viande', portion: '1 morceau', carbs: 0, kind: 'proteine' },
  { id: 'oeuf', name: 'Œuf', portion: '1 œuf', carbs: 1, kind: 'proteine' },
  { id: 'arachides', name: 'Arachides', portion: '1 poignée', carbs: 5, kind: 'proteine' },
  { id: 'mangue', name: 'Mangue', portion: '1 mangue', carbs: 35, kind: 'fruit' },
  { id: 'avocat', name: 'Avocat', portion: '½ avocat', carbs: 2, kind: 'fruit' },
  { id: 'soda', name: 'Soda', portion: '1 bouteille 33 cl', carbs: 35, kind: 'sucre' },
  { id: 'jus', name: 'Jus sucré', portion: '1 verre', carbs: 30, kind: 'sucre' },
  { id: 'biere', name: 'Bière', portion: '1 grande bouteille', carbs: 23, kind: 'boisson' },
  { id: 'the_sucre', name: 'Thé / café sucré', portion: '1 tasse (2 sucres)', carbs: 10, kind: 'sucre' },
];

export const FOOD_BY_ID: Record<string, Food> = Object.fromEntries(FOODS.map((f) => [f.id, f]));

/** Aliments qui font monter la glycémie : suivis par l'analyse sans IA. */
export const isTracked = (f: Food) => f.kind === 'feculent' || f.kind === 'sucre' || f.kind === 'boisson';

export type MealLoad = 'leger' | 'modere' | 'riche';
export function mealLoad(carbs: number): MealLoad {
  if (carbs < 45) return 'leger';
  if (carbs <= 90) return 'modere';
  return 'riche';
}
export const MEAL_LOAD_LABEL: Record<MealLoad, string> = {
  leger: 'Repas léger',
  modere: 'Repas modéré',
  riche: 'Repas riche en glucides',
};
