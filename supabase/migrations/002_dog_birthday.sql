-- Add birthday column, keep age_months for backward compatibility during transition
alter table public.dogs add column if not exists birthday date;
