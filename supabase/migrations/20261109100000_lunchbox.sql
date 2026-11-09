-- Lunchbox planner: a library of cold, nut-free, halal lunchboxes for school
-- (shared by every family, with one picture each), and each family's weekly
-- lunchbox plan. The lunchbox function adds AI-made ideas to the library only
-- after they pass the same checks (no nuts, halal, allergies, age).

CREATE TABLE IF NOT EXISTS public.lunchbox_ideas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 2 AND 80),
  items      text[] NOT NULL CHECK (cardinality(items) BETWEEN 1 AND 10),
  fun_tip    text NOT NULL CHECK (char_length(fun_tip) <= 300),
  tools      text[] NOT NULL DEFAULT '{}',
  tags       text[] NOT NULL DEFAULT '{}',
  min_age    int NOT NULL DEFAULT 3 CHECK (min_age BETWEEN 2 AND 18),
  image_path text,
  source     text NOT NULL DEFAULT 'library' CHECK (source IN ('library', 'ai', 'leftover')),
  i18n       jsonb NOT NULL DEFAULT '{}'::jsonb,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lunchbox_ideas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lunchbox_ideas_read ON public.lunchbox_ideas;
CREATE POLICY lunchbox_ideas_read ON public.lunchbox_ideas FOR SELECT TO anon, authenticated USING (active);
GRANT SELECT ON public.lunchbox_ideas TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.lunchbox_plans (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  children   jsonb NOT NULL DEFAULT '[]'::jsonb,
  days       jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, week_start)
);
ALTER TABLE public.lunchbox_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lunchbox_plans_own ON public.lunchbox_plans;
CREATE POLICY lunchbox_plans_own ON public.lunchbox_plans FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lunchbox_plans TO authenticated;

INSERT INTO public.lunchbox_ideas (name, items, fun_tip, tools, tags, min_age) VALUES
  ('Panda rice balls', ARRAY['2 small rice balls (cooked rice)','nori strips for panda faces','cucumber slices','halved cherry tomatoes','mandarin segments']::text[], 'Shape the rice into balls and add nori ears, eyes and a nose to make two little pandas.', ARRAY['rice ball mold','nori punch']::text[], ARRAY['vegetarian']::text[], 3),
  ('Sandwich bear', ARRAY['wholegrain sandwich with halal turkey slices and cheese, cut into a bear shape','banana slices for ears','blueberries for eyes','carrot sticks','apple slices']::text[], 'Use a bear cutter on the sandwich, then add banana ears and blueberry eyes.', ARRAY['animal sandwich cutter','bento food picks']::text[], '{}'::text[], 3),
  ('Dino veggie bites', ARRAY['dinosaur-shaped cheese sandwiches','snap peas','cucumber coins','hummus dip','strawberries']::text[], 'Cut sandwiches and cucumbers with dinosaur cutters and call the dip a ''dino swamp''.', ARRAY['dinosaur cookie cutter','silicone cupcake liners']::text[], ARRAY['vegetarian']::text[], 3),
  ('Rainbow wrap pinwheels', ARRAY['tortilla wrap with cream cheese, grated carrot and spinach, rolled and sliced','red pepper strips','yellow corn','purple grapes, halved','green kiwi slices']::text[], 'Line up the fruit and veg in rainbow order: red, orange, yellow, green and purple.', ARRAY['bento lunch box compartments','food picks']::text[], ARRAY['vegetarian']::text[], 3),
  ('Chicken nugget smile', ARRAY['baked halal chicken nuggets (cold)','ketchup in a small pot','cucumber smile','cherry tomato eyes, halved','apple slices']::text[], 'Arrange nuggets as a face with cucumber for the smile and tomato halves for eyes.', ARRAY['sauce containers with lids','kids lunch box']::text[], '{}'::text[], 3),
  ('Mini pizza muffins', ARRAY['2 mini pizza muffins (baked, eaten cold)','carrot and cucumber sticks','ranch-style yogurt dip','watermelon cubes']::text[], 'Use a star cutter on the watermelon so the pizza has stars around it.', ARRAY['star cookie cutter','mini muffin pan']::text[], ARRAY['vegetarian']::text[], 3),
  ('Hummus garden', ARRAY['hummus','mini pitas cut into triangles','cucumber flowers','carrot ''trees'' (sticks)','olives, pitted and halved','grapes, halved']::text[], 'Make a little garden: carrot trees growing out of the hummus and cucumber flowers around.', ARRAY['vegetable cutter shapes','dip containers']::text[], ARRAY['vegetarian']::text[], 3),
  ('Falafel pockets', ARRAY['2 baked falafel in a mini pita','shredded lettuce and tomato','yogurt garlic sauce','cucumber sticks','dates (pitted)']::text[], 'Wrap the pita with a paper band and write the child''s name on it.', ARRAY['sandwich wrap paper','bento box']::text[], ARRAY['vegetarian']::text[], 4),
  ('Pasta salad stars', ARRAY['star-shaped pasta salad with peas, corn and cheese cubes','cherry tomatoes, halved','orange slices']::text[], 'Use star pasta and add a little flag pick that says ''You''re a star''.', ARRAY['star pasta','food picks flags']::text[], ARRAY['vegetarian']::text[], 3),
  ('Bagel faces', ARRAY['mini bagel with cream cheese','cucumber and radish slices for a face','blueberries','cheese cubes']::text[], 'Let the kids imagine the face: cucumber eyes, radish cheeks and a pepper smile.', ARRAY['veggie cutter set','small bento box']::text[], ARRAY['vegetarian']::text[], 4),
  ('Egg muffin cups', ARRAY['2 baked egg muffins with spinach and cheese','toast fingers','cherry tomatoes, halved','melon cubes']::text[], 'Bake the egg muffins in heart-shaped silicone cups.', ARRAY['heart silicone baking cups','kids lunch box']::text[], ARRAY['vegetarian']::text[], 3),
  ('Tuna boat', ARRAY['tuna and corn salad in mini cucumber or pepper ''boats''','crackers','grapes, halved','a small cheese stick']::text[], 'Add a little cheese ''sail'' on a pick to each boat.', ARRAY['food picks','bento box']::text[], ARRAY['pescatarian']::text[], 4),
  ('Butterfly sandwich', ARRAY['two triangle sandwiches with halal chicken and lettuce arranged as wings','carrot stick body','rice crackers','strawberries']::text[], 'Place two triangles point to point with a carrot in the middle for a butterfly.', ARRAY['sandwich cutter','bento lunch box']::text[], '{}'::text[], 3),
  ('Rice paper rolls', ARRAY['rice paper rolls with rice noodles, carrot, cucumber and halal chicken','soy-free dipping sauce (coconut aminos)','mango slices']::text[], 'Kids love making these the night before. Let them pick the fillings.', ARRAY['rice paper','dip containers']::text[], ARRAY['gluten-free']::text[], 5),
  ('Quesadilla triangles', ARRAY['cheese and bean quesadilla triangles (cold)','salsa','corn','avocado cubes with lemon','apple slices']::text[], 'Cut the quesadilla with a big heart cutter for a ''love lunch''.', ARRAY['heart cookie cutter','sauce cups']::text[], ARRAY['vegetarian']::text[], 3),
  ('Kofta and couscous', ARRAY['2 small halal beef kofta (cold)','couscous salad with cucumber and tomato','yogurt dip','grapes, halved']::text[], 'Put each kofta on a fun pick so they''re easy to eat.', ARRAY['food picks','bento box']::text[], '{}'::text[], 4),
  ('Mini sandwich skewers', ARRAY['sandwich cubes with cheese','cucumber chunks','cherry tomatoes, halved','on kid-safe skewers (no sharp ends)']::text[], 'Build colourful ''sandwich kebabs'' on blunt picks.', ARRAY['kid safe food skewers','bento box']::text[], ARRAY['vegetarian']::text[], 4),
  ('Pancake stack', ARRAY['mini pancakes (cold)','a small pot of yogurt','berries','banana coins']::text[], 'Stack the pancakes like a tower and put berries on top.', ARRAY['silicone muffin cups','mini pancake pan']::text[], ARRAY['vegetarian']::text[], 3),
  ('Cheesy pasta shells', ARRAY['pasta shells with tomato sauce and cheese (room temperature)','broccoli trees','pear slices']::text[], 'Call the broccoli ''little trees'' and the shells ''sea shells''.', ARRAY['insulated food jar for kids','bento box']::text[], ARRAY['vegetarian']::text[], 3),
  ('Lentil patties', ARRAY['2 lentil and carrot patties','tzatziki','pita triangles','cucumber sticks','mandarin']::text[], 'Shape patties into little suns and add a carrot smile.', ARRAY['sauce containers','bento box']::text[], ARRAY['vegetarian']::text[], 4),
  ('Chicken shawarma wrap', ARRAY['halal chicken shawarma wrap with garlic yogurt','pickled cucumber slices','carrot sticks','grapes, halved']::text[], 'Wrap in paper and draw stripes like a real shawarma shop.', ARRAY['sandwich wrap paper','lunch box']::text[], '{}'::text[], 5),
  ('Fruit sushi', ARRAY['rice rolled with banana and strawberry (sweet ''sushi'')','a small yogurt dip','cucumber coins']::text[], 'Slice the rolls like sushi and put a fun pick in each.', ARRAY['sushi mat for kids','food picks']::text[], ARRAY['vegetarian']::text[], 4),
  ('Mac and cheese cups', ARRAY['baked mac and cheese cups','pea and carrot mix','apple slices']::text[], 'Bake them in a mini muffin pan so each cup is a bite.', ARRAY['mini muffin pan','silicone cups']::text[], ARRAY['vegetarian']::text[], 3),
  ('Cucumber caterpillar', ARRAY['cucumber slices lined up as a caterpillar','cherry tomato head, halved','cream cheese crackers','halal turkey roll-ups','blueberries']::text[], 'Line cucumber slices in a wavy line and add a tomato head with tiny eyes.', ARRAY['food picks','bento box']::text[], '{}'::text[], 3),
  ('Moroccan bites', ARRAY['msemen pieces with cheese','olives, pitted','orange slices with cinnamon','carrot salad']::text[], 'Sprinkle a little cinnamon on oranges, just like in Morocco.', ARRAY['bento box compartments','spice shaker']::text[], ARRAY['vegetarian']::text[], 4),
  ('Zaatar manakish', ARRAY['mini zaatar manakish','labneh','cucumber and tomato','olives, pitted','grapes, halved']::text[], 'Roll the labneh into little balls the night before.', ARRAY['small sauce containers','bento box']::text[], ARRAY['vegetarian']::text[], 4),
  ('Fish finger fun', ARRAY['baked fish fingers (cold)','tartar-style yogurt dip','peas','lemon wedge','melon']::text[], 'Arrange the fish fingers like a fence with peas as a garden.', ARRAY['sauce cups','kids lunch box']::text[], ARRAY['pescatarian']::text[], 4),
  ('Spinach and cheese pastries', ARRAY['2 small spinach and feta pastries','cherry tomatoes, halved','cucumber sticks','apple slices']::text[], 'Make little triangles and let kids help fold them.', ARRAY['pastry cutter','bento box']::text[], ARRAY['vegetarian']::text[], 4),
  ('Burrito bowl', ARRAY['rice','black beans','corn','grated cheese','mild salsa','avocado with lemon']::text[], 'Pack each part in its own compartment so kids build their own bowl.', ARRAY['bento lunch box compartments','kids fork spoon set']::text[], ARRAY['vegetarian','gluten-free']::text[], 4),
  ('Mini meatball subs', ARRAY['2 halal beef meatballs in mini buns with tomato sauce','carrot coins','grapes, halved']::text[], 'Add a tiny flag on top of each sub.', ARRAY['food picks flags','insulated lunch bag']::text[], '{}'::text[], 4),
  ('Yogurt parfait jar', ARRAY['plain yogurt','nut-free granola (oat-based)','berries','banana']::text[], 'Layer it in a jar like a rainbow so kids see the colours.', ARRAY['small glass jars with lids','insulated lunch bag']::text[], ARRAY['vegetarian']::text[], 3),
  ('Corn and cheese fritters', ARRAY['2 corn and cheese fritters','yogurt dip','cucumber','strawberries']::text[], 'Cut fritters with a flower cutter.', ARRAY['flower cookie cutter','sauce cups']::text[], ARRAY['vegetarian']::text[], 3),
  ('Chicken pasta salad', ARRAY['fusilli with halal chicken, peas and corn in a light yogurt dressing','cherry tomatoes, halved','kiwi']::text[], 'Hide the peas and corn like ''treasure'' in the pasta.', ARRAY['bento box','kids cutlery set']::text[], '{}'::text[], 4),
  ('Smiley potato wedges', ARRAY['baked potato wedges (cold)','halal chicken strips','ketchup','cucumber sticks','apple']::text[], 'Use a straw to poke little smiles in the potatoes before baking.', ARRAY['sauce containers','kids lunch box']::text[], '{}'::text[], 3),
  ('Bean and rice balls', ARRAY['rice and bean balls','mild tomato salsa','carrot sticks','mango']::text[], 'Roll them in a little cheese so they look like snowballs.', ARRAY['rice ball mold','bento box']::text[], ARRAY['vegetarian','gluten-free']::text[], 4),
  ('Ocean bento', ARRAY['fish-shaped cheese sandwiches','blue corn chips ''waves''','cucumber ''seaweed''','goldfish-shaped crackers (nut-free)','blueberries']::text[], 'Make an ocean scene: blue chips as waves and fish sandwiches swimming.', ARRAY['fish sandwich cutter','bento box']::text[], ARRAY['vegetarian']::text[], 4),
  ('Mini omelette rolls', ARRAY['rolled omelette slices with cheese','rice','cucumber','cherry tomatoes, halved']::text[], 'Roll the omelette tightly and slice into spirals.', ARRAY['tamagoyaki pan','bento box']::text[], ARRAY['vegetarian','gluten-free']::text[], 4),
  ('Chickpea salad cups', ARRAY['chickpea, cucumber and tomato salad in lettuce cups','pita chips','yogurt','dates']::text[], 'Let kids make their own cups at lunch.', ARRAY['silicone cups','bento box']::text[], ARRAY['vegetarian']::text[], 5),
  ('Turkey and cheese roll-ups', ARRAY['halal turkey and cheese roll-ups','crackers','cucumber','grapes, halved']::text[], 'Tie each roll-up with a chive like a little present.', ARRAY['food picks','bento box']::text[], '{}'::text[], 4),
  ('Sweet potato muffins', ARRAY['2 sweet potato and oat muffins (nut-free)','cheese cubes','apple slices','carrot sticks']::text[], 'Bake with a fun liner and draw a face on the muffin top with a raisin.', ARRAY['silicone muffin cups','kids lunch box']::text[], ARRAY['vegetarian']::text[], 3),
  ('Mini kebab sticks', ARRAY['halal chicken pieces','cherry tomatoes, halved','cucumber on blunt picks','rice','garlic yogurt']::text[], 'Let kids count the pieces on each stick.', ARRAY['kid safe food skewers','sauce cups']::text[], ARRAY['gluten-free']::text[], 5),
  ('Shapes sandwich puzzle', ARRAY['sandwich cut into puzzle pieces with cheese and cucumber','carrot sticks','berries']::text[], 'Cut the sandwich into puzzle shapes; the kids put it back together.', ARRAY['sandwich cutter set','bento box']::text[], ARRAY['vegetarian']::text[], 4),
  ('Breakfast for lunch', ARRAY['mini waffles (nut-free)','yogurt dip','berries','boiled egg, halved']::text[], 'Breakfast at lunchtime always gets a smile.', ARRAY['mini waffle maker','dip containers']::text[], ARRAY['vegetarian']::text[], 4),
  ('Leftover dinner wrap', ARRAY['last night''s dinner (halal meat or veg) in a wrap','lettuce','yogurt sauce','fruit']::text[], 'Turn leftovers into a new lunch so nothing goes to waste.', ARRAY['sandwich wrap paper','lunch box']::text[], '{}'::text[], 4),
  ('Pita pizza faces', ARRAY['mini pita pizzas with tomato and cheese','pepper and olive faces','cucumber','orange segments']::text[], 'Let the kids design the faces the night before.', ARRAY['veggie cutter set','bento box']::text[], ARRAY['vegetarian']::text[], 4),
  ('Cheese and apple stack', ARRAY['apple rounds with cheese slices','crackers','cucumber','grapes, halved']::text[], 'Stack apple, cheese, apple like a little tower.', ARRAY['apple corer','bento box']::text[], ARRAY['vegetarian']::text[], 4),
  ('Noodle salad', ARRAY['rice noodles with carrot, cucumber and halal chicken','mild coconut aminos dressing','mandarin']::text[], 'Twirl the noodles into nests with a fork.', ARRAY['bento box','kids chopsticks']::text[], ARRAY['gluten-free']::text[], 5),
  ('Veggie trains', ARRAY['crackers as train carriages','cheese cubes','cucumber wheels','carrot coins','grapes, halved']::text[], 'Build a train: crackers as carriages and cucumber wheels.', ARRAY['bento box','food picks']::text[], ARRAY['vegetarian']::text[], 3)
ON CONFLICT (name) DO NOTHING;

-- Pictures and French/Arabic text for library ideas (and new AI ideas) are
-- filled in by the lunchbox function, a few at a time, every hour. Each picture
-- is made once and shared by every family. When nothing is missing the job does
-- nothing. The token lives only in Supabase Vault (secret "lunchbox_admin_token"),
-- created once inside the database:
--   select vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'lunchbox_admin_token');

CREATE OR REPLACE FUNCTION public.check_lunchbox_admin_token(p_token text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v text;
BEGIN
  SELECT decrypted_secret INTO v FROM vault.decrypted_secrets WHERE name = 'lunchbox_admin_token';
  RETURN v IS NOT NULL AND length(v) >= 32 AND p_token = v;
END $$;
REVOKE ALL ON FUNCTION public.check_lunchbox_admin_token(text) FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.check_lunchbox_admin_token(text) FROM anon, authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.check_lunchbox_admin_token(text) TO service_role;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_net') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    CREATE EXTENSION IF NOT EXISTS pg_net;
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'lunchbox-library';
    PERFORM cron.schedule(
      'lunchbox-library',
      '23 * * * *',
      $job$
        SELECT net.http_post(
          url := 'https://psxwslmsjdtfzneoujea.supabase.co/functions/v1/lunchbox',
          headers := jsonb_build_object('Content-Type', 'application/json',
            'x-lunchbox-token', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'lunchbox_admin_token')),
          body := '{"action":"translate","limit":12}'::jsonb,
          timeout_milliseconds := 120000
        );
        SELECT net.http_post(
          url := 'https://psxwslmsjdtfzneoujea.supabase.co/functions/v1/lunchbox',
          headers := jsonb_build_object('Content-Type', 'application/json',
            'x-lunchbox-token', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'lunchbox_admin_token')),
          body := '{"action":"images","limit":3}'::jsonb,
          timeout_milliseconds := 150000
        );
      $job$
    );
  END IF;
END $$;
