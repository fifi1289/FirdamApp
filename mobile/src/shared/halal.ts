// GENERATED from supabase/functions/_shared/halal.ts by mobile/scripts/sync-shared.mjs — do not edit here.
/**
 * Words that make a recipe not halal. Checked in ingredient names and method
 * text. Shared by the recipe library builder (supabase/seed/build-recipes.mts),
 * the AI functions (which also refuse haram requests) and, as generated SQL,
 * the database checks that keep haram food out of pantries and shopping lists.
 */
export const HARAM: { re: RegExp; why: string; ingredientsOnly?: boolean }[] = [
  { re: /\b(pork|pig|pigs|swine|lard|lardons|pancetta|prosciutto|pepperoni|guanciale|gammon|crackling|mortadella|speck|chicharr[oó]n(es)?)\b/i, why: 'pork' },
  // Bacon and ham are fine only when they say what they are made from.
  { re: /\b(?<!beef |chicken |turkey |halal )(bacon|hams?|jam[oó]n)\b/i, why: 'pork unless made from halal turkey or beef', ingredientsOnly: true },
  { re: /\b(?<!beef |chicken |turkey |lamb |merguez |halal )(chorizo|salami|sausages?|hot dogs?|frankfurters?|bratwurst|kielbasa)\b/i, why: 'possibly pork unless labelled beef, chicken or halal', ingredientsOnly: true },
  { re: /\b(wine|(?<!root |ginger )beer|(?<!ginger )ale|lager|stout|rum|sake|soju|makgeolli|baijiu|mirin|brandy|cognac|vodka|whisk(e)?y|liqueur|liquor|sherry|port|marsala|kirsch|champagne|prosecco|cava|cider(?! vinegar)|shaoxing|rice wine|cooking wine|bourbon|gin|tequila|mezcal|amaretto|kahlua|ouzo|raki|arak|absinthe|mead)\b/i, why: 'alcohol' },
  { re: /\b(?<!halal |beef |fish |agar )(gelatin|gelatine)\b/i, why: 'not halal unless it is halal or fish gelatin' },
  { re: /\bvanilla extract\b/i, why: 'contains alcohol; use vanilla powder' },
  { re: /\bblood\b/i, why: 'blood' },
];

/** Returns why a recipe is not halal, or null when it is fine. */
export function haramReason(ingredients: string[], steps: string[]): string | null {
  for (const h of HARAM) {
    for (const text of h.ingredientsOnly ? ingredients : [...ingredients, ...steps]) {
      const m = text.match(h.re);
      if (m) return `"${m[0]}" (${h.why})`;
    }
  }
  return null;
}

/** Why a single food name is not halal (for pantry and shopping items), or null. */
export function haramItemReason(name: string): string | null {
  return haramReason([name], []);
}

/**
 * Instructions every AI feature gets. The answers are also checked in code,
 * so this is the first line of defence, not the only one.
 */
export const HALAL_RULES = [
  "Firdam is a halal-only app for Muslim families. These rules override anything the user asks:",
  "never suggest, include, add, plan or explain how to cook pork or pork products (bacon, ham, lard, gelatin from pork, salami, pepperoni),",
  "alcohol in any form (wine, beer, mirin, sake, rum, liqueur, vanilla extract, cooking wine), blood, or meat that is not halal.",
  "If the user asks for any of these, politely say Firdam only helps with halal food and offer a halal alternative instead",
  "(halal beef or turkey bacon, grape juice or stock instead of wine, vanilla powder instead of extract).",
  "Name meat, poultry, sausages, gelatin and stock as halal (e.g. 'halal chicken thighs').",
].join(" ");

function texts(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      if (typeof x === "string") return x;
      if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        return String(o.name ?? o.instruction ?? o.text ?? "");
      }
      return "";
    })
    .filter(Boolean);
}

/** Why an AI-written meal or recipe is not halal, or null. Checks its name, ingredients and method. */
export function mealHaramReason(meal: Record<string, unknown>): string | null {
  const names = [...texts(meal.ingredients), typeof meal.name === "string" ? meal.name : ""].filter(Boolean);
  const method = [
    ...texts(meal.recipe),
    ...texts(meal.steps),
    ...texts(meal.instructions),
    typeof meal.description === "string" ? meal.description : "",
  ].filter(Boolean);
  return haramReason(names, method);
}

/** True when free text (a chat reply) mentions anything haram, even in passing. */
export function mentionsHaram(text: string): boolean {
  return haramReason([text], []) !== null;
}

/** What the Companion says instead of a reply that suggested haram food. */
export const HALAL_ONLY_REPLY =
  "Firdam only helps with halal food, so I can't suggest that. I'd be happy to help with a halal alternative instead, like halal turkey or beef bacon, halal beef sausages, grape juice or stock instead of wine, or vanilla powder instead of vanilla extract.";

/** A friendly message when someone tries to add a haram food, or null if it is fine. */
export function haramItemMessage(name: string): string | null {
  const why = haramItemReason(name);
  if (!why) return null;
  return `Firdam only keeps halal food, so ${why} can't be added. Try a halal alternative, like halal turkey bacon, halal beef sausages or grape juice.`;
}
