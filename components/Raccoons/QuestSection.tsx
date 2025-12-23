import React from 'react';
import { useRouter } from 'next/router';
import { QuestCarousel } from './QuestCarousel';

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
  return (
    <header className="raccoons-header-container">
      <h2 className="page-title">Приключения енотов</h2>
      <p className="page-subtitle">Большие квесты для тех, кто любит исследовать мир</p>
    </header>
  );
};

/* ----------------- Cards ----------------- */

interface QuestCardProps {
  quest: Quest;
}

export const FeaturedQuestCard: React.FC<QuestCardProps> = ({ quest }) => {
  const router = useRouter();

  const handlePlayClick = () => {
  if (quest.status !== 'active') return;

  router.push(`/quests/${quest.id}`);
};

  return (
    <div className="quest-card featured">
      {/* картинка */}
      <div className="quest-image">
         <img src={quest.image} alt={quest.title} /> 
      </div>

      {/* текст */}
      <div className="quest-content">
        <h3>{quest.title}</h3>
        <p>{quest.subtitle}</p>
        <button
          className="quest-play-button"
          aria-label="Начать играть"
          onClick={handlePlayClick}
          disabled={quest.status !== 'active'}
        >
          ▶
        </button>
      </div>
    </div>
  );
};