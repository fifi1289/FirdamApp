/**
 * Allergen and diet detection from ingredient names.
 *
 * Used by the Recipes filters and the meal planner so allergies are respected
 * even for recipes that have no allergen tags (e.g. family recipes users add).
 * Keep in sync with supabase/seed/recipe_tags.py, which tags the library.
 */

export interface AllergenRule {
  /** Name shown in the app. */
  name: string;
  /** Other words people use for the same allergy (matched case-insensitively). */
  aliases: string[];
  include: RegExp;
  /** Ingredients that look like a match but aren't (e.g. coconut milk for Dairy). */
  exclude?: RegExp;
}

export const ALLERGEN_RULES: AllergenRule[] = [
  {
    name: 'Gluten',
    aliases: ['gluten', 'wheat', 'coeliac', 'celiac', 'barley', 'rye'],
    include:
      /\b(flour|bread|breadcrumbs?|panko|pitta?s?|naan|chapati|roti|paratha|flatbreads?|lepinja|tortillas?|wraps?|pasta|spaghetti|penne|fusilli|macaroni|lasagne|lasagna|orzo|noodles?|vermicelli|couscous|bulgur|bulgh?ur|freekeh|frik|semolina|barley|wheat|rye|spelt|seitan|filo|phyllo|puff pastry|pastry|brik|warka|pizza dough|dough|soy sauce|kecap manis|teriyaki sauce|oyster sauce|hoisin|crackers?|biscuits?|cake|rusk|kataifi|kunafa|knafeh|malt|jareesh|harees|yufka)\b/,
    exclude:
      /\b(rice flour|glutinous rice flour|gluten-free|chickpea flour|gram flour|besan|corn ?flour|cornmeal|maize|almond flour|coconut flour|tapioca|cassava|teff|potato flour|buckwheat|rice noodles?|rice vermicelli|glass noodles|rice paper|corn tortillas?|tamari|coconut aminos|rice cakes?)\b/,
  },
  {
    name: 'Dairy',
    aliases: ['dairy', 'milk', 'lactose', 'cow milk'],
    include:
      /\b(milk|butter|ghee|cream|yogh?urt|labneh|cheese|paneer|feta|halloumi|mozzarella|parmesan|cheddar|ricotta|mascarpone|akkawi|nabulsi|jameed|kashk|kefir|buttermilk|whey|casein|custard|ice cream|khoa|khoya|condensed|evaporated|tzatziki|creme fraiche|crème fraîche|qishta|ashta)\b/,
    exclude:
      /\b(coconut milk|coconut cream|almond milk|oat milk|soy milk|soya milk|rice milk|peanut butter|almond butter|cashew butter|nut butter|shea butter|cocoa butter|cream of tartar|butter beans?|butterhead|dairy-free|vegan (butter|cheese|yogh?urt)|coconut yogh?urt)\b/,
  },
  {
    name: 'Eggs',
    aliases: ['egg', 'eggs'],
    include: /\b(eggs?|egg yolks?|egg whites?|mayonnaise|mayo|meringue|aioli)\b/,
    exclude: /\b(eggplants?|egg-free|vegan mayo)\b/,
  },
  {
    name: 'Tree nuts',
    aliases: ['tree nuts', 'tree nut', 'nuts', 'nut'],
    include:
      /\b(almonds?|walnuts?|pistachios?|cashews?|hazelnuts?|pecans?|pine nuts?|macadamias?|brazil nuts?|praline|marzipan|frangipane|nut butter|almond (flour|milk|butter|extract)|mixed nuts|nuts)\b/,
    exclude: /\b(nutmeg|coconut|doughnut|butternut|peanuts?|tiger nuts?|water chestnuts?)\b/,
  },
  {
    name: 'Peanuts',
    aliases: ['peanut', 'peanuts', 'groundnut', 'groundnuts'],
    include: /\b(peanuts?|groundnuts?|peanut butter|peanut oil|satay sauce)\b/,
  },
  {
    name: 'Sesame',
    aliases: ['sesame'],
    include: /\b(sesame|tahini|tahina|za'?atar|halva|halwa tahini|dukkah|gomasio)\b/,
  },
  {
    name: 'Fish',
    aliases: ['fish'],
    include:
      /\b(fish|salmon|tuna|cod|haddock|hake|pollock|tilapia|sea ?bass|branzino|bream|snapper|mackerel|sardines?|anchov(y|ies)|herring|trout|halibut|kingfish|grouper|carp|catfish|swordfish|whitebait|fish sauce|worcestershire|bonito|dashi|maldive fish|dried fish)\b/,
    exclude: /\b(fish-free|vegan fish sauce)\b/,
  },
  {
    name: 'Shellfish',
    aliases: ['shellfish', 'crustaceans', 'molluscs', 'mollusks', 'seafood'],
    include:
      /\b(prawns?|shrimps?|crabs?|lobsters?|crayfish|langoustines?|mussels?|clams?|oysters?|scallops?|squid|calamari|octopus|cuttlefish|shrimp paste|belacan|terasi|oyster sauce|dried shrimp)\b/,
  },
  {
    name: 'Soy',
    aliases: ['soy', 'soya', 'soybean', 'soybeans'],
    include: /\b(soy|soya|tofu|tempeh|edamame|miso|kecap manis|tamari|teriyaki sauce|soybeans?|hoisin)\b/,
  },
  {
    name: 'Mustard',
    aliases: ['mustard'],
    include: /\b(mustard)\b/,
  },
  {
    name: 'Celery',
    aliases: ['celery', 'celeriac'],
    include: /\b(celery|celeriac)\b/,
  },
];

const MEAT_RE =
  /\b(chicken|beef|lamb|mutton|goat|veal|turkey|duck|quail|camel|mince|minced meat|meat|sucuk|sujuk|beef chorizo|beef bacon|pastirma|basturma|liver|kidneys?|oxtail|bone broth|gelatin|gelatine|chicken stock|beef stock|lamb stock|stock cube|bouillon)\b/;
const MEAT_EXCLUDE = /\b(vegetable stock|vegetable bouillon|meat-free|plant-based|coconut meat)\b/;
const SEAFOOD_RULES = ALLERGEN_RULES.filter((r) => r.name === 'Fish' || r.name === 'Shellfish');

function normalize(s: string) {
  return s.toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, ' ').trim();
}

function matchesRule(rule: AllergenRule, ingredient: string): boolean {
  const n = normalize(ingredient);
  if (!rule.include.test(n)) return false;
  if (!rule.exclude) return true;
  // Excluded phrase only cancels the match if nothing else in the name matches.
  const stripped = n.replace(new RegExp(rule.exclude.source, 'g'), ' ');
  return rule.include.test(stripped);
}

/** Allergen names (from ALLERGEN_RULES) found in a list of ingredient names. */
export function detectAllergens(ingredients: string[]): Set<string> {
  const found = new Set<string>();
  for (const rule of ALLERGEN_RULES) {
    if (ingredients.some((i) => matchesRule(rule, i))) found.add(rule.name);
  }
  return found;
}

/** Finds the rule for something a user typed or picked, e.g. "Milk" → Dairy, "Nuts" → Tree nuts. */
export function ruleForAllergy(allergy: string): AllergenRule | undefined {
  const a = normalize(allergy);
  return ALLERGEN_RULES.find((r) => normalize(r.name) === a || r.aliases.includes(a));
}

function singular(word: string) {
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('oes')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

/**
 * True when a recipe is unsafe for someone with any of `allergies`.
 * Known allergens use the rules (plus the recipe's own tags); anything else the
 * user typed ("mushroom", "coriander") is matched against ingredient names.
 */
export function conflictsWithAllergies(
  ingredients: string[],
  allergies: string[],
  taggedAllergens: string[] = []
): boolean {
  if (allergies.length === 0) return false;
  const detected = detectAllergens(ingredients);
  const tagged = new Set(taggedAllergens.map((t) => ruleForAllergy(t)?.name ?? normalize(t)));
  const names = ingredients.map(normalize);
  return allergies.some((allergy) => {
    const rule = ruleForAllergy(allergy);
    if (rule) return detected.has(rule.name) || tagged.has(rule.name);
    const word = singular(normalize(allergy));
    if (!word) return false;
    return tagged.has(normalize(allergy)) || names.some((n) => n.split(/[^a-z']+/).map(singular).join(' ').includes(word));
  });
}

export type Diet = 'Vegetarian' | 'Vegan' | 'Pescatarian' | 'Gluten-free' | 'Dairy-free' | 'Low-carb' | 'High-protein' | 'Kid-friendly';

export function hasMeat(ingredients: string[]): boolean {
  return ingredients.some((i) => {
    const n = normalize(i);
    return MEAT_RE.test(n) && !MEAT_EXCLUDE.test(n);
  });
}

export function hasSeafood(ingredients: string[]): boolean {
  return ingredients.some((i) => SEAFOOD_RULES.some((r) => matchesRule(r, i)));
}

/**
 * True when a recipe suits a dietary preference. Nutrition-based diets use the
 * recipe's numbers; "Kid-friendly" relies on the recipe's tag.
 */
export function fitsDiet(
  diet: string,
  recipe: { ingredients: string[]; tags?: string[]; protein?: number | null; carbs?: number | null }
): boolean {
  const tags = new Set((recipe.tags ?? []).map(normalize));
  const allergens = detectAllergens(recipe.ingredients);
  switch (normalize(diet)) {
    case 'vegetarian':
      return !hasMeat(recipe.ingredients) && !hasSeafood(recipe.ingredients);
    case 'vegan':
      return (
        !hasMeat(recipe.ingredients) &&
        !hasSeafood(recipe.ingredients) &&
        !allergens.has('Dairy') &&
        !allergens.has('Eggs') &&
        !recipe.ingredients.some((i) => /\bhoney\b/.test(normalize(i)))
      );
    case 'pescatarian':
      return !hasMeat(recipe.ingredients);
    case 'gluten-free':
      return !allergens.has('Gluten');
    case 'dairy-free':
      return !allergens.has('Dairy');
    case 'low-carb':
      return recipe.carbs != null ? recipe.carbs <= 25 : tags.has('low-carb');
    case 'high-protein':
      return recipe.protein != null ? recipe.protein >= 25 : tags.has('high-protein');
    case 'kid-friendly':
      return tags.has('kid-friendly');
    default:
      // Unknown preference from the database: trust a matching tag if there is one.
      return tags.size === 0 || tags.has(normalize(diet));
  }
}

/** Allergens offered in filters when the database list is empty. */
export const DEFAULT_ALLERGENS = ALLERGEN_RULES.map((r) => r.name);
