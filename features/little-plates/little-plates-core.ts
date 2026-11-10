/**
 * Little Plates: baby and toddler versions of the family's meals. Shared by the
 * website and the phone app (the app gets a copy via mobile/scripts/sync-shared.mjs).
 *
 * The safety changes here are fixed rules, not AI, so they are always the same
 * and always shown. They follow widely shared guidance (WHO, Health Canada, NHS):
 * no honey before 12 months, no added salt for babies, no whole nuts and cut
 * round foods for young children, no high-mercury fish, food cooked through.
 * The "how to make it" steps come from the little-plates function (AI, checked
 * and saved once per recipe and stage). This is general guidance, not medical advice.
 */
import { tr } from '@/lib/i18n';

export type LittleStage = 'baby' | 'little' | 'toddler';

export const LITTLE_STAGES: { id: LittleStage; label: string; ages: string; texture: string }[] = [
  { id: 'baby', label: 'Baby', ages: '6–11 months', texture: 'Smooth or mashed, then soft lumps and soft finger foods' },
  { id: 'little', label: 'Little eater', ages: '1–2 years', texture: 'Chopped family food in small, soft pieces' },
  { id: 'toddler', label: 'Toddler', ages: '2–4 years', texture: 'Family food, cut small, with a few safety changes' },
];

/** Whole months between a birth date (YYYY-MM-DD) and today, or null. */
export function ageInMonths(birth: string | null | undefined, today: Date = new Date()): number | null {
  if (!birth || !/^\d{4}-\d{2}-\d{2}/.test(birth)) return null;
  const [y, m, d] = birth.slice(0, 10).split('-').map(Number);
  let months = (today.getFullYear() - y) * 12 + (today.getMonth() + 1 - m);
  if (today.getDate() < d) months--;
  return months >= 0 ? months : null;
}

/** The stage for a child's age in months; null before 6 months (milk only) or from 4 years. */
export function stageFor(months: number): LittleStage | null {
  if (months < 6) return null;
  if (months < 12) return 'baby';
  if (months < 24) return 'little';
  if (months < 48) return 'toddler';
  return null;
}

export interface LittleOne {
  name: string;
  months: number;
  /** null: under 6 months, still on milk only. */
  stage: LittleStage | null;
}

/** Children under 4 from the family profile. */
export function littleOnesFromFamily(
  members: { first_name: string; relationship: string; birth_date: string | null }[],
  today: Date = new Date(),
): LittleOne[] {
  return members
    .filter((m) => m.relationship === 'Son' || m.relationship === 'Daughter')
    .map((m) => {
      const months = ageInMonths(m.birth_date, today);
      return months === null || months >= 48 ? null : { name: m.first_name, months, stage: stageFor(months) };
    })
    .filter((c): c is LittleOne => c !== null)
    .sort((a, b) => a.months - b.months);
}

/** "9 months", "1 year", "2 years 3 months". */
export function ageLabel(months: number): string {
  if (months < 12) return months === 1 ? tr('1 month') : tr('{0} months', [months]);
  const y = Math.floor(months / 12);
  return y === 1 ? tr('1 year') : tr('{0} years', [y]);
}

export type LittleAction = 'leave out' | 'set aside first' | 'cut' | 'cook through' | 'remove' | 'less' | 'allergen';

export interface LittleChange {
  ingredient: string;
  action: LittleAction;
  /** English text, shown through tr(). */
  text: string;
}

interface Rule {
  re: RegExp;
  not?: RegExp;
  stages: LittleStage[];
  action: LittleAction;
  text: string;
}

const ALL: LittleStage[] = ['baby', 'little', 'toddler'];
const UNDER_2: LittleStage[] = ['baby', 'little'];

/** Fixed safety rules, checked against each ingredient name. */
const RULES: Rule[] = [
  { re: /\bhoney\b/i, stages: ['baby'], action: 'leave out', text: 'No honey before 12 months: it can cause infant botulism.' },
  {
    re: /\b(salt|stock cubes?|bouillon|soy sauce|fish sauce|oyster sauce|coconut aminos|tamari|miso|preserved lemons?|pickles?|pickled|capers|olives?|feta|halloumi|parmesan|akkawi|nabulsi|anchov(y|ies)|ketchup)\b/i,
    not: /\b(unsalted|low[- ]salt|no salt)\b/i,
    stages: ['baby'],
    action: 'set aside first',
    text: 'Take the baby’s portion out before adding salt or salty foods. Babies’ kidneys can’t handle added salt.',
  },
  {
    re: /\b(salt|stock cubes?|bouillon|soy sauce|fish sauce)\b/i,
    not: /\b(unsalted|low[- ]salt|no salt)\b/i,
    stages: ['little'],
    action: 'less',
    text: 'Use less salt, or salt the grown-ups’ plates at the table.',
  },
  {
    re: /\b(chill?i(es)?|chilli flakes|cayenne|harissa|hot sauce|sriracha|jalape(n|ñ)os?|bird'?s eye|scotch bonnet|habanero|berbere|mitmita|sambal|gochujang|hot paprika|peri[- ]peri|green chill?ies?)\b/i,
    stages: UNDER_2,
    action: 'set aside first',
    text: 'Take the little one’s portion out before adding chilli. Gentle spices like cumin, cinnamon and turmeric are fine.',
  },
  {
    re: /\b(sugar|syrup|molasses|jam|chocolate|sweets|candy|condensed milk|nutella)\b/i,
    stages: ['baby'],
    action: 'leave out',
    text: 'No added sugar for babies. Sweeten with mashed banana, dates or fruit if needed.',
  },
  {
    re: /\b(sugar|syrup|chocolate|sweets|candy|condensed milk)\b/i,
    stages: ['little', 'toddler'],
    action: 'less',
    text: 'Keep added sugar small.',
  },
  {
    re: /\b(almonds?|walnuts?|pistachios?|cashews?|hazelnuts?|pecans?|pine nuts?|macadamias?|brazil nuts?|peanuts?|mixed nuts|nuts)\b/i,
    not: /\b(nutmeg|coconut|butternut|nut butter|peanut butter|almond butter|ground almonds?|almond flour|almond milk|tahini)\b/i,
    stages: ALL,
    action: 'leave out',
    text: 'No whole or chopped nuts under 5: a choking risk. Finely ground nuts or smooth nut butter are fine unless there is an allergy.',
  },
  {
    re: /\b(grapes?|cherry tomato(es)?|blueberries|cherries|olives?|lychees?|cocktail tomato(es)?)\b/i,
    stages: ALL,
    action: 'cut',
    text: 'Cut round foods into quarters lengthwise: whole they are a choking risk.',
  },
  {
    re: /\b(sausages?|hot dogs?|frankfurters?|merguez|sucuk|sujuk)\b/i,
    stages: ALL,
    action: 'cut',
    text: 'Cut sausages lengthwise into thin strips, never in coins.',
  },
  {
    re: /\b(popcorn|raw carrots?|carrot sticks|raw apple|apple slices|corn chips|crisps|crackers|rice cakes?|dried fruit|raisins|whole dates)\b/i,
    stages: UNDER_2,
    action: 'cut',
    text: 'Hard or chewy foods: cook soft, grate or chop finely before serving.',
  },
  {
    re: /\b(eggs?)\b/i,
    not: /\beggplants?\b/i,
    stages: UNDER_2,
    action: 'cook through',
    text: 'Cook eggs until the yolk and white are firm.',
  },
  {
    re: /\b(shark|swordfish|marlin|king mackerel|tilefish|bigeye tuna|orange roughy)\b/i,
    stages: ALL,
    action: 'leave out',
    text: 'High-mercury fish is not for young children. Choose salmon, cod, sardines or light tuna.',
  },
  {
    re: /\b(fish|salmon|cod|trout|sardines?|mackerel|tilapia|haddock|hake|sea bass|bream)\b/i,
    not: /\b(fish sauce|fish stock|fish fingers?)\b/i,
    stages: ALL,
    action: 'remove',
    text: 'Check carefully for bones and flake the fish.',
  },
  {
    re: /\b(chicken (thighs?|legs?|drumsticks?|wings?)|whole chicken|poussins?|lamb shanks?|lamb chops?|oxtail|bone-in|on the bone|ribs)\b/i,
    stages: ALL,
    action: 'remove',
    text: 'Take the meat off the bone and shred it finely.',
  },
  {
    re: /\b(cinnamon sticks?|cardamom pods?|bay leaves|bay leaf|whole cloves|cloves|star anise|whole peppercorns|lemongrass|kaffir lime leaves|curry leaves)\b/i,
    not: /\bgarlic\b/i,
    stages: ALL,
    action: 'remove',
    text: 'Remove whole spices and hard leaves before serving.',
  },
  {
    re: /\b(brie|camembert|blue cheese|gorgonzola|roquefort|raw[- ]milk|unpasteuri[sz]ed)\b/i,
    stages: UNDER_2,
    action: 'leave out',
    text: 'Soft mould-ripened, blue or unpasteurised cheese is not for babies and toddlers unless cooked until steaming hot.',
  },
  {
    re: /\b(milk)\b/i,
    not: /\b(coconut milk|almond milk|oat milk|soy milk|condensed milk|evaporated milk|buttermilk)\b/i,
    stages: ['baby'],
    action: 'less',
    text: 'Cow’s milk is fine in cooking, but not as the main drink before 12 months.',
  },
  {
    re: /\b(tea|coffee|cola|energy drinks?)\b/i,
    not: /\b(teaspoons?|tsp)\b/i,
    stages: ALL,
    action: 'leave out',
    text: 'No tea or coffee for young children.',
  },
];

/** Common allergens worth introducing carefully to babies (one new one at a time, in small amounts). */
const ALLERGENS: { re: RegExp; name: string }[] = [
  { re: /\b(eggs?)\b/i, name: 'egg' },
  { re: /\b(peanut butter|peanuts?)\b/i, name: 'peanut' },
  { re: /\b(tahini|sesame)\b/i, name: 'sesame' },
  { re: /\b((?<!coconut |almond |oat |soy |rice )milk|yogh?urt|cheese|labneh|cream|(?<!peanut |nut |almond |cashew |cocoa |shea )butter)\b/i, name: 'dairy' },
  { re: /\b(fish|salmon|cod|tuna|sardines?)\b/i, name: 'fish' },
  { re: /\b(flour|bread|pasta|couscous|bulgur|semolina|wheat)\b/i, name: 'wheat' },
];

/**
 * The fixed changes for one stage: what to leave out, set aside, cut or cook
 * through. One line per rule, naming the ingredients it applies to.
 */
export function littleChanges(ingredients: string[], stage: LittleStage, familyAllergies: string[] = []): LittleChange[] {
  const out: LittleChange[] = [];
  for (const rule of RULES) {
    if (!rule.stages.includes(stage)) continue;
    const hits = ingredients.filter((i) => rule.re.test(i) && !(rule.not && rule.not.test(i)));
    if (hits.length) out.push({ ingredient: [...new Set(hits)].slice(0, 3).join(', '), action: rule.action, text: rule.text });
  }
  if (stage === 'baby') {
    const allergic = familyAllergies.map((a) => a.toLowerCase());
    const found = ALLERGENS.filter((a) => ingredients.some((i) => a.re.test(i)) && !allergic.some((x) => x.includes(a.name)));
    if (found.length) {
      out.push({
        ingredient: found.map((a) => a.name).join(', '),
        action: 'allergen',
        text: 'Contains a common allergen. If it’s new for your baby, offer a small amount first and watch for a reaction.',
      });
    }
  }
  return out;
}

/** How many safety changes a meal needs for the youngest little one (for the meal plan). */
export function changeCount(ingredients: string[], stage: LittleStage): number {
  return littleChanges(ingredients, stage).filter((c) => c.action !== 'allergen').length;
}

/** The youngest child's stage, for a one-line hint. */
export function youngestStage(ones: LittleOne[]): LittleStage | null {
  return ones.find((o) => o.stage)?.stage ?? null;
}

/** Saved "how to make it" guide for one recipe and stage, in each language. */
export interface LittleGuide {
  steps: string[];
  serve: string;
  portion: string;
}
export type LittleGuideSet = Partial<Record<'en' | 'fr' | 'ar', LittleGuide>>;

/** The key a guide is saved under: the library recipe's id, or the meal's name. */
export function guideKey(id: string | null | undefined, name: string): string {
  if (id && /^[0-9a-f-]{36}$/i.test(id)) return id;
  return `name:${name.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)}`;
}
