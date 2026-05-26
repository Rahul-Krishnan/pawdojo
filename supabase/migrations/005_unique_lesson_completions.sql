-- Prevent duplicate lesson completions per dog
-- First, deduplicate existing rows (keep the earliest)
DELETE FROM public.lesson_completions a
USING public.lesson_completions b
WHERE a.id > b.id
  AND a.dog_id = b.dog_id
  AND a.lesson_id = b.lesson_id;

-- Add the unique constraint
ALTER TABLE public.lesson_completions
  ADD CONSTRAINT lesson_completions_dog_lesson_unique UNIQUE (dog_id, lesson_id);
