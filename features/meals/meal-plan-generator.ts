import type { MealPreferencesState } from '@/features/meals/meals-config';

export interface MockMeal {
  id: string;
  name: string;
  type: string;
  description: string;
  image: string;
  ingredients: string[];
  recipe: string;
  prepTime: number;
  cookTime: number;
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
  ingredients: string[];
  recipe: string;
  prepTime: number;
  cookTime: number;
}

const BREAKFAST_TEMPLATES: MealTemplate[] = [
  {
    name: 'Dates & Oat Porridge',
    description: 'Creamy oats with Medjool dates, honey, and cinnamon.',
    tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Gluten-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: ['1 cup rolled oats', '4 Medjool dates, pitted and chopped', '2 tbsp honey', '1 tsp ground cinnamon', '2 cups oat milk'],
    recipe: 'Bring oat milk to a simmer, stir in oats and cook 5 minutes. Fold in chopped dates, then top with honey and cinnamon.',
    prepTime: 5,
    cookTime: 10,
  },
  {
    name: 'Lentil & Spinach Stew',
    description: 'Hearty red lentils with spinach, cumin, and lemon.',
    tags: ['Vegan', 'Vegetarian', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: ['1 cup red lentils', '2 cups fresh spinach', '1 tsp cumin', '1 lemon, juiced', '1 tbsp olive oil'],
    recipe: 'Simmer lentils in water until tender, about 15 minutes. Stir in spinach and cumin, cook 2 minutes, finish with lemon juice.',
    prepTime: 10,
    cookTime: 20,
  },
  {
    name: 'Avocado Toast on Rye',
    description: "Smashed avocado with za'atar and cherry tomatoes on rye bread.",
    tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: ['2 slices rye bread', '1 ripe avocado', '1 tsp za\'atar', '6 cherry tomatoes, halved', 'Pinch of sea salt'],
    recipe: 'Toast rye bread until crisp. Mash avocado with a fork, spread on toast, top with tomatoes, za\'atar, and salt.',
    prepTime: 5,
    cookTime: 5,
  },
  {
    name: 'Chickpea Shakshuka',
    description: 'Spiced tomato sauce with chickpeas and crusty bread.',
    tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: ['1 can chickpeas', '2 cups crushed tomatoes', '1 tsp paprika', '1/2 onion, diced', '2 slices crusty bread'],
    recipe: 'Sauté onion until soft, add paprika and tomatoes, simmer 10 minutes. Add chickpeas and cook 5 minutes. Serve with bread.',
    prepTime: 10,
    cookTime: 15,
  },
  {
    name: 'Banana & Honey Smoothie Bowl',
    description: 'Blended banana, oat milk, and honey topped with seeds.',
    tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: ['2 bananas', '1 cup oat milk', '1 tbsp honey', '2 tbsp chia seeds', '2 tbsp pumpkin seeds'],
    recipe: 'Blend bananas, oat milk, and honey until smooth. Pour into a bowl and top with chia and pumpkin seeds.',
    prepTime: 5,
    cookTime: 0,
  },
  {
    name: 'Foul Medames',
    description: 'Egyptian fava beans with olive oil, garlic, and lemon.',
    tags: ['Vegan', 'Vegetarian', 'Dairy-Free', 'Gluten-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: ['2 cups fava beans', '2 cloves garlic, minced', '3 tbsp olive oil', '1 lemon, juiced', '1 tsp cumin'],
    recipe: 'Simmer fava beans with garlic and cumin for 20 minutes. Mash lightly, drizzle with olive oil and lemon juice.',
    prepTime: 5,
    cookTime: 20,
  },
  {
    name: 'Vegetable Paratha & Yogurt',
    description: 'Flaky stuffed flatbread with cooling yogurt dip.',
    tags: ['Vegetarian', 'Nut-Free', 'Seafood-Free'],
    ingredients: ['2 parathas', '1/2 cup plain yogurt', '1/4 tsp cumin powder', '1 tbsp chopped mint', 'Pinch of salt'],
    recipe: 'Cook parathas in a dry pan until golden. Mix yogurt with cumin, mint, and salt. Serve parathas with yogurt dip.',
    prepTime: 5,
    cookTime: 8,
  },
  {
    name: 'Quinoa Fruit Bowl',
    description: 'Warm quinoa with seasonal fruit, nuts, and maple syrup.',
    tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Gluten-Free', 'Seafood-Free'],
    ingredients: ['1 cup cooked quinoa', '1 diced apple', '1/4 cup walnuts', '2 tbsp maple syrup', '1 tsp vanilla extract'],
    recipe: 'Warm cooked quinoa, stir in diced apple and maple syrup. Top with walnuts and a dash of vanilla.',
    prepTime: 5,
    cookTime: 5,
  },
];

const LUNCH_TEMPLATES: MealTemplate[] = [
  {
    name: 'Grilled Chicken Shawarma Bowl',
    description: 'Marinated chicken over rice with garlic sauce and pickles.',
    tags: ['Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: ['2 chicken breasts', '1 tsp shawarma spice', '1 cup cooked rice', '2 tbsp garlic sauce', 'Pickled cucumbers'],
    recipe: 'Marinate chicken in shawarma spice, grill 6 minutes per side. Serve over rice with garlic sauce and pickles.',
    prepTime: 15,
    cookTime: 15,
  },
  {
    name: 'Falafel & Hummus Wrap',
    description: 'Crispy falafel with hummus, lettuce, and tahini in flatbread.',
    tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: ['4 falafel patties', '3 tbsp hummus', '1 flatbread wrap', '1 tsp tahini', 'Handful of lettuce'],
    recipe: 'Fry or bake falafel until crisp. Spread hummus on flatbread, add falafel, lettuce, and tahini, then roll up.',
    prepTime: 10,
    cookTime: 12,
  },
  {
    name: 'Lamb Kofta with Rice',
    description: 'Spiced lamb meatballs with saffron rice and grilled vegetables.',
    tags: ['Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: ['400g ground lamb', '1 tsp cumin', '1 cup basmati rice', 'Pinch of saffron', '1 zucchini, grilled'],
    recipe: 'Mix lamb with cumin, form into meatballs, grill 12 minutes. Cook rice with saffron. Serve kofta over rice with zucchini.',
    prepTime: 15,
    cookTime: 20,
  },
  {
    name: 'Mediterranean Salad with Tofu',
    description: 'Mixed greens, olives, and tofu with a lemon-herb dressing.',
    tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Gluten-Free', 'Seafood-Free'],
    ingredients: ['4 cups mixed greens', '200g firm tofu, cubed', '1/2 cup olives', '2 tbsp lemon juice', '1 tbsp olive oil'],
    recipe: 'Pan-fry tofu until golden. Toss greens with olives, add tofu, and drizzle with lemon-olive oil dressing.',
    prepTime: 10,
    cookTime: 10,
  },
  {
    name: 'Chicken & Quinoa Salad',
    description: 'Grilled chicken with quinoa, cucumber, and mint vinaigrette.',
    tags: ['Dairy-Free', 'Gluten-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: ['2 chicken breasts', '1 cup cooked quinoa', '1 cucumber, diced', '2 tbsp fresh mint', '1 tbsp lemon juice'],
    recipe: 'Grill chicken 6 minutes per side, slice. Toss quinoa with cucumber, mint, and lemon juice. Top with chicken.',
    prepTime: 10,
    cookTime: 15,
  },
  {
    name: 'Vegetable Biryani',
    description: 'Fragrant basmati rice with spiced vegetables and raita.',
    tags: ['Vegetarian', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: ['2 cups basmati rice', '1 cup mixed vegetables', '1 tsp biryani spice', '1/2 cup plain yogurt', '1 tbsp olive oil'],
    recipe: 'Cook rice with biryani spice and vegetables until fluffy, 20 minutes. Serve with a side of yogurt.',
    prepTime: 15,
    cookTime: 25,
  },
  {
    name: 'Grilled Salmon & Greens',
    description: 'Atlantic salmon with sautéed greens and lemon butter.',
    tags: ['Gluten-Free', 'Dairy-Free', 'Nut-Free'],
    ingredients: ['2 salmon fillets', '3 cups spinach', '1 tbsp lemon juice', '1 tbsp olive oil', '2 cloves garlic'],
    recipe: 'Grill salmon 4 minutes per side. Sauté garlic in olive oil, add spinach until wilted. Serve with lemon.',
    prepTime: 10,
    cookTime: 12,
  },
  {
    name: 'Stuffed Vine Leaves',
    description: 'Rice-stuffed grape leaves with a tangy yogurt dip.',
    tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: ['12 grape leaves', '1 cup cooked rice', '2 tbsp lemon juice', '1 tbsp olive oil', '1 tsp dried mint'],
    recipe: 'Roll rice into grape leaves, simmer in lemon water 30 minutes. Serve with olive oil and dried mint.',
    prepTime: 20,
    cookTime: 30,
  },
];

const DINNER_TEMPLATES: MealTemplate[] = [
  {
    name: 'Moroccan Lamb Tagine',
    description: 'Slow-braised lamb with apricots, almonds, and ras el hanout.',
    tags: ['Dairy-Free', 'Gluten-Free', 'Seafood-Free'],
    ingredients: ['500g lamb shoulder', '6 dried apricots', '1/4 cup almonds', '1 tsp ras el hanout', '1 onion, sliced'],
    recipe: 'Sear lamb, add onion and spices, braise 90 minutes. Stir in apricots and almonds for the last 15 minutes.',
    prepTime: 15,
    cookTime: 90,
  },
  {
    name: 'Chicken Tagine with Olives',
    description: 'Tender chicken with preserved lemons and green olives.',
    tags: ['Dairy-Free', 'Gluten-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: ['4 chicken thighs', '1/2 cup green olives', '1 preserved lemon', '1 tsp ginger', '1 onion, sliced'],
    recipe: 'Brown chicken, add onion, ginger, and preserved lemon. Simmer 40 minutes, add olives for the last 10 minutes.',
    prepTime: 10,
    cookTime: 45,
  },
  {
    name: 'Vegetable Couscous',
    description: 'Steamed couscous with root vegetables and chickpea stew.',
    tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: ['1 cup couscous', '2 carrots, sliced', '1 zucchini, sliced', '1 can chickpeas', '1 tsp cumin'],
    recipe: 'Simmer vegetables and chickpeas with cumin for 20 minutes. Steam couscous, serve vegetable stew on top.',
    prepTime: 10,
    cookTime: 25,
  },
  {
    name: 'Grilled Branzino with Herbs',
    description: 'Whole grilled fish with fresh herbs and lemon.',
    tags: ['Dairy-Free', 'Gluten-Free', 'Nut-Free'],
    ingredients: ['2 whole branzino', '1 bunch fresh parsley', '1 lemon, sliced', '3 tbsp olive oil', '2 cloves garlic'],
    recipe: 'Stuff fish with parsley and garlic, grill 7 minutes per side. Serve with lemon slices and olive oil.',
    prepTime: 10,
    cookTime: 15,
  },
  {
    name: 'Beef Shawarma Plate',
    description: 'Spiced beef with saffron rice, garlic sauce, and salad.',
    tags: ['Dairy-Free', 'Gluten-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: ['400g beef strips', '1 tsp shawarma spice', '1 cup basmati rice', '2 tbsp garlic sauce', '2 cups mixed salad'],
    recipe: 'Sear beef with shawarma spice, 8 minutes. Cook rice with saffron. Serve beef over rice with salad and garlic sauce.',
    prepTime: 15,
    cookTime: 20,
  },
  {
    name: 'Mushroom & Lentil Ragout',
    description: 'Rich mushroom and lentil stew over creamy polenta.',
    tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: ['300g mushrooms, sliced', '1 cup green lentils', '1/2 cup polenta', '1 onion, diced', '2 cloves garlic'],
    recipe: 'Sauté mushrooms and onion, add lentils and water, simmer 30 minutes. Cook polenta, serve ragout on top.',
    prepTime: 10,
    cookTime: 35,
  },
  {
    name: 'Chicken Mansaf',
    description: 'Tender chicken in jameed sauce over rice with toasted almonds.',
    tags: ['Seafood-Free'],
    ingredients: ['4 chicken thighs', '1 cup jameed sauce', '1 cup basmati rice', '1/4 cup almonds', '1 tsp turmeric'],
    recipe: 'Simmer chicken in jameed sauce 40 minutes. Cook rice with turmeric. Serve chicken over rice, top with almonds.',
    prepTime: 10,
    cookTime: 45,
  },
  {
    name: 'Roasted Vegetable Moussaka',
    description: 'Layered eggplant, tomatoes, and chickpeas with herb crust.',
    tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: ['2 eggplants, sliced', '2 cups crushed tomatoes', '1 can chickpeas', '1 tsp oregano', '2 tbsp olive oil'],
    recipe: 'Roast eggplant slices 20 minutes. Layer with tomatoes and chickpeas, bake 30 minutes until bubbly.',
    prepTime: 15,
    cookTime: 50,
  },
];

const SNACK_TEMPLATES: MealTemplate[] = [
  {
    name: 'Mixed Fruit & Nuts',
    description: 'Seasonal fruit with a handful of mixed nuts.',
    tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Gluten-Free', 'Seafood-Free'],
    ingredients: ['1 apple, sliced', '1/4 cup walnuts', '1/4 cup almonds', '2 dried figs'],
    recipe: 'Arrange fruit and nuts on a plate. Serve immediately.',
    prepTime: 5,
    cookTime: 0,
  },
  {
    name: 'Hummus & Veggie Sticks',
    description: 'Creamy hummus with cucumber, carrot, and bell pepper sticks.',
    tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: ['1/2 cup hummus', '1 cucumber', '1 carrot', '1 bell pepper', '1 tbsp olive oil'],
    recipe: 'Cut vegetables into sticks. Serve with hummus and a drizzle of olive oil.',
    prepTime: 10,
    cookTime: 0,
  },
  {
    name: 'Greek Yogurt with Honey',
    description: 'Thick yogurt drizzled with honey and a sprinkle of cinnamon.',
    tags: ['Vegetarian', 'Nut-Free', 'Seafood-Free', 'Gluten-Free'],
    ingredients: ['1 cup Greek yogurt', '1 tbsp honey', 'Pinch of ground cinnamon'],
    recipe: 'Spoon yogurt into a bowl, drizzle with honey, and dust with cinnamon.',
    prepTime: 2,
    cookTime: 0,
  },
  {
    name: 'Stuffed Dates with Almonds',
    description: 'Medjool dates filled with whole almonds.',
    tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Gluten-Free', 'Seafood-Free'],
    ingredients: ['6 Medjool dates', '6 whole almonds'],
    recipe: 'Pit dates, insert one almond into each. Serve at room temperature.',
    prepTime: 5,
    cookTime: 0,
  },
  {
    name: 'Rice Cakes with Avocado',
    description: 'Crispy rice cakes topped with avocado and chili flakes.',
    tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: ['2 rice cakes', '1/2 avocado, mashed', 'Pinch of chili flakes', 'Pinch of sea salt'],
    recipe: 'Top rice cakes with mashed avocado, sprinkle with chili flakes and salt.',
    prepTime: 3,
    cookTime: 0,
  },
  {
    name: 'Fresh Fruit Smoothie',
    description: 'Blended seasonal fruit with oat milk.',
    tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Gluten-Free', 'Nut-Free', 'Seafood-Free'],
    ingredients: ['1 banana', '1/2 cup berries', '1 cup oat milk', '1 tsp honey'],
    recipe: 'Blend all ingredients until smooth. Serve chilled.',
    prepTime: 5,
    cookTime: 0,
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
    if (!keywords) {
      return (
        template.name.toLowerCase().includes(allergy.toLowerCase()) ||
        template.description.toLowerCase().includes(allergy.toLowerCase())
      );
    }
    const haystack = (
      template.name +
      ' ' +
      template.description
    ).toLowerCase();
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

export class MockMealPlanGenerator implements MealPlanGenerator {
  async generate(input: MealPlanGeneratorInput): Promise<GeneratedMealPlan> {
    const { preferences } = input;
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
        const template = candidates[0] ?? {
          name: 'Simple Meal',
          description: 'A balanced halal meal.',
          tags: [],
          ingredients: ['Mixed vegetables', 'Rice', 'Spices'],
          recipe: 'Combine ingredients and cook until done.',
          prepTime: 10,
          cookTime: 20,
        };
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
