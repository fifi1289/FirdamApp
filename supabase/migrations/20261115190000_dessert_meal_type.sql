-- Desserts get their own category in the recipe library (never put in a meal
-- plan automatically: plans only use Breakfast, Lunch, Dinner and Snack).
insert into public.meal_types (name, active)
select 'Dessert', true
where not exists (select 1 from public.meal_types where name = 'Dessert');

-- The real desserts that were filed as snacks move to Dessert.
update public.recipes r
set meal_type_id = (select id from public.meal_types where name = 'Dessert')
where r.meal_type_id = (select id from public.meal_types where name = 'Snack')
  and r.name in (
    'Baklava', 'Basbousa', 'Biko (Sweet Sticky Rice Cake)', 'Biskot Al-Maamoul (Libyan snack)', 'Buskud (Somali Cookies)',
    'Dorayaki (Japanese red bean pancakes)', 'French Madeleines with Orange Zest', 'French Yogurt Cake (Gâteau au Yaourt) with Berries',
    'Gulab Jamun', 'Halwa (Omani sweet dessert)', 'Italian Bomboloni alla Crema (Italian Cream-Filled Doughnuts)', 'Kheer (Rice Pudding)',
    'Knafeh Nabulsieh', 'Kueh Lapis (Layered steamed cake)', 'Luqaimat (Date Syrup Dumplings)', 'Luqaimat (Qatari snack)',
    'Maamoul (Date-Filled Cookies)', 'Makrout (Date Semolina Cookies)', 'Malaysian Kuih Seri Muka (Sweet Pandan Coconut Cake)',
    'Om Ali (Bread Pudding)', 'Palestinian Semolina Milk Pudding (Mhalabiya)', 'Sheer Khurma', 'Sholeh Zard (Saffron Rice Pudding)',
    'Sütlaç (Baked Rice Pudding)', 'Syrian Semolina Milk Pudding (Mahalabiya)',
    'Thai Steamed Rice Flour Dumplings with Sweet Coconut (Kanom Sai Sai)', 'Thai Sweet Coconut Sticky Rice with Mango (Khao Niew Mamuang)',
    'Tunisian Halal Makroudh with Mint Tea (Semolina Date Pastry)', 'Zalabia (Iranian snack)'
  );
