import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import TranslationWarning from '@/components/TranslationWarning';
import { getCurrentLang } from '@/lib/i18n/routing';
import { dictionaries, Lang } from '../i18n/index';

interface Artwork {
  id: string;
  title: string;
  description: string;
  image_url: string[];
}

interface ArtGalleryModalProps {
  categorySlug: string;
  onClose: () => void;
}

const ArtGalleryModal = ({ categorySlug, onClose }: ArtGalleryModalProps) => {
  const router = useRouter();
  const lang = getCurrentLang(router);
  const langTyped = lang as Lang;
  const dict = dictionaries[langTyped] || dictionaries['ru'];
  const t = dict.dogs.artGalleryModal;
  const modalRef = useRef<HTMLDivElement>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [isArtworkTranslated, setIsArtworkTranslated] = useState(true);

  useEffect(() => {
    const fetchArtworks = async () => {
      const response = await fetch(`/api/art-gallery?categorySlug=${encodeURIComponent(categorySlug)}&lang=${lang}`);
      const payload = await response.json() as { artwork: Artwork | null; translated: boolean; error?: string };

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load gallery');
      }

      setIsArtworkTranslated(payload.translated);
      setArtworks(payload.artwork ? [payload.artwork] : []);
    };

    fetchArtworks().catch((fetchError) => {
      console.error('Ошибка загрузки галереи:', fetchError);
    });
  }, [categorySlug, lang]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [onClose]);

  return (
    <div className="art-gallery-backdrop">
      <div className="art-gallery-modal" ref={modalRef}>
        <button className="art-gallery-close" onClick={onClose}>
          &times;
        </button>
        <h2 className="art-gallery-title">{t.artGalleryTitle}</h2>
        {!isArtworkTranslated && lang !== 'ru' && <TranslationWarning lang={lang} />}
        {artworks.length > 0 ? (
          artworks.map((artwork, index) => (
            <div key={index} className="art-gallery-card">
              <div className="art-gallery-columns">
                <div className="art-gallery-images">
                  {artwork.image_url.map((url, i) => (
                    <img key={i} src={url} alt={`${artwork.title} ${i + 1}`} className="art-gallery-image" />
                  ))}
                </div>
                <div className="art-gallery-caption">
                  <h3>{artwork.title}</h3>
                  <p>{artwork.description}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="art-gallery-empty">Пока нет подходящих картин для этой темы.</p>
        )}
      </div>
    </div>
  );
};

export default ArtGalleryModal;
