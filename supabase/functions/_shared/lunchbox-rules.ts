/**
 * Safety rules for school lunchboxes. Every lunchbox Firdam shows, from the
 * library, from leftovers or written by the AI, must pass lunchboxProblem():
 *
 *  - never nuts: no peanuts, tree nuts, nut butters, nut oils or nut spreads
 *    (many schools worldwide are nut-free), whatever the family's allergies;
 *  - halal only;
 *  - none of the children's allergies;
 *  - no choking hazards for children under 4 (whole grapes, popcorn, hard candy…);
 *  - no sweets, candy, soda or energy drinks as part of the lunch.
 *
 * The AI is told these rules, and its answers are checked again here, because
 * a model can still get it wrong.
 */
import { conflictsWithAllergies, detectAllergens } from "./allergens.ts";
import { HALAL_RULES, haramReason } from "./halal.ts";

/** Allergies every lunchbox avoids, on top of each child's own. */
export const ALWAYS_AVOID = ["Peanuts", "Tree nuts"];

const NUT_WORDS =
  /\b(nutella|praline|marzipan|frangipane|gianduja|nougat|baklava|nut (butter|spread|oil|bar|mix)|trail mix|almond|walnut|pecan|cashew|pistachio|hazelnut|macadamia|pine nut|brazil nut|peanut|groundnut|satay)/i;
const NOT_A_NUT = /\b(nut[- ]free|nutmeg|coconut|doughnut|butternut|water chestnut)\b/gi;

const CHOKING_UNDER_4 =
  /\b(whole (grapes?|cherry tomato(es)?|olives?|blueberries)|popcorn|hard cand(y|ies)|lollipops?|marshmallows?|gum|chewing gum|hot dogs?|sausage coins|whole nuts|seeds? mix|raw carrot coins|chunks? of raw apple)\b/i;
const SWEETS = /\b(cand(y|ies)|chocolate bar|lollipops?|soda|soft drink|energy drink|gummies|gummy bears?|marshmallows?|cookies? with chocolate)\b/i;

export interface LunchboxLike {
  name: string;
  items: string[];
  fun_tip?: string;
}

/** Why a lunchbox can't be shown to these children, or null when it's safe. */
export function lunchboxProblem(box: LunchboxLike, allergies: string[], youngestAge: number | null): string | null {
  const text = [box.name, ...box.items, box.fun_tip ?? ""].join(" \n ");
  const withoutSafeWords = text.replace(NOT_A_NUT, " ");
  if (NUT_WORDS.test(withoutSafeWords)) return "contains nuts";
  const found = detectAllergens(box.items);
  if (found.has("Peanuts") || found.has("Tree nuts")) return "contains nuts";
  const halal = haramReason(box.items, [box.fun_tip ?? ""]);
  if (halal) return `not halal (${halal})`;
  if (allergies.length && conflictsWithAllergies(box.items, allergies)) return "contains an allergy";
  if (youngestAge !== null && youngestAge < 4 && CHOKING_UNDER_4.test(text)) return "choking risk for under-4s";
  if (SWEETS.test(text)) return "sweets";
  return null;
}

/** Instructions for the AI. The same rules are checked again after it answers. */
export function lunchboxRules(allergies: string[], youngestAge: number | null): string {
  return [
    "You plan school lunchboxes for Muslim children. These rules can never be broken:",
    "1. NO NUTS, EVER: no peanuts, no tree nuts (almonds, walnuts, cashews, pistachios, hazelnuts, pecans, pine nuts…), no nut butters, nut oils, Nutella, praline, marzipan, baklava, nut bars or trail mix. Schools are nut-free.",
    `2. ${HALAL_RULES}`,
    allergies.length
      ? `3. The children are allergic to: ${allergies.join(", ")}. Never include these or anything that contains them.`
      : "3. Respect the children's allergies (none given besides nuts).",
    "4. Everything is eaten cold or at room temperature: no microwave. Perishable food is packed with an ice pack.",
    youngestAge !== null && youngestAge < 4
      ? "5. A child is under 4: cut grapes, cherry tomatoes, olives and blueberries in halves or quarters, use soft or thin pieces, and never include popcorn, whole grapes, hard candy, marshmallows or hot dogs."
      : "5. Cut food into easy, bite-size pieces for children.",
    "6. Healthy and simple: a main, a vegetable, a fruit and a small extra. No candy, chocolate bars, soda or sweet drinks. Ready in about 10 minutes, with ingredients from a normal grocery store.",
    "7. Make it fun for kids: a playful name, and a 'fun tip' (a face, a shape, a story) that makes children want to eat the vegetables.",
  ].join("\n");
}
