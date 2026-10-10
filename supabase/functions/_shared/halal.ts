/**
 * Words that make a recipe not halal. Checked in ingredient names and method
 * text. Shared by the recipe library builder (supabase/seed/build-recipes.mts)
 * and the recipe-complete function.
 */
export const HARAM: { re: RegExp; why: string; ingredientsOnly?: boolean }[] = [
  { re: /\b(pork|bacon|ham|lard|pancetta|prosciutto|pepperoni|guanciale|gammon|crackling)\b/i, why: 'pork' },
  { re: /\b(?<!beef |chicken |halal )(chorizo|salami|sausages?)\b/i, why: 'possibly pork (say beef/chicken/halal)', ingredientsOnly: true },
  { re: /\b(wine|beer|ale|lager|rum|sake|mirin|brandy|cognac|vodka|whisk(e)?y|liqueur|sherry|port|marsala|kirsch|champagne|cider(?! vinegar)|shaoxing|rice wine|cooking wine|bourbon|gin|tequila|amaretto|kahlua)\b/i, why: 'alcohol' },
  { re: /\b(?<!halal |beef |fish |agar )(gelatin|gelatine)\b/i, why: 'gelatin (say halal gelatin)' },
  { re: /\bvanilla extract\b/i, why: 'vanilla extract contains alcohol (use vanilla powder)' },
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
