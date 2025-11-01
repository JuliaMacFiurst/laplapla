import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Lesson {
  id: string;
  title: string;
  preview: string;
  slug: string;
  category_slug: string;
}

export default function LessonsPage() {
  const router = useRouter();
  const category = router.query.category as string;
  const [lessons, setLessons] = useState<Lesson[]>([]);

  useEffect(() => {
    console.log('📦 Категория из URL:', category);
    if (!category) return;


    supabase
      .from('lessons')
      .select('id, title, preview, slug, category_slug')
      .eq('category_slug', category)
      .then(({ data, error }) => {
        if (error) {
          console.error('❌ Ошибка загрузки уроков:', error);
        } else {
          console.log('✅ Уроки получены из Supabase:', data);
          const lessonsWithPublicUrls = data || [];
          console.log('🖼 Публичные ссылки на превьюшки сгенерированы:', lessonsWithPublicUrls);

          const fetchSignedUrls = async () => {
            const signedLessons = await Promise.all(
              lessonsWithPublicUrls.map(async (lesson) => {
                try {
                  const { data: signedUrlData, error: signedUrlError } =
                    await supabase.storage
                      .from('lessons')
                      .createSignedUrl(lesson.preview, 60); // срок действия 60 секунд

                  if (signedUrlError || !signedUrlData) {
                    console.error('Ошибка получения signed URL:', signedUrlError);
                    return { ...lesson, preview: '' };
                  }

                  return { ...lesson, preview: signedUrlData.signedUrl };
                } catch (err) {
                  console.error('Непредвиденная ошибка при получении signed URL:', err);
                  return { ...lesson, preview: '' };
                }
              })
            );
            setLessons(signedLessons);
          };

          fetchSignedUrls();
        }
      });
  }, [category]);

  return (
    <main className="lessons-page">
      <h1 className="lessons-title page-title">Выбери урок</h1>
      <div className="lessons-grid">
        {lessons.map((lesson) => (
          <div key={lesson.id} className="lesson-card">
            {lesson.preview ? (
              <img src={lesson.preview} alt={lesson.title} className="lesson-image" />
            ) : (
              <div className="lesson-image lesson-image--placeholder">Нет превью</div>
            )}
            <div className="lesson-info">
              <h2 className="lesson-title">{lesson.title}</h2>
              <button
                className="lesson-start-button"
                onClick={() => router.push(`/dog/lessons/${lesson.slug}`)}
              >
                Начать рисовать
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
