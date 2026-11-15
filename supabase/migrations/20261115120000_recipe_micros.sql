-- Estimate sugar (g), sodium (mg) and cholesterol (mg) per serving from ingredient amounts,
-- for recipes that have no values yet. A nutrient stays NULL (unknown) when an ingredient
-- that clearly carries it (salt, eggs, sugar, meat, cheese...) has no amount we can weigh,
-- e.g. "salt to taste": then the recipe is not offered under that diet.

alter table public.recipes add column if not exists micros_source text;

create or replace function public.ingredient_grams(n text, q numeric, u text)
returns numeric language sql immutable as $$
  select case
    when q is null or q <= 0 then null
    when u ~ '^(g|grams?|gr)\M' then q
    when u ~ '^(kg|kilos?|kilograms?)\M' then q * 1000
    when u ~ '^(ml|millilit)' then q
    when u ~ '^(l|liters?|litres?)\M' then q * 1000
    when u ~ '^(lb|lbs|pounds?)\M' then q * 454
    when u ~ '^(oz|ounces?)\M' then q * 28.35
    when u ~ '^(tsp|teaspoons?)\M' then q * case when n ~ '\msalt\M' then 6 when n ~ 'sugar' then 4 else 5 end
    when u ~ '^(tbsp|tablespoons?)\M' then q * case when n ~ '\msalt\M' then 18 when n ~ 'honey|syrup|molasses' then 21 when n ~ 'sugar' then 12.5 else 15 end
    when u ~ '^cups?\M' then q * case
      when n ~ 'flour' then 125 when n ~ 'sugar' then 200
      when n ~ 'cheese' then 110 when n ~ '\moats?\M' then 90
      when n ~ 'spinach|greens|lettuce|herb|parsley|cilantro|coriander|mint|kale|dill' then 30
      when n ~ 'nuts?\M|almond|walnut|pistachio|cashew|hazelnut' then 140
      when n ~ 'dates?\M|raisin|sultana' then 150
      when n ~ 'rice|lentil|bulg|couscous|quinoa|beans?\M|chickpea|peas\M' then 185
      else 240 end
    when u ~ '^pinch' then q * 0.4
    when u ~ '^cans?\M' then q * coalesce(substring(u from '(\d+)\s*oz')::numeric * 28.35, 400)
    when u ~ '^cloves?\M' then q * 5
    when u = '' or u ~ '^(pieces?|pcs|whole|medium|large|small|slices?)\M' then q * case
      when n ~ 'egg yolk' then 17 when n ~ 'egg white' then 33
      when n ~ '\meggs?\M' then case when u ~ '^large' then 55 else 50 end
      when n ~ 'banana' then 120 when n ~ 'plantain' then 180 when n ~ 'quince' then 200 when n ~ 'apple|pear|orange|peach' then 170 when n ~ 'mango' then 200
      when n ~ '\mdates?\M' then 8 when n ~ 'lemon|lime' then 60
      when n ~ 'stock cube|bouillon' then 10
      when n ~ 'pitta?|tortilla|flatbread|naan|bread|\mrolls?\M|\mbuns?\M|khobz|lavash|chapati|roti' then 60
      when n ~ 'chicken breast|fillet' then 170 when n ~ 'thigh|drumstick' then 110
      when n ~ 'onion|tomato|potato|carrot|pepper|zucchini|courgette|cucumber|eggplant|aubergine' then
        case when u ~ '^large' then 200 when u ~ '^small' then 80 else 130 end
      when n ~ 'garlic' then 5 when n ~ 'biscotti|biscuits?|cookies?' then 15 when n ~ 'ciabatta|muffins?|bagels?|croissants?' then 70
      else null end
    else null end
$$;

-- per 100 g: sugar g, sodium mg, cholesterol mg, and whether this food clearly carries them (strict)
create or replace function public.ingredient_micros(n text, out sugar numeric, out sodium numeric, out chol numeric, out strict boolean)
language sql immutable as $$
  select v[1], v[2], v[3], v[4] = 1 from (select case
    when n ~ '\mwater\M' and n !~ 'melon|chestnut' then array[0,0,0,1]
    when n ~ 'stock cube|bouillon cube|bouillon powder|stock powder|bouillon' then array[0,24000,0,1]
    when n ~ 'salt ?cod|bacalao|bacalhau|salted fish' then array[0,1500,60,1]
    when n ~ '\msalt\M' and n !~ 'unsalted' then array[0,38758,0,1]
    when n ~ 'baking soda|bicarbonate' then array[0,27360,0,1]
    when n ~ 'baking powder' then array[0,10600,0,1]
    when n ~ 'soy sauce|tamari' then array[0.4,5500,0,1]
    when n ~ 'fish sauce' then array[0,7850,0,1]
    when n ~ 'ketchup' then array[22,900,0,1]
    when n ~ 'quince paste|membrillo|red bean paste|sweet bean|\manko\M|\mkaya\M|halwa|halva|halawa' then array[45,20,0,1]
    when n ~ 'worcestershire' then array[10,1000,0,1]
    when n ~ 'gochujang|ssamjang' then array[20,3000,0,1]
    when n ~ 'kecap|sweet soy' then array[50,3000,0,1]
    when n ~ 'miso|doenjang|soy ?bean paste|bean paste|chunjang|doubanjiang' then array[8,4000,0,1]
    when n ~ 'hoisin|oyster sauce' then array[35,2500,0,1]
    when n ~ 'sriracha|hot sauce|chil+i sauce|piri' then array[20,2200,0,1]
    when n ~ 'harissa|curry paste|chil+i paste|shrimp paste|belacan' then array[5,1500,0,1]
    when n ~ 'mustard' and n !~ 'seeds?\M|greens|powder' then array[3,1100,0,1]
    when n ~ 'mayonnaise|\mmayo\M' then array[1,630,40,1]
    when n ~ 'kimchi|sauerkraut' then array[1,700,0,1]
    when n ~ 'hummus' then array[1,400,0,1]
    when n ~ 'refried beans' then array[0.5,400,0,1]
    when n ~ 'bread ?crumbs|panko' then array[5,700,0,1]
    when n ~ 'pesto' then array[2,600,10,1]
    when n ~ 'shanklish|jibneh|jben' then array[2,1500,60,1]
    when n ~ 'smoked|cured|kipper|\mlox\M|pastirma|basturma|basterma|bresaola|khli|khlea|corned' and n !~ 'paprika|salt' then array[0,1800,70,1]
    when n ~ 'tomato (paste|pur[eé]e)' then array[12,60,0,1]
    when n ~ '\m(stock|broth)\M' then array[0.5,350,0,1]
    when n ~ '\molives?\M' and n !~ 'olive oil' then array[0,1550,0,1]
    when n ~ 'pickle|capers' then array[1,1200,0,1]
    when n ~ 'egg yolk' then array[0.6,48,1085,1]
    when n ~ 'egg white' then array[0.7,166,0,1]
    when n ~ '\meggs?\M' then array[0.4,142,372,1]
    when n ~ '\mliver' then array[0,70,300,1]
    when n ~ 'shrimp|prawn' then array[0,120,190,1]
    when n ~ 'squid|calamari' then array[0,44,233,1]
    when n ~ 'crab|lobster|mussel|clam|scallop|octopus' then array[0,300,60,1]
    when n ~ 'sausage|merguez|sujuk|sucuk|hot dog' then array[1,1000,70,1]
    when n ~ 'anchov' then array[0,1500,60,1]
    when n ~ 'tuna' and n ~ 'can|tin' then array[0,350,40,1]
    when n ~ 'fish|salmon|cod|tuna|sardine|mackerel|trout|tilapia|hake|haddock|sea ?bass|bream|snapper|grouper|halibut|kingfish|carp|catfish|sole' then array[0,60,55,1]
    when n ~ 'chicken|turkey|duck|quail|poussin' then array[0,80,90,1]
    when n ~ 'beef|lamb|mutton|veal|goat|camel|\mmeat|mince|steak|brisket|kofta|keema' then array[0,70,80,1]
    when n ~ 'condensed milk' then array[54,127,34,1]
    when n ~ 'evaporated milk' then array[10,106,29,1]
    when n ~ 'ice cream' then array[21,80,44,1]
    when n ~ 'buttermilk' then array[5,105,4,1]
    when n ~ 'butter' and n !~ 'peanut|almond|nut butter|butter ?beans|cashew' then array[0.1,300,215,1]
    when n ~ 'ghee|samneh|smen' then array[0,2,256,1]
    when n ~ 'cream cheese|labneh|labne' then array[3,300,30,1]
    when n ~ 'feta|white cheese|akkawi|nabulsi|halloumi' then array[2,1100,80,1]
    when n ~ 'parmesan' then array[0.9,1600,88,1]
    when n ~ 'paneer' then array[3,20,60,1]
    when n ~ 'cheese' then array[0.5,650,100,1]
    when n ~ 'coconut (milk|cream)' then array[3,15,0,1]
    when n ~ '\m(cream|qishta|ashta|kaymak)\M' then array[3,40,110,1]
    when n ~ 'yogh?urt|laban|kefir|ayran' then array[4.7,46,13,1]
    when n ~ '(almond|oat|soy|rice|cashew|plant) milk' then array[3,50,0,1]
    when n ~ '\mmilk\M' then array[5,44,10,1]
    when n ~ 'sugar' and n !~ 'snap' then array[100,1,0,1]
    when n ~ 'piloncillo|panela|jaggery|gur\M' then array[90,30,0,1]
    when n ~ 'biscotti|biscuits?|cookies?|wafers?|cake' and n !~ 'rice cake|fish cake|pancake|cake flour' then array[30,300,20,1]
    when n ~ 'honey' then array[82,4,0,1]
    when n ~ 'syrup|molasses|\mdibs\M' then array[70,10,0,1]
    when n ~ '\mjam\M|preserves|marmalade' then array[49,30,0,1]
    when n ~ 'cocoa' then array[2,21,0,1]
    when n ~ 'chocolate' then array[48,24,8,1]
    when n ~ '\mdates?\M' then array[66,2,0,1]
    when n ~ 'raisins?|sultanas?|dried (apricot|fig|fruit|cranberr)|prunes?' then array[59,10,0,1]
    when n ~ 'banana|plantain' then array[13,2,0,1]
    when n ~ 'mango|grapes?|\mfigs?\M|pomegranate|cherr' then array[15,1,0,1]
    when n ~ 'apple|pear|orange|peach|apricot|plum|pineapple|kiwi|berr|melon|quince|\mfruit' then array[10,1,0,1]
    when n ~ 'pitta?|naan|baguette|flatbread|tortilla|\mbread|\mrolls?\M|\mbuns?\M|khobz|lavash|chapati|roti|crackers?|muffins?|bagels?|croissants?|ciabatta|focaccia|brioche' then array[4,490,0,1]
    when n ~ '(chickpeas|beans|lentils|corn|peas)' and n ~ 'can|tin' then array[0.5,250,0,1]
    when n ~ '\msauce\M' and n !~ 'tomato|apple|cranberry|white sauce|bechamel' then array[10,1000,0,1]
    when n ~ '\mpaste\M' and n !~ 'garlic|ginger|tamarind|almond|date|sesame|pistachio|tomato|bean|lentil' then array[5,1500,0,1]
    when n ~ '\moil\M' then array[0,0,0,0]
    when n ~ 'sweet potato|beet|corn|carrot|onion|tomato|\mpeas?\M|squash|pumpkin' then array[4,30,0,0]
    when n ~ 'flour|rice|pasta|noodle|\moats?\M|bulg|couscous|semolina|lentil|chickpea|beans?\M|quinoa|vermicelli' then array[1,5,0,0]
    when n ~ 'nuts?\M|almond|walnut|pistachio|cashew|hazelnut|seeds?\M|tahini|sesame' then array[4,5,0,0]
    else array[2,20,0,0] end as v) x
$$;

create or replace function public.recipe_micros(p_recipe uuid, out sugar numeric, out sodium numeric, out cholesterol numeric)
language sql stable as $$
  with rows as (
    select m.*, public.ingredient_grams(lower(i.name), ri.quantity, lower(btrim(coalesce(ri.unit, '')))) g
    from public.recipe_ingredients ri
    join public.ingredients i on i.id = ri.ingredient_id
    cross join lateral public.ingredient_micros(lower(i.name)) m
    where ri.recipe_id = p_recipe
  ), s as (select greatest(coalesce((select servings from public.recipes where id = p_recipe), 4), 1) n)
  select
    case when bool_or(g is null and strict and rows.sugar > 0) then null else round(sum(coalesce(g, 0) * rows.sugar / 100) / (select n from s), 1) end,
    case when bool_or(g is null and strict and rows.sodium > 0) then null else round(sum(coalesce(g, 0) * rows.sodium / 100) / (select n from s)) end,
    case when bool_or(g is null and strict and rows.chol > 0) then null else round(sum(coalesce(g, 0) * rows.chol / 100) / (select n from s)) end
  from rows
$$;

-- Fill recipes that have no values yet (never overwrites values that came with the recipe).
create or replace function public.fill_recipe_micros()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update public.recipes r
     set sugar = m.sugar, sodium = m.sodium, cholesterol = m.cholesterol, micros_source = 'computed'
    from (select id from public.recipes where micros_source is null and sugar is null and sodium is null and cholesterol is null) t
    cross join lateral public.recipe_micros(t.id) m
   where r.id = t.id;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.fill_recipe_micros() from public, anon, authenticated;

insert into public.dietary_preferences (name)
select v from unnest(array['Vegan', 'Low-sugar', 'Low-sodium', 'Low-cholesterol']) v
where not exists (select 1 from public.dietary_preferences d where d.name = v);

select public.fill_recipe_micros();
