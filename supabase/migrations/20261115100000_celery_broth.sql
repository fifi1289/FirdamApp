-- Broth and stock count as celery (shop-bought ones usually contain it). Same
-- function as 20261011120000_recipe_checks.sql, regenerated from the app's rules.
CREATE OR REPLACE FUNCTION public.recipe_allergen_names(ingredients text[])
RETURNS text[] LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  raw text;
  n text;
  found text[] := '{}';
BEGIN
  FOREACH raw IN ARRAY coalesce(ingredients, '{}') LOOP
    n := trim(regexp_replace(regexp_replace(lower(raw), '[’`]', '''', 'g'), '\s+', ' ', 'g'));
      IF regexp_replace(n, '\y(rice flour|glutinous rice flour|gluten-free|chickpea flour|gram flour|besan|corn ?flour|cornmeal|(white |yellow )?maize (flour|meal)|maize|almond flour|coconut flour|tapioca|cassava|teff|potato flour|buckwheat|rice noodles?|rice vermicelli|glass noodles|rice paper|corn tortillas?|tamari|coconut aminos|rice cakes?)\y', ' ', 'g') ~ '\y(flour|bread|breadcrumbs?|brioche|baguettes?|croissants?|bagels?|sourdough|msemen|baghrir|pretzels?|waffles?|crumpets?|muffins?|panko|pitta?s?|naan|chapati|roti|paratha|flatbreads?|lepinja|tortillas?|wraps?|pasta|spaghetti|penne|fusilli|macaroni|fettuccine|tagliatelle|linguine|rigatoni|ravioli|tortellini|buns?|bread rolls?|granola|muesli|lasagne|lasagna|orzo|noodles?|vermicelli|couscous|bulgur|bulgh?ur|freekeh|frik|semolina|barley|wheat|rye|spelt|seitan|filo|phyllo|puff pastry|pastry|brik|warka|pizza dough|dough|soy sauce|kecap manis|teriyaki sauce|oyster sauce|hoisin|crackers?|biscuits?|cake|rusk|kataifi|kunafa|knafeh|malt|jareesh|harees|yufka)\y' THEN found := array_append(found, 'Gluten'); END IF;
      IF regexp_replace(n, '\y(coconut milk|coconut cream|almond milk|oat milk|soy milk|soya milk|rice milk|peanut butter|almond butter|cashew butter|nut butter|shea butter|cocoa butter|cream of tartar|butter beans?|butterhead|dairy-free|vegan (butter|cheese|yogh?urt)|coconut yogh?urt)\y', ' ', 'g') ~ '\y(milk|butter|ghee|cream|yogh?urt|labneh|cheese|paneer|feta|halloumi|mozzarella|parmesan|cheddar|ricotta|mascarpone|akkawi|nabulsi|jameed|kashk|kefir|buttermilk|whey|casein|custard|ice cream|khoa|khoya|condensed|evaporated|tzatziki|creme fraiche|crème fraîche|qishta|ashta)\y' THEN found := array_append(found, 'Dairy'); END IF;
      IF regexp_replace(n, '\y(eggplants?|egg-free|vegan mayo)\y', ' ', 'g') ~ '\y(eggs?|egg yolks?|egg whites?|mayonnaise|mayo|meringue|aioli)\y' THEN found := array_append(found, 'Eggs'); END IF;
      IF regexp_replace(n, '\y(nutmeg|coconut|doughnut|butternut|peanuts?|tiger nuts?|water chestnuts?)\y', ' ', 'g') ~ '\y(almonds?|walnuts?|pistachios?|cashews?|hazelnuts?|pecans?|pine nuts?|macadamias?|brazil nuts?|praline|marzipan|frangipane|nut butter|almond (flour|milk|butter|extract)|mixed nuts|nuts)\y' THEN found := array_append(found, 'Tree nuts'); END IF;
      IF n ~ '\y(peanuts?|groundnuts?|peanut butter|peanut oil|satay sauce)\y' THEN found := array_append(found, 'Peanuts'); END IF;
      IF n ~ '\y(sesame|tahini|tahina|za''?atar|halva|halwa tahini|dukkah|gomasio)\y' THEN found := array_append(found, 'Sesame'); END IF;
      IF regexp_replace(n, '\y(fish-free|vegan fish sauce)\y', ' ', 'g') ~ '\y(fish|salmon|tuna|cod|haddock|hake|pollock|tilapia|sea ?bass|branzino|bream|snapper|mackerel|sardines?|anchov(y|ies)|herring|trout|halibut|kingfish|grouper|carp|catfish|swordfish|whitebait|fish sauce|worcestershire|shito|bonito|dashi|maldive fish|dried fish)\y' THEN found := array_append(found, 'Fish'); END IF;
      IF n ~ '\y(prawns?|shrimps?|crabs?|lobsters?|crayfish|langoustines?|mussels?|clams?|oysters?|scallops?|squid|calamari|octopus|cuttlefish|shrimp paste|belacan|laksa paste|shito|terasi|oyster sauce|dried shrimp)\y' THEN found := array_append(found, 'Shellfish'); END IF;
      IF n ~ '\y(soy|soya|tofu|tempeh|edamame|miso|kecap manis|tamari|teriyaki sauce|soybeans?|hoisin)\y' THEN found := array_append(found, 'Soy'); END IF;
      IF n ~ '\y(mustard)\y' THEN found := array_append(found, 'Mustard'); END IF;
      IF n ~ '\y(celery|celeriac|stock cubes?|bouillon|broths?|stocks?)\y' THEN found := array_append(found, 'Celery'); END IF;
  END LOOP;
  RETURN ARRAY(SELECT DISTINCT unnest(found) ORDER BY 1);
END;
$$;

-- Tag the library's recipes that use broth or stock.
SELECT public.retag_recipe_allergens();
