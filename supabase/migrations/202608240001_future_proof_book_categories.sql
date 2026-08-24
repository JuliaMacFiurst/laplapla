-- Category translations and taxonomy metadata are authored once and read by the public API.
-- Existing ids/slugs and book_categories relations remain unchanged.
alter table public.categories
  add column if not exists group_key text not null default 'other';

alter table public.categories
  alter column translations set default '{}'::jsonb;

with category_backfill(slug, labels, group_key) as (
  values
    ('kids', jsonb_build_object('ru', 'Детские', 'en', 'Children''s', 'he', 'ילדים'), 'audience'),
    ('fantasy', jsonb_build_object('ru', 'Фэнтези', 'en', 'Fantasy', 'he', 'פנטזיה'), 'speculative'),
    ('classic', jsonb_build_object('ru', 'Классика', 'en', 'Classics', 'he', 'קלאסיקה'), 'classic-history'),
    ('detective', jsonb_build_object('ru', 'Детективы', 'en', 'Detective fiction', 'he', 'ספרות בלשית'), 'mystery'),
    ('science', jsonb_build_object('ru', 'Наука', 'en', 'Science', 'he', 'מדע'), 'ideas'),
    ('philosophy', jsonb_build_object('ru', 'Философия', 'en', 'Philosophy', 'he', 'פילוסופיה'), 'ideas'),
    ('uzhasy', jsonb_build_object('ru', 'Ужасы', 'en', 'Horror', 'he', 'אימה'), 'mystery'),
    ('priklyucheniya', jsonb_build_object('ru', 'Приключения', 'en', 'Adventure', 'he', 'הרפתקאות'), 'literature'),
    ('istoricheskaya', jsonb_build_object('ru', 'Историческая литература', 'en', 'Historical fiction', 'he', 'ספרות היסטורית'), 'classic-history'),
    ('podrostkovaya', jsonb_build_object('ru', 'Подростковая литература', 'en', 'Young adult', 'he', 'ספרות נוער'), 'audience'),
    ('roman', jsonb_build_object('ru', 'Роман', 'en', 'Novel', 'he', 'רומן'), 'literature'),
    ('antiutopiya', jsonb_build_object('ru', 'Антиутопия', 'en', 'Dystopian fiction', 'he', 'ספרות דיסטופית'), 'speculative'),
    ('satira', jsonb_build_object('ru', 'Сатира', 'en', 'Satire', 'he', 'סאטירה'), 'literature'),
    ('drama', jsonb_build_object('ru', 'Драма', 'en', 'Drama', 'he', 'דרמה'), 'literature'),
    ('magicheskij-realizm', jsonb_build_object('ru', 'Магический реализм', 'en', 'Magical realism', 'he', 'ריאליזם מאגי'), 'speculative'),
    ('fantastika', jsonb_build_object('ru', 'Фантастика', 'en', 'Speculative fiction', 'he', 'ספרות ספקולטיבית'), 'speculative'),
    ('mistika', jsonb_build_object('ru', 'Мистика', 'en', 'Supernatural fiction', 'he', 'ספרות על-טבעית'), 'mystery'),
    ('temnoe-fentezi', jsonb_build_object('ru', 'Тёмное фэнтези', 'en', 'Dark fantasy', 'he', 'פנטזיה אפלה'), 'speculative'),
    ('skazka', jsonb_build_object('ru', 'Сказка', 'en', 'Fairy tale', 'he', 'אגדה'), 'literature'),
    ('portalnoe-fentezi', jsonb_build_object('ru', 'Портальное фэнтези', 'en', 'Portal fantasy', 'he', 'פנטזיית מעבר'), 'speculative'),
    ('detskaya-klassika', jsonb_build_object('ru', 'Детская классика', 'en', 'Children''s classics', 'he', 'קלאסיקה לילדים'), 'classic-history'),
    ('nauchnaya-fantastika', jsonb_build_object('ru', 'Научная фантастика', 'en', 'Science fiction', 'he', 'מדע בדיוני'), 'speculative')
)
update public.categories as category
set
  translations = coalesce(category.translations, '{}'::jsonb) || (
    backfill.labels - coalesce(
      array(
        select entry.key
        from jsonb_each(coalesce(category.translations, '{}'::jsonb)) as entry
        where entry.value <> 'null'::jsonb
          and entry.value <> '""'::jsonb
      ),
      array[]::text[]
    )
  ),
  group_key = case
    when category.group_key is null or btrim(category.group_key) in ('', 'other') then backfill.group_key
    else category.group_key
  end
from category_backfill as backfill
where category.slug = backfill.slug;

comment on column public.categories.translations is
  'Stored labels keyed by locale, for example {"ru":"...","en":"...","he":"..."}. Filled during category creation/editing, never on public GET.';
comment on column public.categories.group_key is
  'Presentation taxonomy group. Unknown/new categories default to other and remain visible.';
