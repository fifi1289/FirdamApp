-- Hide duplicate library recipes (same dish under a slightly different name),
-- keeping the copy with a photo and the most ingredients. Re-runnable.
WITH RECURSIVE
named(a, b) AS (VALUES
('Algerian Halal Batata Koucha Baked Potato and Beef Dinner','Algerian Halal Batata Koucha (Baked Potato and Beef Tray)'),
('Algerian Halal Chakchouka Pepper and Egg Skillet Dinner','Algerian Halal Chakchouka (Pepper and Tomato Egg Skillet)'),
('Algerian Halal Chakhchoukha (Torn Flatbread with Chicken Stew)','Algerian Halal Chakhchoukha Torn Flatbread Dinner'),
('Algerian Halal Chicken and Olive Tagine (Zitoune)','Algerian Halal Chicken and Olive Tagine Dinner'),
('Algerian Halal Chorba Frik (Cracked Green Wheat Soup)','Algerian Halal Chorba Frik Cracked Wheat Soup Dinner'),
('Algerian Halal Garanti Chickpea Flan Dinner','Algerian Halal Garanti (Baked Chickpea Flan)'),
('Algerian Halal Kesra (Traditional Semolina Flatbread with Stew)','Algerian Halal Kesra Flatbread with Stew Dinner'),
('Algerian Halal Rechta (Handmade Noodles with Chicken and White Sauce)','Algerian Halal Rechta Handmade Noodles White Sauce Dinner'),
('American Halal Beef Chili Con Carne Dinner with Cornbread','American Halal Chili Con Carne with Cornbread'),
('Bhindi Masala (Okra Stir-Fry)','Pakistani Halal Bhindi Masala (Okra Stir-Fry)'),
('British Halal Chicken and Mushroom Pot Pie','British Halal Chicken and Mushroom Pie'),
('Bubur Ayam (Chicken Rice Porridge)','Indonesian Bubur Ayam (Chicken Rice Porridge)'),
('Butter Chicken','Traditional Indian Halal Butter Chicken Dinner'),
('Chicken Alfredo Pasta','American Halal Chicken Alfredo Pasta Dinner'),
('Chicken Satay with Peanut Sauce','Malaysian Halal Chicken Satay with Peanut Sauce Lunch'),
('Malaysian Halal Chicken Satay with Peanut Sauce Lunch','Malaysian Halal Chicken Satay Feast Dinner with Peanut Sauce'),
('Chicken Tikka Masala','Indian Halal Chicken Tikka Masala Lunch Bowl'),
('Indian Halal Chicken Tikka Masala Dinner','Chicken Tikka Masala'),
('Chinese Lanzhou Halal Beef Noodle Soup','Lanzhou-Style Beef Noodle Soup'),
('Classic British Bubble and Squeak with Fried Egg','British Halal Beef Bubble and Squeak with Fried Egg'),
('Classic Malaysian Nasi Lemak','Nasi Lemak'),
('Classic Malaysian Nasi Lemak','Traditional Malaysian Halal Nasi Lemak Royale Dinner'),
('Lebanese Freekeh with Halal Chicken','Freekeh with Chicken'),
('Lebanese Freekeh with Halal Chicken','Lebanese Halal Freekeh Pilaf with Chicken Dinner'),
('French Halal Chicken Fricassee with Tarragon Cream Dinner','French Halal Chicken Fricassee with Tarragon Cream Sauce'),
('French Halal Chicken Provençal with Olives and Tomatoes','French Halal Chicken Provençal Dinner with Olives'),
('Greek Halal Bifteki Stuffed Beef Patties Dinner','Greek Bifteki (Stuffed Halal Beef Patties with Feta)'),
('Greek Halal Lemon Chicken Soup (Soup Avgolemono)','Greek Halal Avgolemono Chicken Soup Dinner'),
('Greek Yogurt Parfait with Granola','Greek Yogurt Parfait'),
('Indian Chana Masala (Spiced Chickpea Curry)','Indian Halal Chana Masala Chickpea Curry Dinner'),
('Indian Halal Chicken Madras (Spicy South Indian Curry)','Indian Halal Chicken Madras Spicy Curry Dinner'),
('Indian Halal Dal Tadka Yellow Lentil Dinner','Indian Dal Tadka (Yellow Lentil Soup with Tempering)'),
('Indian Halal Lamb Biryani','Indian Halal Lamb Biryani Dinner Feast'),
('Indonesian Soto Ayam Breakfast Soup','Soto Ayam'),
('Indonesian Soto Betawi (Beef Soup in Coconut Milk)','Indonesian Halal Soto Betawi Beef Coconut Soup Dinner'),
('Indonesian Soto Madura (Clear Beef Soup)','Indonesian Halal Soto Madura Beef Soup Dinner'),
('Indonesian Soto Madura (Clear Beef Soup)','Indonesian Soto Madura Beef Soup Breakfast'),
('Italian Halal Chicken Marsala with Mushrooms','Italian Halal Chicken Marsala Dinner'),
('Italian Halal Chicken Parmigiana Dinner with Spaghetti','Italian Halal Chicken Parmigiana Platter'),
('Italian Halal Eggplant Parmigiana Dinner (Parmigiana di Melanzane)','Italian Parmigiana di Melanzane (Eggplant Parmesan)'),
('Italian Halal Lasagna al Forno Dinner','Traditional Italian Lasagna al Forno with Halal Beef'),
('Italian Saltimbocca alla Romana (Halal Turkey/Beef Style)','Italian Halal Beef Saltimbocca alla Romana'),
('Japanese Halal Beef Gyudon (Beef and Onion Rice Bowl)','Japanese Halal Beef Gyudon Rice Bowl Dinner'),
('Japanese Halal Chicken Katsu Curry Dinner','Japanese Halal Chicken Katsu Curry with Rice'),
('Japanese Halal Oyakodon Chicken and Egg Rice Bowl Dinner','Japanese Halal Chicken Oyakodon (Egg and Chicken Bowl)'),
('Japanese Halal Salmon Teriyaki Dinner','Japanese Halal Salmon Teriyaki Bento'),
('Jordanian Halal Galayet Bandora Spiced Tomato Skillet Dinner','Galayet Bandora (Jordanian Tomato Skillet)'),
('Jordanian Halal Stuffed Cabbage Rolls (Malfouf) Dinner','Jordanian Stuffed Cabbage Rolls (Mehshi Malfouf)'),
('Kefta Mkaouara (Meatball Tagine with Eggs)','Moroccan Kefta Mkaouara (Meatball Tagine with Eggs)'),
('Korean Haemul Pajeon (Seafood and Scallion Pancake)','Korean Halal Haemul Pajeon Seafood Pancake Dinner'),
('Korean Halal Doenjang-Jjigae Soybean Paste Stew Dinner','Korean Doenjang-jjigae (Soybean Paste Stew with Halal Beef)'),
('Korean Halal Jjamppong Spicy Seafood Noodle Soup Dinner','Korean Jjamppong (Spicy Seafood and Halal Beef Noodle Soup)'),
('Korean Jajangmyeon (Noodles in Black Bean Sauce)','Korean Halal Jajangmyeon Black Bean Noodles Dinner'),
('Korean Kimchi Bokkeumbap (Kimchi Fried Rice with Fried Egg)','Korean Halal Kimchi Fried Rice (Kimchi-Bokkeumbap) Dinner'),
('Korean Sundubu-jjigae (Soft Tofu Stew with Halal Beef)','Korean Halal Sundubu-Jjigae Soft Tofu Soup Dinner'),
('Lentil Soup (Shorbat Adas)','Shorbat Adas (Comforting Breakfast Lentil Soup)'),
('Malaysian Halal Ayam Masak Merah Spiced Red Chicken Dinner','Malaysian Halal Ayam Masak Merah (Spicy Red Chicken Stew)'),
('Malaysian Halal Hainanese Poached Chicken Rice Dinner','Malaysian Halal Hainanese Chicken Rice'),
('Malaysian Halal Mee Goreng Mamak Special Dinner','Malaysian Halal Mee Goreng Mamak Special with Chicken'),
('Malaysian Halal Mee Goreng Mamak Special Dinner','Malaysian Mee Goreng Mamak'),
('Mee Goreng Mamak','Malaysian Mee Goreng Mamak'),
('Malaysian Halal Soto Ayam Chicken Vermicelli Soup Dinner','Malaysian Halal Soto Ayam (Spiced Chicken Vermicelli Soup)'),
('Malaysian Halal Sup Berempah Beef Bone Broth Dinner','Malaysian Halal Beef Sup Berempah (Spiced Bone Broth Soup)'),
('Mexican Halal Tacos al Pastor Dinner with Beef','Mexican Tacos al Pastor (Halal Beef/Turkey Style)'),
('Moroccan Baghrir (Thousand Hole Pancakes)','Baghrir (Thousand-Hole Pancakes)'),
('Nigerian Moi Moi (Steamed Bean Pudding)','Moi Moi (Steamed Bean Pudding)'),
('Pakistani Halal Bhindi Masala Okra Dinner Stir-Fry','Bhindi Masala (Okra Stir-Fry)'),
('Pakistani Halal Chicken Handi (Creamy Boneless Curry)','Pakistani Halal Chicken Handi Creamy Curry Dinner'),
('Pakistani Halal Chicken Pulao (Yakhni Pulao)','Yakhni Pulao (Chicken Pulao)'),
('Pakistani Halal Grand Chana Chaat and Dahi Baray Dinner Platter','Pakistani Halal Chana Chaat and Dahi Baray Lunch Platter'),
('Palestinian Musakhan Rolls (Breakfast Style)','Palestinian Halal Chicken Musakhan Rolls'),
('Roti Canai with Dhal','Malaysian Roti Canai with Dhal'),
('Spanish Halal Fabada Asturiana Dinner with Beef Sausages','Spanish Halal Fabada Asturiana with Beef Sausages and Beans'),
('Syrian Halal Bamia Okra and Beef Stew Dinner','Syrian Halal Bamia (Okra and Beef Stew with Rice)'),
('Syrian Halal Chicken Musakhan Roll (Aleppo Style)','Syrian Halal Chicken Musakhan Roll Dinner'),
('Syrian Halal Fatteh with Crispy Pita, Chickpeas, and Yogurt','Syrian Halal Fatteh Dinner with Crispy Pita and Chickpeas'),
('Syrian Halal Kebab Halabi (Aleppo Kebab with Cherry Sauce)','Syrian Halal Kebab Halabi with Cherry Sauce Dinner'),
('Syrian Halal Shish Tawook Wrap with Garlic Sauce','Syrian Halal Shish Tawook Garlic Wrap Dinner'),
('Syrian Halal Siniyet Kebab (Aleppo Tray Kebab with Tahini)','Syrian Halal Siniyet Kebab Aleppo Tray Kebab Dinner'),
('Thai Halal Massaman Beef Curry','Beef Massaman Curry'),
('Traditional Greek Halal Moussaka Dinner','Greek Halal Beef Moussaka Bowl'),
('Traditional Indonesian Halal Beef Rendang Dinner','Beef Rendang'),
('Traditional Italian Halal Spaghetti Bolognese Dinner','Spaghetti Bolognese'),
('Traditional Japanese Halal Chicken Teriyaki Bento','Traditional Japanese Halal Chicken Teriyaki Dinner'),
('Traditional Japanese Halal Chicken Teriyaki Dinner','Chicken Teriyaki'),
('Traditional Korean Halal Bulgogi Beef Dinner','Beef Bulgogi'),
('Traditional Korean Halal Bulgogi Beef Dinner','Korean Bulgogi Lunch Box (Halal Beef Bulgogi)'),
('Traditional Pakistani Halal Chicken Biryani','Chicken Biryani'),
('Traditional Pakistani Halal Chicken Biryani','Traditional Pakistani Halal Chicken Dum Biryani Dinner'),
('Turkish Çılbır (Poached Eggs with Garlic Yogurt)','Çılbır (Poached Eggs with Garlic Yogurt)'),
('Universal Classic French Toast','Classic French Toast')
),
w AS (
  SELECT r.id, unnest(regexp_split_to_array(regexp_replace(lower(translate(r.name,'áàâäãéèêëíìîïóòôöõúùûüñçÁÉÍÓÚÑ','aaaaaeeeeiiiiooooouuuuncAEIOUN')), '[^a-z]+', ' ', 'g'), ' ')) word
  FROM public.recipes r WHERE r.is_active
),
k AS (
  SELECT id, string_agg(DISTINCT word, ' ' ORDER BY word) k FROM w
  WHERE word <> '' AND word NOT IN ('halal','dinner','lunch','breakfast','snack','with','and','the','style','homemade','easy','classic','traditional','simple','quick','a','of','in','recipe','dish','s','authentic','home','family','healthy','fresh')
  GROUP BY id
),
edges AS (
  SELECT k1.id a, k2.id b FROM k k1 JOIN k k2 ON k1.k = k2.k AND k1.id <> k2.id
  UNION
  SELECT r1.id, r2.id FROM named n
    JOIN public.recipes r1 ON r1.name = n.a AND r1.is_active
    JOIN public.recipes r2 ON r2.name = n.b AND r2.is_active
),
sym AS (SELECT a, b FROM edges UNION SELECT b, a FROM edges),
reach(root, id) AS (
  SELECT a, a FROM sym
  UNION
  SELECT reach.root, sym.b FROM reach JOIN sym ON sym.a = reach.id
),
comp AS (SELECT id, min(root::text) g FROM reach GROUP BY id),
ranked AS (
  SELECT c.id, c.g, row_number() OVER (
    PARTITION BY c.g
    ORDER BY (r.image_path IS NOT NULL AND r.image_path <> '') DESC,
             (SELECT count(*) FROM public.recipe_ingredients ri WHERE ri.recipe_id = r.id) DESC,
             (r.name ~* '\y(dinner|lunch|breakfast)\y') ASC,
             length(r.name) ASC, r.created_at ASC
  ) n
  FROM comp c JOIN public.recipes r ON r.id = c.id
)
UPDATE public.recipes SET is_active = false, updated_at = now()
WHERE id IN (SELECT id FROM ranked WHERE n > 1);

