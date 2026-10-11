-- Second pass: the same dish under a differently worded name. Re-runnable.
WITH RECURSIVE
named(a, b) AS (VALUES
('Akara (Bean Fritters)','Nigerian Akara (Fried Bean Fritters)'),
('Algerian Halal Bourek Beef and Cheese Rolls Dinner','Algerian Halal Bourek with Minced Beef and Cheese'),
('Algerian Halal Karantika Chickpea Flan Dinner','Algerian Halal Garanti (Baked Chickpea Flan)'),
('Algerian Halal Kefta Meatball Tagine Dinner','Algerian Halal Kefta Meatball Tagine with Tomato Sauce'),
('Algerian Halal M''hedjeb (Spiced Onion and Tomato Stuffed Crêpe)','Algerian Halal M''hedjeb Stuffed Crêpe Dinner'),
('Algerian Halal Tlitli Bird''s Tongue Pasta Dinner','Algerian Halal Tlitli (Bird''s Tongue Pasta with Spiced Meat)'),
('American Halal Macaroni and Cheese with Crispy Turkey Bacon','American Halal Baked Macaroni and Cheese with Bacon Dinner'),
('American Halal Shepherd''s Pie with Ground Beef Dinner','Universal Halal Shepherd''s Pie with Ground Beef Dinner'),
('Arayes (Grilled Meat-Stuffed Pita)','Arayes Kafta (Grilled Pita Stuffed with Spiced Meat)'),
('Chinese Beef Chow Mein Breakfast Noodles','Chinese Halal Beef Chow Mein (Stir-Fried Noodles)'),
('Cumin Lamb Stir-Fry','Chinese Halal Xinjiang Cumin Lamb Stir-Fry'),
('Ethiopian Halal Beyaynetu Grand Vegetarian Dinner Platter','Ethiopian Halal Beyaynetu (Vegetarian Combination Platter)'),
('Ethiopian Halal Lamb Alicha Wat (Mild Turmeric Stew)','Ethiopian Halal Lamb Alicha Wat (Mild Festive Stew)'),
('French Halal Beef Bourguignon with Steamed Potatoes','French Halal Beef Bourguignon Stew Dinner'),
('French Halal Chicken Blanquette Velvet Stew Dinner','French Halal Chicken Blanquette (Creamy Veal-Style Stew)'),
('French Halal Chicken Marengo Stew Dinner with Rice','French Halal Veal-Style Marengo Stew with Rice'),
('French Halal Steak au Poivre Pepper Sauce Dinner','French Halal Steak au Poivre with Creamy Peppercorn Sauce'),
('French Provençal Ratatouille with Crusty Bread and Goat Cheese','French Provençal Ratatouille Dinner with Goat Cheese'),
('Greek Gemista (Stuffed Tomatoes and Bell Peppers with Rice)','Greek Halal Gemista Stuffed Tomatoes and Peppers Dinner'),
('Greek Halal Stifado Beef Stew Dinner','Greek Halal Beef Stifado (Spiced Beef and Pearl Onion Stew)'),
('Greek Keftedes (Halal Meatball Lunch Plate with Lemon Rice)','Greek Halal Keftedes Fried Meatballs Dinner Plate'),
('Indian Aloo Gobi (Potato and Cauliflower Stir-Fry)','Indian Halal Aloo Gobi Potato and Cauliflower Dinner'),
('Indian Bhindi Masala (Spiced Okra Stir-Fry)','Bhindi Masala (Okra Stir-Fry)'),
('Indian Halal Bhuna Gosht Slow-Cooked Beef Dinner','Indian Halal Beef Bhuna Gosht'),
('Indian Halal Chicken Korma with Almonds','Indian Halal Chicken Korma Cashew Dinner'),
('Indonesian Halal Gulai Kambing Mutton Curry Dinner','Indonesian Gulai Kambing (Lamb Curry Soup)'),
('Italian Halal Chicken Piccata with Lemon Capers','Italian Halal Chicken Piccata Dinner with Lemon Caper Sauce'),
('Italian Halal Gnocchi al Pesto Dinner','Italian Gnocchi al Pesto (Potato Gnocchi with Basil Pesto)'),
('Italian Halal Penne all’Arrabbiata Dinner','Italian Penne all’Arrabbiata (Spicy Tomato Pasta)'),
('Japanese Halal Chicken Karaage Dinner Platter','Japanese Halal Karaage (Japanese Fried Chicken) Lunch Box'),
('Japanese Halal Yakisoba Stir-Fried Noodle Dinner','Japanese Halal Chicken Yakisoba (Stir-Fried Noodles)'),
('Jordanian Halal Musakhan Chicken and Sumac Dinner','Musakhan (Sumac Onion Chicken)'),
('Jordanian Musakhan Halal Chicken Rolls','Lebanese Halal Musakhan Chicken Roll Dinner'),
('Jordanian Musakhan Halal Chicken Rolls','Palestinian Halal Chicken Musakhan Rolls'),
('Palestinian Halal Chicken Musakhan Wrap','Palestinian Halal Chicken Musakhan Rolls'),
('Jordanian Qidreh (Halal Lamb and Spiced Rice Baked in Earthenware)','Jordanian Halal Qidreh Spiced Rice and Lamb Dinner'),
('Korean Galbi-jjim (Braised Halal Beef Short Ribs)','Korean Halal Spicy Galbi-Jjim Braised Beef Short Ribs Dinner'),
('Korean Halal Tteokbokki Spicy Rice Cake Dinner','Korean Tteokbokki (Spicy Rice Cakes with Halal Fish Cake)'),
('Korean Naengmyeon (Cold Buckwheat Noodles)','Korean Halal Mullnaengmyeon Cold Buckwheat Noodle Dinner'),
('Lamb Tagine with Prunes and Almonds','Moroccan Halal Lamb Tagine with Prunes and Toasted Almonds'),
('Lebanese Balila Warm Chickpea Salad','Syrian Balila (Warm Spiced Chickpea Bowl)'),
('Lebanese Halal Kibbeh Bil-Saniyeh Baked Dinner','Traditional Syrian Halal Kibbeh Bil-Saniyeh Dinner'),
('Traditional Syrian Halal Kibbeh Bil-Saniyeh Dinner','Traditional Syrian Halal Kibbeh Bil-Saniyeh (Baked Tray Kibbeh)'),
('Lebanese Halal Sayadieh Spiced Fish and Rice Dinner','Lebanese Sayadieh (Spiced Fish with Caramelized Onion Rice)'),
('Malaysian Halal Beef Satay Rice Bowl Dinner','Malaysian Halal Beef Satay Rice Bowl (Nasi Impit and Beef)'),
('Malaysian Halal Chicken Kurma with Steamed Rice','Malaysian Halal Chicken Kurma Dinner'),
('Malaysian Halal Chicken Laksa (Curry Laksa Noodles)','Malaysian Halal Curry Laksa Noodle Dinner'),
('Malaysian Halal Mee Rebus Sweet Potato Gravy Noodle Dinner','Malaysian Halal Mee Rebus (Yellow Noodles in Sweet Potato Gravy)'),
('Mee Goreng Mamak','Malaysian Halal Mee Goreng Mamak (Spiced Fried Noodles)'),
('Mexican Halal Huevos Rancheros Dinner Plate','Mexican Huevos Rancheros with Halal Chorizo'),
('Mexican Halal Torta Ahogada Drowned Sandwich Dinner','Mexican Torta Ahogada (Drowned Pork-Style Beef Sandwich)'),
('Misir Wat (Spiced Red Lentils)','Ethiopian Halal Misir Wat (Spiced Red Lentil Stew)'),
('Nigerian Beans Porridge (Ewa Riro) with Fried Plantain','Nigerian Bean Porridge (Ewa Riro) with Bread'),
('Pakistani Aloo Paratha with Butter','Punjabi Aloo Paratha with Butter'),
('Pakistani Halal Mutton Paya (Trotter Soup)','Lahori Mutton Paya (Trotter Stew)'),
('Pakistani Halal Seekh Kebab Platter with Naan and Mint Chutney','Pakistani Halal Seekh Kebab Dinner Platter with Naan'),
('Pakistani Halal Tandoori Chicken Piece with Naan','Pakistani Halal Tandoori Chicken Dinner Platter'),
('Palestinian Fried Halloumi and Tomato Breakfast Plate','Syrian Fried Halloumi and Tomato Plate'),
('Palestinian Mansaf with Halal Lamb and Jameed Sauce','Mansaf (Lamb in Jameed)'),
('Sucuklu Yumurta (Beef Sucuk & Eggs)','Turkish Sucuklu Yumurta (Fried Eggs with Halal Beef Sucuk)'),
('Syrian Halal Daoud Basha Meatball Dinner','Lebanese Halal Daoud Basha Meatball Stew Dinner'),
('Syrian Halal Daoud Basha Meatball Dinner','Syrian Halal Daoud Basha (Spiced Meatballs in Tomato Sauce)'),
('Syrian Halal Fasolia (White Bean Stew with Beef)','Lebanese Halal Fasolia White Bean Beef Stew Dinner'),
('Syrian Halal Makloubeh Upside-Down Rice Dinner','Lebanese Halal Makloubeh Upside-Down Rice Dinner'),
('Thai Halal Glass Noodle Stir-Fry (Pad Woon Sen)','Thai Savory Stir-Fried Glass Noodles (Pad Woon Sen Breakfast Style)'),
('Traditional Ethiopian Halal Doro Wat with Injera','Traditional Ethiopian Halal Doro Wat Feast Dinner'),
('Traditional French Halal Coq au Vin with Buttered Noodles','Traditional French Halal Coq au Vin Dinner'),
('Traditional Greek Halal Chicken Souvlaki Platter','Greek Halal Souvlaki Chicken Skewers Dinner Plate'),
('Traditional Lebanese Halal Chicken Tawook Lunch Plate','Traditional Lebanese Halal Chicken Shish Tawook Dinner'),
('Traditional Moroccan Halal Chicken Tagine with Preserved Lemons and Olives','Moroccan Chicken Tagine with Olives and Lemon'),
('Traditional Nigerian Halal Jollof Rice with Grilled Chicken','Jollof Rice with Chicken'),
('Traditional Spanish Tortilla de Patatas','Spanish Potato Omelette (Tortilla de Patatas)'),
('Universal Chia Seed Pudding','Chia Seed Pudding with Berries'),
('Universal Oatmeal with Maple & Pecans','Classic American Breakfast Oatmeal with Pecans and Maple'),
('Algerian Halal Dolma Kourchef (Stuffed Artichoke Bottoms)','Algerian Halal Dolma Kourchef Stuffed Artichokes Dinner')
),
edges AS (
  SELECT r1.id a, r2.id b FROM named n
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
  SELECT c.id, row_number() OVER (
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
