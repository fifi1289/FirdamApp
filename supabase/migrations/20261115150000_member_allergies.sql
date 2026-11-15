-- Which family member has which allergy. The family's list (meal_preferences.allergies)
-- stays the one shared meals are made safe for; this says who it belongs to, so food only
-- one person avoids can still be cooked for everyone else.
alter table public.family_members add column if not exists allergies text[] not null default '{}';
