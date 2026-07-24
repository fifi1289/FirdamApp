const px = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop`;

export const CATEGORY_IMAGES: Record<string, string> = {
  breakfast: px(13510354),
  lunch: px(19150339),
  dinner: px(18479665),
  snack: px(15312466),
};

interface ImageRule {
  keywords: string[];
  image: string;
}

const IMAGE_RULES: ImageRule[] = [
  { keywords: ['avocado toast'], image: px(29769341) },
  { keywords: ['shakshuka'], image: px(35672958) },
  { keywords: ['shawarma'], image: px(4911807) },
  { keywords: ['falafel'], image: px(5852261) },
  { keywords: ['hummus'], image: px(30312756) },
  { keywords: ['biryani'], image: px(7340936) },
  { keywords: ['salmon'], image: px(31235406) },
  { keywords: ['tagine'], image: px(2287524) },
  { keywords: ['couscous'], image: px(2287528) },
  { keywords: ['branzino'], image: px(30946367) },
  { keywords: ['kofta'], image: px(31249587) },
  { keywords: ['mansaf'], image: px(2287524) },
  { keywords: ['moussaka'], image: px(19145680) },
  { keywords: ['porridge', 'oat'], image: px(8819347) },
  { keywords: ['lentil', 'spinach'], image: px(6120503) },
  { keywords: ['lentil'], image: px(6120503) },
  { keywords: ['smoothie bowl'], image: px(19802449) },
  { keywords: ['foul', 'medames'], image: px(5191842) },
  { keywords: ['fava'], image: px(5191842) },
  { keywords: ['paratha'], image: px(12737660) },
  { keywords: ['quinoa', 'fruit'], image: px(17597421) },
  { keywords: ['quinoa', 'salad'], image: px(34227757) },
  { keywords: ['salad', 'tofu'], image: px(34227757) },
  { keywords: ['vine leaves'], image: px(34759479) },
  { keywords: ['dolma'], image: px(34759479) },
  { keywords: ['mushroom', 'lentil'], image: px(14774702) },
  { keywords: ['fruit', 'nuts'], image: px(29596458) },
  { keywords: ['yogurt', 'honey'], image: px(15312466) },
  { keywords: ['stuffed dates'], image: px(30868045) },
  { keywords: ['dates'], image: px(30868045) },
  { keywords: ['rice cake', 'avocado'], image: px(29769341) },
  { keywords: ['fruit smoothie'], image: px(11394991) },
  { keywords: ['avocado'], image: px(29769341) },
];

export function getMealImage(name: string, type: string): string {
  const lower = name.toLowerCase();
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
  return CATEGORY_IMAGES[type] ?? CATEGORY_IMAGES.dinner;
}

export function getCategoryImage(type: string): string {
  return CATEGORY_IMAGES[type] ?? CATEGORY_IMAGES.dinner;
}
