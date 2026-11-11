/**
 * Kitchen item helpers shared by the receipt scanner, the website and the app.
 * Keep free of imports so it can be copied into the app (mobile/scripts/sync-shared.mjs).
 */

// Things that turn up on grocery receipts but don't belong in a kitchen pantry.
const NON_FOOD =
  /\b(soap|detergent|shampoo|conditioner|toothpaste|toothbrush|deodorant|lotion|razor|tissues?|toilet paper|paper towels?|napkins?|diapers?|nappies|wipes|bleach|cleaner|dish ?wash|dishwasher|laundry|fabric softener|sponges?|garbage bags?|trash bags?|bin bags?|foil|cling ?film|plastic wrap|batteries|battery|light ?bulbs?|candles?|lighter|matches|cosmetics?|makeup|shaving|sanitary|tampons?|pads|vitamins?|medicine|tylenol|advil|pet food|cat food|dog food|cat litter|bag fee|bottle deposit|deposit|gift card|magazine|flowers?|plants?|charcoal|machines?|makers?|kettles?|blenders?|toasters?|microwaves?|air ?fryers?|mixers?|grinders?|frying pans?|saucepans?|cookware|bakeware|baking trays?|plates?|cutlery|utensils?|knives|knife|spatulas?|ladles?|containers?|tupperware|coffee filters?|thermos|water bottles?|lunch ?box(es)?|t-?shirts?|shirts?|socks|pants|jackets?|shoes|slippers|toys?|notebooks?|pens?|pencils?|stationery|chargers?|cables?|headphones|earbuds|phone cases?|extension cords?|hangers?|towels?|bedding|pillows?|blankets?)\b/i;

/** True for receipt lines that aren't food or drink (soap, bags, batteries…). */
export function isNonFood(name: string): boolean {
  return NON_FOOD.test(name);
}

// Typical fridge/cupboard life once bought, by pantry category (days).
const SHELF_DAYS: Record<string, number> = {
  Seafood: 2,
  Meat: 3,
  Poultry: 2,
  Dairy: 7,
  Eggs: 21,
  Vegetables: 7,
  Fruits: 6,
  Bakery: 4,
  'Frozen Foods': 90,
  Beverages: 30,
  Snacks: 60,
  'Canned Foods': 365,
  'Pasta & Rice': 365,
  Grains: 180,
  Spices: 365,
  'Oils & Condiments': 180,
};

/** A sensible "use by" date for a fresh item, or null for long-lasting staples. */
export function suggestedExpiry(category: string, from = new Date()): string | null {
  const days = SHELF_DAYS[category];
  if (!days || days > 60) return null;
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/*
 * How long fresh food usually keeps once bought, and what to do with it before
 * it goes off. Approximate, from common food-safety guidance (USDA FoodKeeper,
 * NHS, Health Canada), for food stored the usual way. Used to estimate a date
 * when the family doesn't type one, and to suggest how to use or save food
 * that is about to go off.
 */
export type KeepPlace = 'fridge' | 'counter' | 'cupboard';

export interface ShelfLife {
  /** Short English name, e.g. "Tomatoes". */
  food: string;
  days: number;
  place: KeepPlace;
  /** How to store it so it lasts (optional). */
  store?: string;
  /** What to make or do so it isn't wasted. */
  save: string;
}

const FOODS: (ShelfLife & { re: RegExp })[] = [
  { re: /\b(cherry )?tomato(es)?\b/i, food: 'Tomatoes', days: 5, place: 'counter', store: 'Keep on the counter until ripe, then in the fridge.', save: 'Cook into a simple tomato sauce: it keeps 5 days in the fridge or 3 months in the freezer.' },
  { re: /\bcucumbers?\b/i, food: 'Cucumbers', days: 7, place: 'fridge', save: 'Make quick pickles with vinegar, salt and dill: they keep 2 weeks in the fridge.' },
  { re: /\b(lettuce|salad leaves|rocket|arugula|mixed greens|romaine|iceberg)\b/i, food: 'Salad leaves', days: 5, place: 'fridge', store: 'Keep dry, wrapped in a paper towel, in a bag in the fridge.', save: 'Use them in a salad or a wrap today; they don’t freeze well.' },
  { re: /\b(spinach|chard|kale|swiss chard)\b/i, food: 'Leafy greens', days: 5, place: 'fridge', save: 'Wilt in a pan, then freeze in portions for stews and omelettes: keeps 3 months.' },
  { re: /\b(parsley|coriander|cilantro|mint|dill|basil|fresh herbs?)\b/i, food: 'Fresh herbs', days: 7, place: 'fridge', store: 'Stand them in a glass of water in the fridge, like flowers.', save: 'Chop and freeze in olive oil in an ice-cube tray: keeps 3 months.' },
  { re: /\b(spring onions?|green onions?|scallions?|leeks?)\b/i, food: 'Spring onions', days: 7, place: 'fridge', save: 'Slice and freeze to add straight to cooking: keeps 3 months.' },
  { re: /\b(onions?|shallots?)\b/i, food: 'Onions', days: 30, place: 'cupboard', store: 'Keep in a cool, dark, airy place, away from potatoes.', save: 'Cook them slowly into caramelised onions: they keep 5 days in the fridge or 3 months frozen.' },
  { re: /\bgarlic\b/i, food: 'Garlic', days: 60, place: 'cupboard', save: 'Peel the cloves and keep them in the freezer: they keep 6 months.' },
  { re: /\b(sweet potato(es)?|yams?)\b/i, food: 'Sweet potatoes', days: 21, place: 'cupboard', save: 'Roast or boil, mash and freeze in portions: keeps 3 months.' },
  { re: /\bpotato(es)?\b/i, food: 'Potatoes', days: 21, place: 'cupboard', store: 'Keep in a cool, dark place, not the fridge.', save: 'Boil, mash and freeze in portions: keeps 2 months.' },
  { re: /\bcarrots?\b/i, food: 'Carrots', days: 21, place: 'fridge', save: 'Grate or slice and freeze for soups and sauces: keeps 6 months.' },
  { re: /\b(bell )?peppers?\b|\bcapsicums?\b/i, food: 'Peppers', days: 7, place: 'fridge', save: 'Roast, peel and keep in olive oil in the fridge for a week, or freeze for 3 months.' },
  { re: /\b(zucchinis?|courgettes?)\b/i, food: 'Courgettes', days: 5, place: 'fridge', save: 'Grate, squeeze out the water and freeze for fritters and soups: keeps 3 months.' },
  { re: /\b(eggplants?|aubergines?|brinjals?)\b/i, food: 'Aubergines', days: 5, place: 'fridge', save: 'Roast and blend into mutabbal or baba ghanoush: keeps 4 days in the fridge.' },
  { re: /\b(broccoli|cauliflower)\b/i, food: 'Broccoli and cauliflower', days: 5, place: 'fridge', save: 'Cut into florets, boil 2 minutes, cool and freeze: keeps 6 months.' },
  { re: /\bcabbages?\b/i, food: 'Cabbage', days: 14, place: 'fridge', save: 'Make a quick slaw or pickled cabbage: keeps a week in the fridge.' },
  { re: /\bmushrooms?\b/i, food: 'Mushrooms', days: 5, place: 'fridge', store: 'Keep in a paper bag in the fridge, not plastic.', save: 'Sauté them and freeze: they keep 3 months.' },
  { re: /\b(green beans?|okra|bamia|peas in pod|snap peas|mange ?tout)\b/i, food: 'Green beans and okra', days: 5, place: 'fridge', save: 'Boil 2 minutes, cool and freeze: keeps 6 months.' },
  { re: /\b(corn on the cob|sweetcorn cobs?|corn cobs?)\b/i, food: 'Corn on the cob', days: 3, place: 'fridge', save: 'Cut the kernels off and freeze: keeps 6 months.' },
  { re: /\bavocados?\b/i, food: 'Avocados', days: 4, place: 'counter', store: 'Ripen on the counter, then keep in the fridge.', save: 'Mash with lemon juice and freeze: keeps 3 months for dips and toast.' },
  { re: /\bbananas?\b/i, food: 'Bananas', days: 5, place: 'counter', save: 'Peel, slice and freeze for smoothies or banana bread: keeps 3 months.' },
  { re: /\bapples?\b/i, food: 'Apples', days: 30, place: 'fridge', save: 'Cook into apple compote with cinnamon: keeps a week in the fridge.' },
  { re: /\b(lemons?|limes?)\b/i, food: 'Lemons and limes', days: 21, place: 'fridge', save: 'Squeeze the juice into an ice-cube tray and freeze: keeps 4 months.' },
  { re: /\b(oranges?|mandarins?|clementines?|tangerines?|grapefruits?)\b/i, food: 'Oranges', days: 14, place: 'fridge', save: 'Squeeze into fresh juice, or freeze the juice in portions.' },
  { re: /\b(strawberr(y|ies)|raspberr(y|ies)|blueberr(y|ies)|blackberr(y|ies)|berries)\b/i, food: 'Berries', days: 3, place: 'fridge', store: 'Wash only just before eating.', save: 'Freeze on a tray, then in a bag: keeps 6 months for smoothies and porridge.' },
  { re: /\bgrapes?\b/i, food: 'Grapes', days: 7, place: 'fridge', save: 'Freeze them for smoothies: keeps 6 months.' },
  { re: /\b(mangos?|mangoes|peach(es)?|nectarines?|plums?|apricots?|pears?|kiwis?|papayas?|pineapples?)\b/i, food: 'Soft fruit', days: 4, place: 'counter', store: 'Ripen on the counter, then keep in the fridge.', save: 'Cut up and freeze for smoothies, or cook into a compote: keeps 6 months frozen.' },
  { re: /\b(watermelon|melon|cantaloupe|honeydew)\b/i, food: 'Melon', days: 4, place: 'fridge', save: 'Blend into juice and freeze in ice-cube trays.' },
  { re: /\bdates\b/i, food: 'Dates', days: 180, place: 'cupboard', save: 'Blend into date paste for baking and smoothies: keeps a month in the fridge.' },
  { re: /\b(laban|buttermilk|ayran)\b/i, food: 'Laban', days: 7, place: 'fridge', save: 'Use it in a marinade or bake with it.' },
  { re: /\blabneh\b/i, food: 'Labneh', days: 10, place: 'fridge', save: 'Roll into balls and cover with olive oil: keeps several weeks in the fridge.' },
  { re: /\b(yogh?urt|yoghourt|curd)\b/i, food: 'Yogurt', days: 10, place: 'fridge', save: 'Strain it overnight into labneh: keeps 2 weeks in the fridge.' },
  { re: /\b(cream|crème fraîche|creme fraiche)\b/i, food: 'Cream', days: 5, place: 'fridge', save: 'Freeze in small portions for cooking: keeps 3 months.' },
  { re: /(?<!peanut |almond |nut |cashew |cocoa |shea )\bbutter\b/i, food: 'Butter', days: 30, place: 'fridge', save: 'Freeze it: keeps 6 months.' },
  { re: /(?<!coconut |condensed |evaporated |powdered )\bmilk\b/i, food: 'Milk', days: 7, place: 'fridge', save: 'Freeze in portions (shake after thawing) and use for cooking: keeps 3 months.' },
  { re: /\b(feta|halloumi|akkawi|nabulsi|white cheese|paneer|ricotta|mozzarella|cottage cheese)\b/i, food: 'Soft and white cheese', days: 7, place: 'fridge', store: 'Keep feta and white cheese covered in its brine or salted water.', save: 'Bake it into a börek or a cheese pastry, or crumble it into an omelette.' },
  { re: /\b(cheddar|gouda|edam|emmental|parmesan|hard cheese|cheese)\b/i, food: 'Cheese', days: 28, place: 'fridge', save: 'Grate and freeze for cooking: keeps 3 months.' },
  { re: /\beggs?\b/i, food: 'Eggs', days: 21, place: 'fridge', save: 'Beat and freeze in portions for baking and omelettes: keeps 6 months.' },
  { re: /\b(minced|mince|ground (beef|lamb|chicken|turkey)|kofta)\b/i, food: 'Minced meat', days: 2, place: 'fridge', save: 'Cook it into kofta or a meat sauce, or freeze it today: keeps 3 months frozen.' },
  { re: /\b(chicken|turkey|poultry|poussins?)\b/i, food: 'Chicken', days: 2, place: 'fridge', save: 'Cook it today, or freeze it before the date: keeps 6 months frozen.' },
  { re: /\b(beef|lamb|mutton|goat|veal|steaks?|chops?)\b/i, food: 'Meat', days: 3, place: 'fridge', save: 'Cook it, or freeze it before the date: keeps 6 months frozen.' },
  { re: /\b(prawns?|shrimps?|squid|calamari|mussels?)\b/i, food: 'Seafood', days: 2, place: 'fridge', save: 'Cook it today or freeze it the day you buy it: keeps 3 months frozen.' },
  { re: /\b(fish|salmon|cod|tuna steaks?|tilapia|sardines?|mackerel|sea bass|trout|hake|haddock)\b/i, food: 'Fish', days: 2, place: 'fridge', save: 'Cook it today or freeze it the day you buy it: keeps 3 months frozen.' },
  { re: /\b(pita|pitta|khobz|naan|flatbread|tortillas?|wraps?|msemen|lavash)\b/i, food: 'Flatbread', days: 4, place: 'counter', save: 'Freeze it, or bake into crisp pita chips: they keep a week in a tin.' },
  { re: /\b(bread|baguette|loaf|buns?|rolls?|brioche)\b/i, food: 'Bread', days: 4, place: 'counter', save: 'Freeze it sliced and toast from frozen: keeps 3 months. Old bread makes good breadcrumbs or fattoush.' },
  { re: /\b(cooked rice|leftover rice)\b/i, food: 'Cooked rice', days: 3, place: 'fridge', save: 'Freeze in portions within a day: keeps a month. Reheat until steaming hot.' },
  { re: /\b(leftovers?|cooked)\b/i, food: 'Leftovers', days: 3, place: 'fridge', save: 'Freeze in portions for a quick lunch: keeps 2 to 3 months.' },
  { re: /\b(hummus|houmous|baba ghanoush|mutabbal|dips?)\b/i, food: 'Dips', days: 5, place: 'fridge', save: 'Spread it in a wrap or a sandwich, or use it as a sauce for vegetables.' },
  { re: /\btofu\b/i, food: 'Tofu', days: 5, place: 'fridge', save: 'Freeze it: it keeps 3 months and gets a chewier texture.' },
  { re: /\b(fresh juice|orange juice|juice)\b/i, food: 'Juice', days: 5, place: 'fridge', save: 'Freeze in an ice-cube tray for drinks and smoothies.' },
];

/** Fallback by pantry category when the food itself isn't in the list. */
const CATEGORY_SAVE: Record<string, string> = {
  Vegetables: 'Cook it into a soup or a stew and freeze it: keeps 3 months.',
  Fruits: 'Cut it up and freeze it for smoothies, or cook it into a compote.',
  Meat: 'Cook it, or freeze it before the date: keeps 6 months frozen.',
  Poultry: 'Cook it today, or freeze it before the date: keeps 6 months frozen.',
  Seafood: 'Cook it today or freeze it: keeps 3 months frozen.',
  Dairy: 'Use it in cooking or baking today.',
  Bakery: 'Freeze it, or turn it into breadcrumbs.',
  Eggs: 'Beat and freeze in portions for baking: keeps 6 months.',
};

const DAYS_BY_PLACE: Record<string, KeepPlace> = { Vegetables: 'fridge', Fruits: 'fridge', Meat: 'fridge', Poultry: 'fridge', Seafood: 'fridge', Dairy: 'fridge', Eggs: 'fridge', Bakery: 'counter' };

/** How long this food usually keeps, where, and how to save it; null for long-lasting staples. */
const LONG_LASTING = /\b(stock|cubes?|powder(ed)?|sauces?|canned|tinned|cans?|dried|frozen|paste|seasoning|spices?|jerky|uht|long[- ]life|syrup|jam|pickled|flour|oil)\b/i;

export function shelfLife(name: string, category?: string | null): ShelfLife | null {
  // Canned, dried, frozen and other long-lasting forms keep far longer than the fresh food.
  if (LONG_LASTING.test(name)) return null;
  const hit = FOODS.find((f) => f.re.test(name));
  if (hit) {
    const { re: _re, ...rest } = hit;
    return rest;
  }
  const days = category ? SHELF_DAYS[category] : undefined;
  if (!category || !days || days > 60) return null;
  return { food: category, days, place: DAYS_BY_PLACE[category] ?? 'fridge', save: CATEGORY_SAVE[category] ?? 'Use it in today’s cooking.' };
}

/** An estimated use-by date (YYYY-MM-DD) from the day it was added, or null for long-lasting staples. */
export function estimateExpiry(name: string, category?: string | null, from: Date | string = new Date()): string | null {
  const life = shelfLife(name, category);
  if (!life || life.days > 90) return null;
  const d = typeof from === 'string' ? new Date(from) : new Date(from);
  d.setDate(d.getDate() + life.days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The date to go by: the one the family typed, or an estimate from when the food was added. */
export function effectiveExpiry(item: { name: string; category?: string | null; expiration_date?: string | null; created_at?: string | null; tracking?: string | null }): { date: string | null; estimated: boolean } {
  // A date that matches the estimate from the day it was added was filled in by Firdam, not typed.
  if (item.expiration_date) return { date: item.expiration_date, estimated: !!item.created_at && item.expiration_date === estimateExpiry(item.name, item.category, item.created_at) };
  if (!item.created_at) return { date: null, estimated: false };
  const date = estimateExpiry(item.name, item.category, item.created_at);
  return { date, estimated: !!date };
}

/**
 * Whether a recipe ingredient is the same food as a pantry item, for "Recipes
 * with tomatoes": the shelf-life list knows the food's other names and plurals.
 */
export function sameFood(pantryName: string, ingredient: string): boolean {
  const hit = FOODS.find((f) => f.re.test(pantryName));
  if (hit) return hit.re.test(ingredient) && !LONG_LASTING.test(ingredient);
  const stem = pantryName.toLowerCase().trim().replace(/(es|s)$/, '');
  return stem.length > 2 && ingredient.toLowerCase().includes(stem);
}
