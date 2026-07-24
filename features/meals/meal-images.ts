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
  { keywords: ['avocado', 'toast'], image: px(29769341) },
  { keywords: ['shakshuka'], image: px(35672958) },
  { keywords: ['shawarma'], image: px(4911807) },
  { keywords: ['falafel'], image: px(5852261) },
  { keywords: ['hummus'], image: px(30312756) },
  { keywords: ['biryani'], image: px(7340936) },
  { keywords: ['salmon'], image: px(18479665) },
  { keywords: ['tagine'], image: px(2287524) },
  { keywords: ['couscous'], image: px(2287528) },
  { keywords: ['branzino'], image: px(14062105) },
  { keywords: ['kofta'], image: px(7340936) },
  { keywords: ['mansaf'], image: px(2287524) },
  { keywords: ['moussaka'], image: px(2287528) },
  { keywords: ['porridge', 'oat'], image: px(13510354) },
  { keywords: ['lentil'], image: px(19150339) },
  { keywords: ['smoothie bowl'], image: px(15312466) },
  { keywords: ['foul', 'fava'], image: px(13510354) },
  { keywords: ['paratha'], image: px(13510354) },
  { keywords: ['quinoa', 'fruit'], image: px(15312466) },
  { keywords: ['salad', 'tofu'], image: px(19150339) },
  { keywords: ['salad', 'quinoa'], image: px(19150339) },
  { keywords: ['vine leaves', 'grape'], image: px(2287524) },
  { keywords: ['mushroom', 'lentil'], image: px(19150339) },
  { keywords: ['fruit', 'nuts'], image: px(15312466) },
  { keywords: ['yogurt', 'honey'], image: px(15312466) },
  { keywords: ['stuffed dates'], image: px(15312466) },
  { keywords: ['rice cake', 'avocado'], image: px(29769341) },
  { keywords: ['fruit smoothie'], image: px(15312466) },
  { keywords: ['beef', 'shawarma'], image: px(4911807) },
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
