/**
 * Nutrition worked out from ingredient weights with standard food values
 * (per 100 g, USDA FoodData Central), so a recipe's numbers never depend on
 * the AI's arithmetic. Covers meat, fish, eggs, dairy, grains, legumes, nuts and
 * produce; anything unknown counts as a vegetable, spices and herbs as nearly nothing.
 */
type Per100 = [protein: number, carbs: number, kcal: number];
const COOKED = /\b(cooked|canned|tinned|drained|boiled)\b/;
const FOODS: [RegExp, Per100, Per100?][] = [
  // [match, dry/raw per 100 g, cooked per 100 g]
  // Meat, fish and eggs (raw / cooked).
  [/\b(chicken|turkey) (breasts?|fillets?|tenders?)\b/, [23, 0, 120], [31, 0, 165]],
  [/\b(chickens?|poussins?|turkey|ducks?|quails?)\b(?! (stock|broth))/, [19, 0, 170], [27, 0, 215]],
  [/\b(minced|ground) (beef|lamb|meat|veal)\b|\bmince\b|\bkeema\b/, [17, 0, 254], [25, 0, 270]],
  [/\b(beef|veal|steak|brisket|camel)\b(?! (stock|broth))/, [20, 0, 200], [27, 0, 260]],
  [/\b(lamb|mutton|goat)\b(?! (stock|broth))/, [17, 0, 280], [25, 0, 290]],
  [/\bliver\b/, [20, 4, 135]],
  [/\b(sausages?|merguez|sujuk|sucuk|pastirma|basturma)\b/, [15, 3, 300]],
  [/\b(stock|broth|bouillon)\b/, [0.5, 1, 8]],
  [/\b(salmon|mackerel|sardines?|trout|herring)\b/, [20, 0, 200]],
  [/\btuna\b/, [25, 0, 120]],
  [/\b(fish|cod|haddock|hake|tilapia|sea ?bass|bream|snapper|grouper|halibut|kingfish|swordfish|carp|catfish|sole)\b/, [19, 0, 95]],
  [/\b(prawns?|shrimps?|crabs?|lobsters?|squid|calamari|octopus|mussels?|clams?|scallops?)\b/, [18, 1, 90]],
  [/\beggs?\b/, [13, 1, 143]],
  [/\b(red|yellow|split) lentils?\b|\bmasoor\b|\btoor dal\b|\bmoong dal\b|\bdal\b/, [24, 60, 358], [9, 20, 116]],
  [/\blentils?\b/, [25, 60, 352], [9, 20, 116]],
  [/\bchickpeas?\b|\bgarbanzo/, [19, 61, 364], [7, 23, 139]],
  [/\b(fava|broad) beans?\b|\bfoul\b|\bful\b/, [26, 58, 341], [7.6, 20, 110]],
  [/\bmung beans?\b/, [24, 63, 347], [7, 19, 105]],
  [/\b(black[- ]eyed|pigeon|cow|crowder|field) peas?\b|\bcowpeas?\b|\bgandules\b|\btoor\b/, [22, 62, 336], [7.7, 21, 116]],
  [/\b(split|dried|yellow split|green split) peas?\b|\bfava split peas\b/, [24, 60, 341], [8, 21, 118]],
  [/\bpeas?\b(?! protein)/, [5, 14, 81], [5, 14, 81]],
  [/\bbeans?\b|\bcowpeas?\b|\blegumes?\b/, [21, 62, 341], [7.5, 23, 130]],
  [/\bquinoa\b/, [14, 64, 368], [4.4, 21, 120]],
  [/\b(basmati|jasmine|brown|white|wild|sticky|glutinous)? ?rice\b(?! (paper|noodles?|vermicelli|flour))/, [7, 79, 360], [2.7, 28, 130]],
  [/\brice (noodles?|vermicelli|paper)\b|\bglass noodles\b/, [6, 80, 364], [1.8, 25, 109]],
  [/\b(rice|corn|maize|chickpea|gram|besan|buckwheat|millet|teff|sorghum|cassava|tapioca|potato) (flour|meal|starch)\b|\bcornmeal\b|\bpolenta\b|\bmasa\b/, [7, 76, 360]],
  [/\b(flour|baking mix|flour blend|all-purpose|starch)\b/, [8, 77, 360]],
  [/\b(bulgh?ur|burghul|freekeh|semolina|couscous)\b/, [12, 75, 360], [3.8, 22, 112]],
  [/\b(pasta|spaghetti|macaroni|penne|noodles?|vermicelli|orzo|fusilli|linguine|tagliatelle|lasagne|lasagna)\b/, [13, 75, 371], [5.8, 31, 158]],
  [/\b(bread|pitta?|naan|baguettes?|flatbreads?|tortillas?|roti|chapati|msemen|khobz|lavash|buns?|rolls?)\b/, [9, 50, 270]],
  [/\b(phyllo|filo|yufka|puff pastry|pastry|warka|brik)\b/, [7, 45, 330]],
  [/\boats?\b|\boatmeal\b/, [13, 67, 389], [2.5, 12, 71]],
  [/\bbuckwheat\b|\bkasha\b/, [13, 72, 343], [3.4, 20, 92]],
  [/\bmillet\b|\bsorghum\b|\bteff\b|\bfonio\b|\bamaranth\b/, [11, 73, 370], [3.5, 23, 119]],
  [/\bcorn tortillas?\b/, [5.7, 45, 218]],
  [/\bcorn\b|\bmaize\b|\bsweetcorn\b/, [3.3, 19, 86]],
  [/\bsweet potato(es)?\b|\byams?\b/, [1.6, 20, 86]],
  [/\bpotato(es)?\b/, [2, 17, 77]],
  [/\bplantains?\b/, [1.3, 32, 122]],
  [/\b(cassava|yuca|manioc)\b/, [1.4, 38, 160]],
  [/\bpumpkin seeds?\b|\bpepitas\b/, [30, 11, 559]],
  [/\bhemp (seeds?|hearts?)\b/, [32, 9, 553]],
  [/\bsunflower seeds?\b/, [21, 20, 584]],
  [/\bchia\b/, [17, 42, 486]],
  [/\bflax ?seeds?\b|\blinseeds?\b/, [18, 29, 534]],
  [/\bnutritional yeast\b/, [50, 36, 325]],
  [/\bcoconut (milk|cream)\b/, [2.3, 6, 230]],
  [/\b(desiccated|shredded|grated) coconut\b|\bcoconut flakes\b/, [6.9, 24, 660]],
  [/\bcoconut\b(?! (milk|cream|oil|yogh?urt|aminos|water|sugar))/, [3.3, 15, 354]],
  [/\bpeanut butter\b/, [25, 20, 590]],
  [/\b(tahini|tahina|sesame)\b/, [17, 21, 595]],
  [/\b(almonds?|walnuts?|pistachios?|cashews?|hazelnuts?|pecans?|pine nuts?|peanuts?|nuts)\b/, [20, 20, 600]],
  [/\b(yogh?urt|laban|kefir|buttermilk|ayran)\b/, [3.5, 4.7, 61]],
  [/\b(labneh|cream cheese)\b/, [6, 4, 190]],
  [/\b(feta|halloumi|akkawi|nabulsi|white cheese)\b/, [17, 2, 290]],
  [/\bpaneer\b/, [18, 4, 300]],
  [/\b(mozzarella|cheddar|parmesan|kashkaval|gouda|cheese)\b/, [24, 2, 380]],
  [/\b(cream|qishta|ashta)\b/, [2.5, 3.5, 300]],
  [/\bmilk\b/, [3.4, 5, 61]],
  [/\b(butter|ghee|samneh)\b/, [0.5, 0, 740]],
  [/\bhoney\b/, [0.3, 82, 304]],
  [/\b(raisins?|sultanas?|dried (apricots?|figs?|fruit))\b/, [3, 70, 290]],
  [/\bolives?\b(?! oil)/, [1, 6, 115]],
  [/\bavocados?\b/, [2, 9, 160]],
  [/\b(oil|ghee)\b/, [0, 0, 884]],
  [/\b(sugar|jaggery|dates? syrup|maple syrup|agave)\b/, [0, 95, 380]],
  [/\bdates?\b/, [2.5, 75, 282]],
  [/\bbananas?\b/, [1.1, 23, 89]],
  [/\bspinach\b|\bkale\b|\bchard\b|\bsilverbeet\b|\bgreens\b|\bmolokhia\b|\bmulukhiyah\b/, [2.9, 4, 25]],
  [/\b(apple|pear|mango|orange|berr(y|ies)|grapes?|melon|pineapple|papaya|peach|apricot|plum|fig|pomegranate|kiwi|fruit)s?\b/, [0.8, 14, 60]],
  [/\bwater\b|\bsalt\b|(?<!bell |green |red |yellow |sweet )\bpepper\b(?!s)|\b(cumin|coriander|turmeric|paprika|cinnamon|cardamom|clove|nutmeg|ginger|garlic powder|chil+i|cayenne|saffron|sumac|thyme|oregano|basil|parsley|cilantro|mint|dill|bay|herbs?|spices?|baking (soda|powder)|yeast|lemon juice|lime juice|vanilla)\b/, [0, 0, 0]],
];
const VEG: Per100 = [1.5, 7, 35];

export function foodValues(name: string): Per100 {
  const n = name.toLowerCase();
  for (const [re, raw, cooked] of FOODS) if (re.test(n)) return cooked && COOKED.test(n) ? cooked : raw;
  return VEG;
}

/** Per-serving protein, carbs (g) and calories from ingredient weights in grams. */
export function computeNutrition(ingredients: { name: string; grams: number }[], servings: number) {
  let p = 0, c = 0, k = 0;
  for (const i of ingredients) {
    let g = Number.isFinite(i.grams) && i.grams > 0 ? Math.min(i.grams, 3000) : 0;
    // Deep-frying oil mostly stays in the pan: count at most 15 g eaten per serving.
    if (/\boil\b/i.test(i.name)) g = Math.min(g, 15 * Math.max(1, servings));
    const [pp, cc, kk] = foodValues(i.name);
    p += (pp * g) / 100; c += (cc * g) / 100; k += (kk * g) / 100;
  }
  const s = Math.max(1, servings);
  return { protein: Math.round(p / s), carbs: Math.round(c / s), calories: Math.round(k / s) };
}
