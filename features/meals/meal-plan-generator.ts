import type { MealPreferencesState } from '@/features/meals/meals-config';

export interface MockMeal {
  id: string;
  name: string;
  type: string;
  description: string;
  image: string;
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
}

const BREAKFAST_TEMPLATES: MealTemplate[] = [
  { name: 'Dates & Oat Porridge', description: 'Creamy oats with Medjool dates, honey, and cinnamon.', tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Gluten-Free', 'Nut-Free', 'Seafood-Free'] },
  { name: 'Lentil & Spinach Stew', description: 'Hearty red lentils with spinach, cumin, and lemon.', tags: ['Vegan', 'Vegetarian', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'] },
  { name: 'Avocado Toast on Rye', description: 'Smashed avocado with za\'atar and cherry tomatoes on rye bread.', tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'] },
  { name: 'Chickpea Shakshuka', description: 'Spiced tomato sauce with chickpeas and crusty bread.', tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'] },
  { name: 'Banana & Honey Smoothie Bowl', description: 'Blended banana, oat milk, and honey topped with seeds.', tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'] },
  { name: 'Foul Medames', description: 'Egyptian fava beans with olive oil, garlic, and lemon.', tags: ['Vegan', 'Vegetarian', 'Dairy-Free', 'Gluten-Free', 'Nut-Free', 'Seafood-Free'] },
  { name: 'Vegetable Paratha & Yogurt', description: 'Flaky stuffed flatbread with cooling yogurt dip.', tags: ['Vegetarian', 'Nut-Free', 'Seafood-Free'] },
  { name: 'Quinoa Fruit Bowl', description: 'Warm quinoa with seasonal fruit, nuts, and maple syrup.', tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Gluten-Free', 'Seafood-Free'] },
];

const LUNCH_TEMPLATES: MealTemplate[] = [
  { name: 'Grilled Chicken Shawarma Bowl', description: 'Marinated chicken over rice with garlic sauce and pickles.', tags: ['Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'] },
  { name: 'Falafel & Hummus Wrap', description: 'Crispy falafel with hummus, lettuce, and tahini in flatbread.', tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'] },
  { name: 'Lamb Kofta with Rice', description: 'Spiced lamb meatballs with saffron rice and grilled vegetables.', tags: ['Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'] },
  { name: 'Mediterranean Salad with Tofu', description: 'Mixed greens, olives, and tofu with a lemon-herb dressing.', tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Gluten-Free', 'Seafood-Free'] },
  { name: 'Chicken & Quinoa Salad', description: 'Grilled chicken with quinoa, cucumber, and mint vinaigrette.', tags: ['Dairy-Free', 'Gluten-Free', 'Nut-Free', 'Seafood-Free'] },
  { name: 'Vegetable Biryani', description: 'Fragrant basmati rice with spiced vegetables and raita.', tags: ['Vegetarian', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'] },
  { name: 'Grilled Salmon & Greens', description: 'Atlantic salmon with sautéed greens and lemon butter.', tags: ['Gluten-Free', 'Dairy-Free', 'Nut-Free'] },
  { name: 'Stuffed Vine Leaves', description: 'Rice-stuffed grape leaves with a tangy yogurt dip.', tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'] },
];

const DINNER_TEMPLATES: MealTemplate[] = [
  { name: 'Moroccan Lamb Tagine', description: 'Slow-braised lamb with apricots, almonds, and ras el hanout.', tags: ['Dairy-Free', 'Gluten-Free', 'Seafood-Free'] },
  { name: 'Chicken Tagine with Olives', description: 'Tender chicken with preserved lemons and green olives.', tags: ['Dairy-Free', 'Gluten-Free', 'Nut-Free', 'Seafood-Free'] },
  { name: 'Vegetable Couscous', description: 'Steamed couscous with root vegetables and chickpea stew.', tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'] },
  { name: 'Grilled Branzino with Herbs', description: 'Whole grilled fish with fresh herbs and lemon.', tags: ['Dairy-Free', 'Gluten-Free', 'Nut-Free'] },
  { name: 'Beef Shawarma Plate', description: 'Spiced beef with saffron rice, garlic sauce, and salad.', tags: ['Dairy-Free', 'Gluten-Free', 'Nut-Free', 'Seafood-Free'] },
  { name: 'Mushroom & Lentil Ragout', description: 'Rich mushroom and lentil stew over creamy polenta.', tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'] },
  { name: 'Chicken Mansaf', description: 'Tender chicken in jameed sauce over rice with toasted almonds.', tags: ['Seafood-Free'] },
  { name: 'Roasted Vegetable Moussaka', description: 'Layered eggplant, tomatoes, and chickpeas with herb crust.', tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'] },
];

const SNACK_TEMPLATES: MealTemplate[] = [
  { name: 'Mixed Fruit & Nuts', description: 'Seasonal fruit with a handful of mixed nuts.', tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Gluten-Free', 'Seafood-Free'] },
  { name: 'Hummus & Veggie Sticks', description: 'Creamy hummus with cucumber, carrot, and bell pepper sticks.', tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'] },
  { name: 'Greek Yogurt with Honey', description: 'Thick yogurt drizzled with honey and a sprinkle of cinnamon.', tags: ['Vegetarian', 'Nut-Free', 'Seafood-Free', 'Gluten-Free'] },
  { name: 'Stuffed Dates with Almonds', description: 'Medjool dates filled with whole almonds.', tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Gluten-Free', 'Seafood-Free'] },
  { name: 'Rice Cakes with Avocado', description: 'Crispy rice cakes topped with avocado and chili flakes.', tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Nut-Free', 'Seafood-Free'] },
  { name: 'Fresh Fruit Smoothie', description: 'Blended seasonal fruit with oat milk.', tags: ['Vegetarian', 'Vegan', 'Dairy-Free', 'Gluten-Free', 'Nut-Free', 'Seafood-Free'] },
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
  Sesame: ['sesame', 'tahini', 'za\'atar'],
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
        };
        return {
          id: `${i}-${type}-${idx}`,
          name: template.name,
          type,
          description: template.description,
          image: MEAL_IMAGES[type] ?? MEAL_IMAGES.dinner,
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
