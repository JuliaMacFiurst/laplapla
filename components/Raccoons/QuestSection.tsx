import Image from 'next/image';
import React from 'react';
import { useRouter } from 'next/router';
import { QuestCarousel } from './QuestCarousel';
import { buildLocalizedQuery, getCurrentLang } from '@/lib/i18n/routing';
import { dictionaries } from '@/i18n';

/**
 * Типы состояний квестов
 * потом легко расширятся: locked, completed, seasonal и т.д.
 */
export type QuestStatus = 'active' | 'coming_soon' | 'locked';

export interface Quest {
  id: string;
  title?: string;
  subtitle?: string;
  image?: string;
  status: QuestStatus;
  featured?: boolean;
}

/**
 * Пока данные можно прокидывать пропсом,
 * позже — забирать из Supabase / API / стора
 */
interface QuestSectionProps {
  quests?: Quest[];
}

export const QuestSection: React.FC<QuestSectionProps> = ({ quests = [] }) => {
  return (
    <section className="quest-section">
      <QuestSectionHeader />

      <QuestCarousel quests={quests} />
    </section>
  );
};

/* ----------------- Header ----------------- */

const QuestSectionHeader: React.FC = () => {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const t = dictionaries[lang].raccoons.quests;

  return (
    <header className="raccoons-header-container">
      <h2 className="page-title">{t.title}</h2>
      <p className="page-subtitle">{t.subtitle}</p>
    </header>
  );
};

/* ----------------- Cards ----------------- */

interface QuestCardProps {
  quest: Quest;
}

export const FeaturedQuestCard: React.FC<QuestCardProps> = ({ quest }) => {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const t = dictionaries[lang].raccoons.quests;
  const imageSrc = quest.image || '/images/quest-placeholder.webp';

  const handlePlayClick = () => {
  if (quest.status !== 'active') return;

  router.push(
    {
      pathname: `/quests/${quest.id}`,
      query: buildLocalizedQuery(lang),
    },
    undefined,
    { locale: lang },
  );
};

  return (
    <div className="quest-card featured">
      <div className="quest-image">
        <Image
          src={imageSrc}
          alt={quest.title || ''}
          fill
          unoptimized
          className="quest-image-media"
        />
      </div>

      <div className="quest-content">
        <h3>{quest.title}</h3>
        <p>{quest.subtitle}</p>
        <button
          className="quest-play-button"
          aria-label={t.playQuest}
          onClick={handlePlayClick}
          disabled={quest.status !== 'active'}
        >
          ▶
        </button>
      </div>
    </div>
  );
};
