import type { MealPreferencesState } from '@/features/meals/meals-config';

export type MealDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface MealIngredient {
  name: string;
  quantity: string;
  unit: string;
}

export interface MockMeal {
  id: string;
  name: string;
  type: string;
  description: string;
  image: string;
  ingredients: MealIngredient[];
  recipe: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: MealDifficulty;
}

export interface MockDay {
  dayIndex: number;
  dayName: string;
  date: string;
  meals: MockMeal[];
}

export interface GeneratedMealPlan {
  id: string;
  duration: number;
  days: MockDay[];
}

export interface MealPlanGeneratorInput {
  preferences: MealPreferencesState;
  householdSize?: number;
}

export interface MealPlanGenerator {
  generate(input: MealPlanGeneratorInput): Promise<GeneratedMealPlan>;
}

const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const MEAL_IMAGES: Record<string, string> = {
  breakfast:
    'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
  lunch:
    'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
  dinner:
    'https://images.pexels.com/photos/675951/pexels-photo-675951.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
  snack:
    'https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop',
};

interface MealTemplate {
  name: string;
  description: string;
  tags: string[];
  ingredients: MealIngredient[];
  recipe: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: MealDifficulty;
}

const BREAKFAST_TEMPLATES: MealTemplate[] = [
  {
    name: 'Dates & Oat Porridge',
    description: 'Creamy oats with Medjool dates, honey, and cinnamon.',
    tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Gluten-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: [
      { name: 'rolled oats', quantity: '1', unit: 'cup' },
      { name: 'Medjool dates, pitted and chopped', quantity: '4', unit: 'piece' },
      { name: 'honey', quantity: '2', unit: 'tbsp' },
      { name: 'ground cinnamon', quantity: '1', unit: 'tsp' },
      { name: 'oat milk', quantity: '2', unit: 'cup' },
    ],
    recipe: [
      'Pour the oat milk into a small saucepan and bring to a gentle simmer over medium heat.',
      'Stir in the rolled oats and cook for 5 minutes, stirring occasionally until creamy.',
      'Fold in the chopped Medjool dates and cook for 1 more minute.',
      'Remove from heat, transfer to bowls, and drizzle with honey.',
      'Dust with ground cinnamon and serve warm.',
    ],
    prepTime: 5,
    cookTime: 10,
    servings: 4,
    difficulty: 'Easy',
  },
  {
    name: 'Lentil & Spinach Stew',
    description: 'Hearty red lentils with spinach, cumin, and lemon.',
    tags: ['Vegan', 'Vegetarian', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: [
      { name: 'red lentils, rinsed', quantity: '1', unit: 'cup' },
      { name: 'fresh spinach', quantity: '2', unit: 'cup' },
      { name: 'ground cumin', quantity: '1', unit: 'tsp' },
      { name: 'lemon, juiced', quantity: '1', unit: 'piece' },
      { name: 'olive oil', quantity: '1', unit: 'tbsp' },
    ],
    recipe: [
      'Heat olive oil in a pot over medium heat.',
      'Add the red lentils and 3 cups of water, bring to a boil.',
      'Reduce heat and simmer for 15 minutes until lentils are tender.',
      'Stir in the fresh spinach and ground cumin, cook for 2 minutes until wilted.',
      'Remove from heat, stir in the lemon juice, and serve.',
    ],
    prepTime: 10,
    cookTime: 20,
    servings: 4,
    difficulty: 'Easy',
  },
  {
    name: "Avocado Toast on Rye",
    description: "Smashed avocado with za'atar and cherry tomatoes on rye bread.",
    tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: [
      { name: 'rye bread slices', quantity: '2', unit: 'slice' },
      { name: 'ripe avocado', quantity: '1', unit: 'piece' },
      { name: "za'atar spice blend", quantity: '1', unit: 'tsp' },
      { name: 'cherry tomatoes, halved', quantity: '6', unit: 'piece' },
      { name: 'sea salt', quantity: '1', unit: 'pinch' },
    ],
    recipe: [
      'Toast the rye bread slices until crisp and golden.',
      'Mash the avocado with a fork in a small bowl.',
      'Spread the mashed avocado evenly over the toast.',
      'Top with halved cherry tomatoes and sprinkle with za\'atar and sea salt.',
      'Serve immediately.',
    ],
    prepTime: 5,
    cookTime: 5,
    servings: 2,
    difficulty: 'Easy',
  },
  {
    name: 'Chickpea Shakshuka',
    description: 'Spiced tomato sauce with chickpeas and crusty bread.',
    tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: [
      { name: 'chickpeas, drained', quantity: '1', unit: 'can' },
      { name: 'crushed tomatoes', quantity: '2', unit: 'cup' },
      { name: 'paprika', quantity: '1', unit: 'tsp' },
      { name: 'onion, diced', quantity: '0.5', unit: 'piece' },
      { name: 'crusty bread slices', quantity: '2', unit: 'slice' },
    ],
    recipe: [
      'Heat a drizzle of oil in a skillet and sauté the diced onion until soft.',
      'Add the paprika and crushed tomatoes, stirring to combine.',
      'Simmer the sauce for 10 minutes until it thickens slightly.',
      'Add the drained chickpeas and cook for 5 minutes more.',
      'Serve hot with crusty bread on the side.',
    ],
    prepTime: 10,
    cookTime: 15,
    servings: 4,
    difficulty: 'Easy',
  },
  {
    name: 'Banana & Honey Smoothie Bowl',
    description: 'Blended banana, oat milk, and honey topped with seeds.',
    tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: [
      { name: 'bananas', quantity: '2', unit: 'piece' },
      { name: 'oat milk', quantity: '1', unit: 'cup' },
      { name: 'honey', quantity: '1', unit: 'tbsp' },
      { name: 'chia seeds', quantity: '2', unit: 'tbsp' },
      { name: 'pumpkin seeds', quantity: '2', unit: 'tbsp' },
    ],
    recipe: [
      'Peel the bananas and place them in a blender.',
      'Add the oat milk and honey, then blend until completely smooth.',
      'Pour the mixture into serving bowls.',
      'Sprinkle chia seeds and pumpkin seeds on top.',
      'Serve immediately while cold.',
    ],
    prepTime: 5,
    cookTime: 0,
    servings: 2,
    difficulty: 'Easy',
  },
  {
    name: 'Foul Medames',
    description: 'Egyptian fava beans with olive oil, garlic, and lemon.',
    tags: ['Vegan', 'Vegetarian', 'Dairy-Free', 'Gluten-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: [
      { name: 'fava beans', quantity: '2', unit: 'cup' },
      { name: 'garlic cloves, minced', quantity: '2', unit: 'clove' },
      { name: 'olive oil', quantity: '3', unit: 'tbsp' },
      { name: 'lemon, juiced', quantity: '1', unit: 'piece' },
      { name: 'ground cumin', quantity: '1', unit: 'tsp' },
    ],
    recipe: [
      'Place the fava beans in a pot with water and bring to a boil.',
      'Add the minced garlic and ground cumin, then reduce heat.',
      'Simmer for 20 minutes until the beans are very tender.',
      'Mash the beans lightly with a fork or potato masher.',
      'Drizzle with olive oil and lemon juice, then serve warm.',
    ],
    prepTime: 5,
    cookTime: 20,
    servings: 4,
    difficulty: 'Easy',
  },
  {
    name: 'Vegetable Paratha & Yogurt',
    description: 'Flaky stuffed flatbread with cooling yogurt dip.',
    tags: ['Vegetarian', 'Nut-Free', 'Seafood-Free'],
    ingredients: [
      { name: 'parathas', quantity: '2', unit: 'piece' },
      { name: 'plain yogurt', quantity: '0.5', unit: 'cup' },
      { name: 'cumin powder', quantity: '0.25', unit: 'tsp' },
      { name: 'fresh mint, chopped', quantity: '1', unit: 'tbsp' },
      { name: 'salt', quantity: '1', unit: 'pinch' },
    ],
    recipe: [
      'Heat a dry pan over medium heat.',
      'Cook the parathas for 2-3 minutes per side until golden and crisp.',
      'In a small bowl, mix the yogurt with cumin powder, chopped mint, and salt.',
      'Cut the parathas into quarters and serve with the yogurt dip.',
    ],
    prepTime: 5,
    cookTime: 8,
    servings: 2,
    difficulty: 'Easy',
  },
  {
    name: 'Quinoa Fruit Bowl',
    description: 'Warm quinoa with seasonal fruit, nuts, and maple syrup.',
    tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Gluten-Free', 'Seafood-Free'],
    ingredients: [
      { name: 'cooked quinoa', quantity: '1', unit: 'cup' },
      { name: 'apple, diced', quantity: '1', unit: 'piece' },
      { name: 'walnuts, chopped', quantity: '0.25', unit: 'cup' },
      { name: 'maple syrup', quantity: '2', unit: 'tbsp' },
      { name: 'vanilla extract', quantity: '1', unit: 'tsp' },
    ],
    recipe: [
      'Warm the cooked quinoa in a small saucepan over low heat.',
      'Stir in the diced apple and maple syrup until well combined.',
      'Add the vanilla extract and stir for 1 minute.',
      'Transfer to bowls and top with chopped walnuts.',
      'Serve warm.',
    ],
    prepTime: 5,
    cookTime: 5,
    servings: 2,
    difficulty: 'Easy',
  },
];

const LUNCH_TEMPLATES: MealTemplate[] = [
  {
    name: 'Grilled Chicken Shawarma Bowl',
    description: 'Marinated chicken over rice with garlic sauce and pickles.',
    tags: ['Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: [
      { name: 'chicken breasts', quantity: '2', unit: 'piece' },
      { name: 'shawarma spice blend', quantity: '1', unit: 'tsp' },
      { name: 'cooked rice', quantity: '1', unit: 'cup' },
      { name: 'garlic sauce (toum)', quantity: '2', unit: 'tbsp' },
      { name: 'pickled cucumbers', quantity: '0.5', unit: 'cup' },
    ],
    recipe: [
      'Coat the chicken breasts with shawarma spice and a drizzle of oil.',
      'Grill the chicken for 6 minutes per side until cooked through.',
      'Let the chicken rest for 3 minutes, then slice into strips.',
      'Divide the cooked rice between serving bowls.',
      'Top with sliced chicken, garlic sauce, and pickled cucumbers.',
    ],
    prepTime: 15,
    cookTime: 15,
    servings: 4,
    difficulty: 'Medium',
  },
  {
    name: 'Falafel & Hummus Wrap',
    description: 'Crispy falafel with hummus, lettuce, and tahini in flatbread.',
    tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: [
      { name: 'falafel patties', quantity: '4', unit: 'piece' },
      { name: 'hummus', quantity: '3', unit: 'tbsp' },
      { name: 'flatbread wrap', quantity: '1', unit: 'piece' },
      { name: 'tahini', quantity: '1', unit: 'tsp' },
      { name: 'fresh lettuce leaves', quantity: '1', unit: 'cup' },
    ],
    recipe: [
      'Fry or bake the falafel patties until golden and crisp.',
      'Warm the flatbread briefly in a dry pan.',
      'Spread a layer of hummus across the flatbread.',
      'Add the falafel patties, lettuce, and a drizzle of tahini.',
      'Roll up the wrap tightly, slice in half, and serve.',
    ],
    prepTime: 10,
    cookTime: 12,
    servings: 2,
    difficulty: 'Medium',
  },
  {
    name: 'Lamb Kofta with Rice',
    description: 'Spiced lamb meatballs with saffron rice and grilled vegetables.',
    tags: ['Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: [
      { name: 'ground lamb', quantity: '400', unit: 'g' },
      { name: 'ground cumin', quantity: '1', unit: 'tsp' },
      { name: 'basmati rice', quantity: '1', unit: 'cup' },
      { name: 'saffron threads', quantity: '1', unit: 'pinch' },
      { name: 'zucchini, sliced', quantity: '1', unit: 'piece' },
    ],
    recipe: [
      'Mix the ground lamb with cumin, salt, and pepper.',
      'Form the mixture into oval meatballs.',
      'Grill the kofta for 6 minutes per side until cooked through.',
      'Cook the basmati rice with saffron threads and 2 cups of water for 18 minutes.',
      'Grill the zucchini slices for 3 minutes per side and serve alongside.',
    ],
    prepTime: 15,
    cookTime: 20,
    servings: 4,
    difficulty: 'Medium',
  },
  {
    name: 'Mediterranean Salad with Tofu',
    description: 'Mixed greens, olives, and tofu with a lemon-herb dressing.',
    tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Gluten-Free', 'Seafood-Free'],
    ingredients: [
      { name: 'mixed greens', quantity: '4', unit: 'cup' },
      { name: 'firm tofu, cubed', quantity: '200', unit: 'g' },
      { name: 'olives', quantity: '0.5', unit: 'cup' },
      { name: 'lemon juice', quantity: '2', unit: 'tbsp' },
      { name: 'olive oil', quantity: '1', unit: 'tbsp' },
    ],
    recipe: [
      'Press the tofu and cut it into bite-sized cubes.',
      'Pan-fry the tofu in a little oil until golden on all sides.',
      'In a large bowl, combine the mixed greens and olives.',
      'Whisk together the lemon juice and olive oil to make the dressing.',
      'Add the tofu to the salad, drizzle with dressing, and toss to combine.',
    ],
    prepTime: 10,
    cookTime: 10,
    servings: 4,
    difficulty: 'Easy',
  },
  {
    name: 'Chicken & Quinoa Salad',
    description: 'Grilled chicken with quinoa, cucumber, and mint vinaigrette.',
    tags: ['Dairy-Free', 'Gluten-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: [
      { name: 'chicken breasts', quantity: '2', unit: 'piece' },
      { name: 'cooked quinoa', quantity: '1', unit: 'cup' },
      { name: 'cucumber, diced', quantity: '1', unit: 'piece' },
      { name: 'fresh mint, chopped', quantity: '2', unit: 'tbsp' },
      { name: 'lemon juice', quantity: '1', unit: 'tbsp' },
    ],
    recipe: [
      'Season the chicken breasts with salt and pepper.',
      'Grill for 6 minutes per side until cooked through, then let rest.',
      'In a bowl, combine the cooked quinoa, diced cucumber, and chopped mint.',
      'Whisk the lemon juice with olive oil and toss into the quinoa mixture.',
      'Slice the chicken and serve on top of the salad.',
    ],
    prepTime: 10,
    cookTime: 15,
    servings: 4,
    difficulty: 'Medium',
  },
  {
    name: 'Vegetable Biryani',
    description: 'Fragrant basmati rice with spiced vegetables and raita.',
    tags: ['Vegetarian', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: [
      { name: 'basmati rice', quantity: '2', unit: 'cup' },
      { name: 'mixed vegetables', quantity: '1', unit: 'cup' },
      { name: 'biryani spice blend', quantity: '1', unit: 'tsp' },
      { name: 'plain yogurt', quantity: '0.5', unit: 'cup' },
      { name: 'olive oil', quantity: '1', unit: 'tbsp' },
    ],
    recipe: [
      'Heat olive oil in a large pot and add the biryani spice blend.',
      'Add the mixed vegetables and sauté for 5 minutes.',
      'Add the rinsed basmati rice and 3 cups of water, bring to a boil.',
      'Cover, reduce heat, and simmer for 20 minutes until the rice is fluffy.',
      'Serve hot with a side of plain yogurt.',
    ],
    prepTime: 15,
    cookTime: 25,
    servings: 4,
    difficulty: 'Medium',
  },
  {
    name: 'Grilled Salmon & Greens',
    description: 'Atlantic salmon with sautéed greens and lemon butter.',
    tags: ['Gluten-Free', 'Dairy-Free', 'Nut-Free'],
    ingredients: [
      { name: 'salmon fillets', quantity: '2', unit: 'piece' },
      { name: 'fresh spinach', quantity: '3', unit: 'cup' },
      { name: 'lemon juice', quantity: '1', unit: 'tbsp' },
      { name: 'olive oil', quantity: '1', unit: 'tbsp' },
      { name: 'garlic cloves, minced', quantity: '2', unit: 'clove' },
    ],
    recipe: [
      'Season the salmon fillets with salt and pepper.',
      'Grill skin-side down for 4 minutes, then flip and cook 4 more minutes.',
      'In a separate pan, heat olive oil and sauté the minced garlic.',
      'Add the spinach and cook until wilted, about 2 minutes.',
      'Serve the salmon over the greens with a squeeze of lemon.',
    ],
    prepTime: 10,
    cookTime: 12,
    servings: 2,
    difficulty: 'Medium',
  },
  {
    name: 'Stuffed Vine Leaves',
    description: 'Rice-stuffed grape leaves with a tangy yogurt dip.',
    tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: [
      { name: 'grape leaves', quantity: '12', unit: 'piece' },
      { name: 'cooked rice', quantity: '1', unit: 'cup' },
      { name: 'lemon juice', quantity: '2', unit: 'tbsp' },
      { name: 'olive oil', quantity: '1', unit: 'tbsp' },
      { name: 'dried mint', quantity: '1', unit: 'tsp' },
    ],
    recipe: [
      'Lay a grape leaf flat and place a spoonful of cooked rice near the stem.',
      'Fold the sides over the rice and roll tightly into a small parcel.',
      'Repeat with the remaining leaves and rice.',
      'Arrange the rolls in a pot, add lemon water, and simmer for 30 minutes.',
      'Drizzle with olive oil and dried mint before serving.',
    ],
    prepTime: 20,
    cookTime: 30,
    servings: 4,
    difficulty: 'Hard',
  },
];

const DINNER_TEMPLATES: MealTemplate[] = [
  {
    name: 'Moroccan Lamb Tagine',
    description: 'Slow-braised lamb with apricots, almonds, and ras el hanout.',
    tags: ['Dairy-Free', 'Gluten-Free', 'Seafood-Free'],
    ingredients: [
      { name: 'lamb shoulder, cubed', quantity: '500', unit: 'g' },
      { name: 'dried apricots', quantity: '6', unit: 'piece' },
      { name: 'almonds, slivered', quantity: '0.25', unit: 'cup' },
      { name: 'ras el hanout spice', quantity: '1', unit: 'tsp' },
      { name: 'onion, sliced', quantity: '1', unit: 'piece' },
    ],
    recipe: [
      'Sear the lamb cubes in a tagine or heavy pot until browned on all sides.',
      'Add the sliced onion and ras el hanout, stirring to coat the lamb.',
      'Add 2 cups of water, cover, and braise on low heat for 75 minutes.',
      'Stir in the dried apricots and slivered almonds.',
      'Cook uncovered for 15 more minutes until the sauce thickens, then serve.',
    ],
    prepTime: 15,
    cookTime: 90,
    servings: 4,
    difficulty: 'Hard',
  },
  {
    name: 'Chicken Tagine with Olives',
    description: 'Tender chicken with preserved lemons and green olives.',
    tags: ['Dairy-Free', 'Gluten-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: [
      { name: 'chicken thighs', quantity: '4', unit: 'piece' },
      { name: 'green olives, pitted', quantity: '0.5', unit: 'cup' },
      { name: 'preserved lemon', quantity: '1', unit: 'piece' },
      { name: 'ground ginger', quantity: '1', unit: 'tsp' },
      { name: 'onion, sliced', quantity: '1', unit: 'piece' },
    ],
    recipe: [
      'Brown the chicken thighs in a tagine or large pot.',
      'Add the sliced onion, ginger, and chopped preserved lemon.',
      'Pour in 1 cup of water, cover, and simmer for 30 minutes.',
      'Add the green olives and cook uncovered for 10 more minutes.',
      'Serve hot with bread or couscous.',
    ],
    prepTime: 10,
    cookTime: 45,
    servings: 4,
    difficulty: 'Medium',
  },
  {
    name: 'Vegetable Couscous',
    description: 'Steamed couscous with root vegetables and chickpea stew.',
    tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: [
      { name: 'couscous', quantity: '1', unit: 'cup' },
      { name: 'carrots, sliced', quantity: '2', unit: 'piece' },
      { name: 'zucchini, sliced', quantity: '1', unit: 'piece' },
      { name: 'chickpeas, drained', quantity: '1', unit: 'can' },
      { name: 'ground cumin', quantity: '1', unit: 'tsp' },
    ],
    recipe: [
      'Simmer the carrots, zucchini, and chickpeas in 2 cups of water with cumin for 20 minutes.',
      'Pour 1 cup of boiling water over the couscous, cover, and let stand for 5 minutes.',
      'Fluff the couscous with a fork and transfer to a serving plate.',
      'Spoon the vegetable and chickpea stew over the couscous.',
      'Serve immediately.',
    ],
    prepTime: 10,
    cookTime: 25,
    servings: 4,
    difficulty: 'Easy',
  },
  {
    name: 'Grilled Branzino with Herbs',
    description: 'Whole grilled fish with fresh herbs and lemon.',
    tags: ['Dairy-Free', 'Gluten-Free', 'Nut-Free'],
    ingredients: [
      { name: 'whole branzino, cleaned', quantity: '2', unit: 'piece' },
      { name: 'fresh parsley, chopped', quantity: '1', unit: 'bunch' },
      { name: 'lemon, sliced', quantity: '1', unit: 'piece' },
      { name: 'olive oil', quantity: '3', unit: 'tbsp' },
      { name: 'garlic cloves, minced', quantity: '2', unit: 'clove' },
    ],
    recipe: [
      'Stuff each branzino with chopped parsley, minced garlic, and lemon slices.',
      'Brush the outside with olive oil and season with salt.',
      'Grill the fish for 7 minutes per side until the skin is crisp.',
      'Check that the flesh flakes easily with a fork.',
      'Serve whole with additional lemon slices and olive oil.',
    ],
    prepTime: 10,
    cookTime: 15,
    servings: 2,
    difficulty: 'Medium',
  },
  {
    name: 'Beef Shawarma Plate',
    description: 'Spiced beef with saffron rice, garlic sauce, and salad.',
    tags: ['Dairy-Free', 'Gluten-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: [
      { name: 'beef strips', quantity: '400', unit: 'g' },
      { name: 'shawarma spice blend', quantity: '1', unit: 'tsp' },
      { name: 'basmati rice', quantity: '1', unit: 'cup' },
      { name: 'garlic sauce (toum)', quantity: '2', unit: 'tbsp' },
      { name: 'mixed salad greens', quantity: '2', unit: 'cup' },
    ],
    recipe: [
      'Toss the beef strips with shawarma spice and a drizzle of oil.',
      'Sear the beef in a hot pan for 8 minutes until browned.',
      'Cook the basmati rice with a pinch of saffron and 2 cups of water for 18 minutes.',
      'Plate the rice, then top with the beef strips.',
      'Add a side of salad and drizzle with garlic sauce.',
    ],
    prepTime: 15,
    cookTime: 20,
    servings: 4,
    difficulty: 'Medium',
  },
  {
    name: 'Mushroom & Lentil Ragout',
    description: 'Rich mushroom and lentil stew over creamy polenta.',
    tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: [
      { name: 'mushrooms, sliced', quantity: '300', unit: 'g' },
      { name: 'green lentils', quantity: '1', unit: 'cup' },
      { name: 'polenta', quantity: '0.5', unit: 'cup' },
      { name: 'onion, diced', quantity: '1', unit: 'piece' },
      { name: 'garlic cloves, minced', quantity: '2', unit: 'clove' },
    ],
    recipe: [
      'Sauté the mushrooms and diced onion in oil until the mushrooms release their liquid.',
      'Add the minced garlic and green lentils with 3 cups of water.',
      'Simmer for 30 minutes until the lentils are tender.',
      'Cook the polenta according to package directions until creamy.',
      'Spoon the polenta into bowls and top with the mushroom lentil ragout.',
    ],
    prepTime: 10,
    cookTime: 35,
    servings: 4,
    difficulty: 'Medium',
  },
  {
    name: 'Chicken Mansaf',
    description: 'Tender chicken in jameed sauce over rice with toasted almonds.',
    tags: ['Seafood-Free'],
    ingredients: [
      { name: 'chicken thighs', quantity: '4', unit: 'piece' },
      { name: 'jameed sauce', quantity: '1', unit: 'cup' },
      { name: 'basmati rice', quantity: '1', unit: 'cup' },
      { name: 'almonds, slivered', quantity: '0.25', unit: 'cup' },
      { name: 'ground turmeric', quantity: '1', unit: 'tsp' },
    ],
    recipe: [
      'Simmer the chicken thighs in the jameed sauce for 40 minutes over low heat.',
      'Cook the basmati rice with turmeric and 2 cups of water for 18 minutes.',
      'Toast the slivered almonds in a dry pan until golden.',
      'Spread the rice on a serving platter and top with the chicken.',
      'Pour the sauce over the top and sprinkle with toasted almonds.',
    ],
    prepTime: 10,
    cookTime: 45,
    servings: 4,
    difficulty: 'Medium',
  },
  {
    name: 'Roasted Vegetable Moussaka',
    description: 'Layered eggplant, tomatoes, and chickpeas with herb crust.',
    tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: [
      { name: 'eggplants, sliced', quantity: '2', unit: 'piece' },
      { name: 'crushed tomatoes', quantity: '2', unit: 'cup' },
      { name: 'chickpeas, drained', quantity: '1', unit: 'can' },
      { name: 'dried oregano', quantity: '1', unit: 'tsp' },
      { name: 'olive oil', quantity: '2', unit: 'tbsp' },
    ],
    recipe: [
      'Brush the eggplant slices with olive oil and roast at 200°C for 20 minutes.',
      'Mix the crushed tomatoes with chickpeas and oregano.',
      'Layer the roasted eggplant and tomato mixture in a baking dish.',
      'Bake at 180°C for 30 minutes until bubbly and the top is golden.',
      'Let rest for 5 minutes before serving.',
    ],
    prepTime: 15,
    cookTime: 50,
    servings: 4,
    difficulty: 'Hard',
  },
];

const SNACK_TEMPLATES: MealTemplate[] = [
  {
    name: 'Mixed Fruit & Nuts',
    description: 'Seasonal fruit with a handful of mixed nuts.',
    tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Gluten-Free', 'Seafood-Free'],
    ingredients: [
      { name: 'apple, sliced', quantity: '1', unit: 'piece' },
      { name: 'walnuts', quantity: '0.25', unit: 'cup' },
      { name: 'almonds', quantity: '0.25', unit: 'cup' },
      { name: 'dried figs', quantity: '2', unit: 'piece' },
    ],
    recipe: [
      'Slice the apple into wedges.',
      'Arrange the apple slices, walnuts, almonds, and dried figs on a plate.',
      'Serve immediately.',
    ],
    prepTime: 5,
    cookTime: 0,
    servings: 2,
    difficulty: 'Easy',
  },
  {
    name: 'Hummus & Veggie Sticks',
    description: 'Creamy hummus with cucumber, carrot, and bell pepper sticks.',
    tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: [
      { name: 'hummus', quantity: '0.5', unit: 'cup' },
      { name: 'cucumber', quantity: '1', unit: 'piece' },
      { name: 'carrot', quantity: '1', unit: 'piece' },
      { name: 'bell pepper', quantity: '1', unit: 'piece' },
      { name: 'olive oil', quantity: '1', unit: 'tbsp' },
    ],
    recipe: [
      'Cut the cucumber, carrot, and bell pepper into stick-shaped pieces.',
      'Spoon the hummus into a small serving bowl.',
      'Drizzle the hummus with olive oil.',
      'Arrange the veggie sticks around the bowl and serve.',
    ],
    prepTime: 10,
    cookTime: 0,
    servings: 2,
    difficulty: 'Easy',
  },
  {
    name: 'Greek Yogurt with Honey',
    description: 'Thick yogurt drizzled with honey and a sprinkle of cinnamon.',
    tags: ['Vegetarian', 'Nut-Free', 'Seafood-Free', 'Gluten-Free'],
    ingredients: [
      { name: 'Greek yogurt', quantity: '1', unit: 'cup' },
      { name: 'honey', quantity: '1', unit: 'tbsp' },
      { name: 'ground cinnamon', quantity: '1', unit: 'pinch' },
    ],
    recipe: [
      'Spoon the Greek yogurt into a serving bowl.',
      'Drizzle the honey evenly over the yogurt.',
      'Dust with a pinch of ground cinnamon and serve.',
    ],
    prepTime: 2,
    cookTime: 0,
    servings: 1,
    difficulty: 'Easy',
  },
  {
    name: 'Stuffed Dates with Almonds',
    description: 'Medjool dates filled with whole almonds.',
    tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Gluten-Free', 'Seafood-Free'],
    ingredients: [
      { name: 'Medjool dates', quantity: '6', unit: 'piece' },
      { name: 'whole almonds', quantity: '6', unit: 'piece' },
    ],
    recipe: [
      'Make a lengthwise slit in each date and remove the pit.',
      'Insert one whole almond into each date.',
      'Arrange on a plate and serve at room temperature.',
    ],
    prepTime: 5,
    cookTime: 0,
    servings: 2,
    difficulty: 'Easy',
  },
  {
    name: 'Rice Cakes with Avocado',
    description: 'Crispy rice cakes topped with avocado and chili flakes.',
    tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: [
      { name: 'rice cakes', quantity: '2', unit: 'piece' },
      { name: 'avocado, mashed', quantity: '0.5', unit: 'piece' },
      { name: 'chili flakes', quantity: '1', unit: 'pinch' },
      { name: 'sea salt', quantity: '1', unit: 'pinch' },
    ],
    recipe: [
      'Mash the avocado in a small bowl until smooth.',
      'Spread the mashed avocado over the rice cakes.',
      'Sprinkle with chili flakes and sea salt.',
      'Serve immediately.',
    ],
    prepTime: 3,
    cookTime: 0,
    servings: 1,
    difficulty: 'Easy',
  },
  {
    name: 'Fresh Fruit Smoothie',
    description: 'Blended seasonal fruit with oat milk.',
    tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Gluten-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: [
      { name: 'banana', quantity: '1', unit: 'piece' },
      { name: 'mixed berries', quantity: '0.5', unit: 'cup' },
      { name: 'oat milk', quantity: '1', unit: 'cup' },
      { name: 'honey', quantity: '1', unit: 'tsp' },
    ],
    recipe: [
      'Peel the banana and place it in a blender.',
      'Add the mixed berries, oat milk, and honey.',
      'Blend on high until completely smooth.',
      'Pour into a glass and serve chilled.',
    ],
    prepTime: 5,
    cookTime: 0,
    servings: 2,
    difficulty: 'Easy',
  },
];

const TEMPLATES_BY_TYPE: Record<string, MealTemplate[]> = {
  breakfast: BREAKFAST_TEMPLATES,
  lunch: LUNCH_TEMPLATES,
  dinner: DINNER_TEMPLATES,
  snack: SNACK_TEMPLATES,
};

const ALLERGY_KEYWORDS: Record<string, string[]> = {
  Peanuts: ['peanut', 'nut'],
  'Tree Nuts': ['nut', 'almond', 'cashew', 'walnut', 'pecan', 'hazelnut', 'pistachio'],
  Milk: ['milk', 'yogurt', 'cheese', 'cream', 'butter', 'dairy', 'raita', 'jameed', 'polenta'],
  Eggs: ['egg'],
  Wheat: ['wheat', 'bread', 'flatbread', 'couscous', 'paratha', 'pita'],
  Soy: ['soy', 'tofu'],
  Fish: ['fish', 'salmon', 'branzino'],
  Shellfish: ['shrimp', 'prawn', 'crab', 'lobster', 'shellfish'],
  Sesame: ['sesame', 'tahini', "za'atar"],
  Mustard: ['mustard'],
  Sulphites: ['sulphite', 'sulfite', 'vinegar'],
  Gluten: ['gluten', 'wheat', 'bread', 'couscous', 'paratha', 'flatbread', 'pita', 'rye'],
};

function isCompatible(
  template: MealTemplate,
  dietary: string[],
  allergies: string[]
): boolean {
  const dietaryMatch = dietary.every((pref) =>
    template.tags.some((t) => t === pref || t === pref.replace('-', ''))
  );

  const allergyBlocked = allergies.some((allergy) => {
    const keywords = ALLERGY_KEYWORDS[allergy];
    const haystack = (
      template.name +
      ' ' +
      template.description +
      ' ' +
      template.ingredients.map((i) => i.name).join(' ')
    ).toLowerCase();
    if (!keywords) {
      return haystack.includes(allergy.toLowerCase());
    }
    return keywords.some((kw) => haystack.includes(kw));
  });

  return dietaryMatch && !allergyBlocked;
}

function pickMeals(
  type: string,
  count: number,
  dietary: string[],
  allergies: string[]
): MealTemplate[] {
  const pool = (TEMPLATES_BY_TYPE[type] ?? []).filter((t) =>
    isCompatible(t, dietary, allergies)
  );
  const source = pool.length > 0 ? pool : TEMPLATES_BY_TYPE[type] ?? [];
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  const picked: MealTemplate[] = [];
  for (let i = 0; i < count; i++) {
    picked.push(shuffled[i % shuffled.length]);
  }
  return picked;
}

const FALLBACK_TEMPLATE: MealTemplate = {
  name: 'Simple Meal',
  description: 'A balanced halal meal.',
  tags: [],
  ingredients: [
    { name: 'mixed vegetables', quantity: '2', unit: 'cup' },
    { name: 'rice', quantity: '1', unit: 'cup' },
    { name: 'spices', quantity: '1', unit: 'tsp' },
  ],
  recipe: [
    'Prepare and wash the vegetables.',
    'Cook the rice according to package directions.',
    'Season with spices and combine everything in a pan.',
    'Cook until heated through and serve.',
  ],
  prepTime: 10,
  cookTime: 20,
  servings: 4,
  difficulty: 'Easy',
};

export class MockMealPlanGenerator implements MealPlanGenerator {
  async generate(input: MealPlanGeneratorInput): Promise<GeneratedMealPlan> {
    const { preferences, householdSize = 4 } = input;
    const { planningDuration, mealTypes, dietaryPreferences, allergies } =
      preferences;

    await new Promise((resolve) => setTimeout(resolve, 1200));

    const days: MockDay[] = [];
    for (let i = 0; i < planningDuration; i++) {
      const dayName = DAY_NAMES[i % DAY_NAMES.length];
      const date = new Date();
      date.setDate(date.getDate() + i);
      const meals: MockMeal[] = mealTypes.map((type, idx) => {
        const candidates = pickMeals(
          type,
          1,
          dietaryPreferences,
          allergies
        );
        const template = candidates[0] ?? FALLBACK_TEMPLATE;
        return {
          id: `${i}-${type}-${idx}`,
          name: template.name,
          type,
          description: template.description,
          image: MEAL_IMAGES[type] ?? MEAL_IMAGES.dinner,
          ingredients: template.ingredients,
          recipe: template.recipe,
          prepTime: template.prepTime,
          cookTime: template.cookTime,
          servings: householdSize,
          difficulty: template.difficulty,
        };
      });
      days.push({
        dayIndex: i,
        dayName,
        date: date.toISOString().split('T')[0],
        meals,
      });
    }

    return {
      id: crypto.randomUUID(),
      duration: planningDuration,
      days,
    };
  }
}

export const mockMealPlanGenerator = new MockMealPlanGenerator();

export function normalizeMeal(meal: Record<string, unknown>): MockMeal {
  const rawIngredients = (meal.ingredients as unknown[]) ?? [];
  const ingredients: MealIngredient[] = rawIngredients.map((ing) => {
    if (typeof ing === 'string') {
      return { name: ing, quantity: '', unit: '' };
    }
    const obj = ing as Record<string, string>;
    return {
      name: obj.name ?? '',
      quantity: obj.quantity ?? '',
      unit: obj.unit ?? '',
    };
  });

  const rawRecipe = meal.recipe;
  const recipe: string[] =
    typeof rawRecipe === 'string'
      ? rawRecipe
          .split(/(?<=[.])\s+/)
          .map((s) => s.trim())
          .filter(Boolean)
      : Array.isArray(rawRecipe)
        ? (rawRecipe as string[]).map((s) => String(s))
        : [];

  const difficulty = meal.difficulty as MealDifficulty | undefined;

  return {
    id: String(meal.id ?? ''),
    name: String(meal.name ?? ''),
    type: String(meal.type ?? ''),
    description: String(meal.description ?? ''),
    image: String(meal.image ?? ''),
    ingredients,
    recipe,
    prepTime: Number(meal.prepTime ?? 0),
    cookTime: Number(meal.cookTime ?? 0),
    servings: Number(meal.servings ?? 4),
    difficulty: difficulty ?? 'Medium',
  };
}

export function normalizePlan(data: Record<string, unknown>): GeneratedMealPlan {
  const rawDays = (data.days as Record<string, unknown>[]) ?? [];
  return {
    id: String(data.id ?? ''),
    duration: Number(data.duration ?? 0),
    days: rawDays.map((day) => ({
      dayIndex: Number(day.dayIndex ?? 0),
      dayName: String(day.dayName ?? ''),
      date: String(day.date ?? ''),
      meals: ((day.meals as Record<string, unknown>[]) ?? []).map(normalizeMeal),
    })),
  };
}
