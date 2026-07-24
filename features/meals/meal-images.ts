const px = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop`;

export const CATEGORY_IMAGES: Record<string, string> = {
  breakfast: px(13510354),
  lunch:     px(19150339),
  dinner:    px(18479665),
  snack:     px(15312466),
};

// Exact meal-name → image (checked first, case-insensitive)
const MEAL_NAME_IMAGES: Record<string, string> = {
  // Breakfast
  'dates & oat porridge':        px(8819347),
  'lentil & spinach stew':       px(6120503),
  'avocado toast on rye':        px(29769341),
  'chickpea shakshuka':          px(35672958),
  'banana & honey smoothie bowl': px(19802449),
  'foul medames':                px(5191842),
  'vegetable paratha & yogurt':  px(12737660),
  'quinoa fruit bowl':           px(17597421),
  // Lunch
  'grilled chicken shawarma bowl': px(4911807),
  'falafel & hummus wrap':       px(5852261),
  'lamb kofta with rice':        px(31249587),
  'mediterranean salad with tofu': px(34227757),
  'chicken & quinoa salad':      px(34227757),
  'vegetable biryani':           px(7340936),
  'grilled salmon & greens':     px(31235406),
  'stuffed vine leaves':         px(34759479),
  // Dinner
  'moroccan lamb tagine':        px(2287524),
  'chicken tagine with olives':  px(2287524),
  'vegetable couscous':          px(2287528),
  'grilled branzino with herbs': px(30946367),
  'beef shawarma plate':         px(4911807),
  'mushroom & lentil ragout':    px(14774702),
  'chicken mansaf':              px(2287524),
  'roasted vegetable moussaka':  px(19145680),
  // Snack
  'mixed fruit & nuts':          px(29596458),
  'hummus & veggie sticks':      px(30312756),
  'greek yogurt with honey':     px(15312466),
  'stuffed dates with almonds':  px(30868045),
  'rice cakes with avocado':     px(29769341),
  'fresh fruit smoothie':        px(11394991),
};

// Keyword fallback (used only when exact name has no match)
interface ImageRule {
  keywords: string[];
  image: string;
}

const IMAGE_RULES: ImageRule[] = [
  { keywords: ['avocado toast'],    image: px(29769341) },
  { keywords: ['shakshuka'],        image: px(35672958) },
  { keywords: ['shawarma'],         image: px(4911807) },
  { keywords: ['falafel'],          image: px(5852261) },
  { keywords: ['hummus'],           image: px(30312756) },
  { keywords: ['biryani'],          image: px(7340936) },
  { keywords: ['salmon'],           image: px(31235406) },
  { keywords: ['tagine'],           image: px(2287524) },
  { keywords: ['couscous'],         image: px(2287528) },
  { keywords: ['branzino'],         image: px(30946367) },
  { keywords: ['kofta'],            image: px(31249587) },
  { keywords: ['mansaf'],           image: px(2287524) },
  { keywords: ['moussaka'],         image: px(19145680) },
  { keywords: ['porridge'],         image: px(8819347) },
  { keywords: ['lentil', 'spinach'], image: px(6120503) },
  { keywords: ['lentil'],           image: px(6120503) },
  { keywords: ['smoothie bowl'],    image: px(19802449) },
  { keywords: ['foul'],             image: px(5191842) },
  { keywords: ['fava'],             image: px(5191842) },
  { keywords: ['paratha'],          image: px(12737660) },
  { keywords: ['quinoa', 'fruit'],  image: px(17597421) },
  { keywords: ['quinoa', 'salad'],  image: px(34227757) },
  { keywords: ['vine leaves'],      image: px(34759479) },
  { keywords: ['mushroom', 'lentil'], image: px(14774702) },
  { keywords: ['fruit', 'nuts'],    image: px(29596458) },
  { keywords: ['yogurt', 'honey'],  image: px(15312466) },
  { keywords: ['stuffed dates'],    image: px(30868045) },
  { keywords: ['dates'],            image: px(30868045) },
  { keywords: ['fruit smoothie'],   image: px(11394991) },
  { keywords: ['avocado'],          image: px(29769341) },
];

export function getMealImage(name: string, type: string): string {
  const lower = name.toLowerCase().trim();

  // 1. Exact name match
  if (MEAL_NAME_IMAGES[lower]) {
    return MEAL_NAME_IMAGES[lower];
  }

  // 2. Keyword scoring fallback
  let bestScore = 0;
  let bestImage: string | null = null;
  for (const rule of IMAGE_RULES) {
    const score = rule.keywords.filter((kw) => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestImage = rule.image;
    }
  }
  if (bestImage && bestScore > 0) {
    return bestImage;
  }

  // 3. Category fallback
  return CATEGORY_IMAGES[type.toLowerCase()] ?? CATEGORY_IMAGES.dinner;
}

export function getCategoryImage(type: string): string {
  return CATEGORY_IMAGES[type.toLowerCase()] ?? CATEGORY_IMAGES.dinner;
}
