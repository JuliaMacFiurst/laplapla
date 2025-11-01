import { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface Artwork {
  title: string;
  description: string;
  image_url: string[];
}

interface ArtGalleryModalProps {
  categorySlug: string;
  onClose: () => void;
}

const ArtGalleryModal = ({ categorySlug, onClose }: ArtGalleryModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);

  useEffect(() => {
    const fetchArtworks = async () => {
      const { data, error } = await supabase
        .from('artworks')
        .select('title, description, image_url')
        .eq('category_slug', categorySlug);

      const randomArtwork = data && data.length > 0
        ? [data[Math.floor(Math.random() * data.length)]]
        : [];

      if (error) {
        console.error('Ошибка загрузки галереи:', error);
      }

      if (data) {
        setArtworks(
          randomArtwork.map((item) => ({
            ...item,
            image_url: Array.isArray(item.image_url)
              ? item.image_url
              : typeof item.image_url === 'string'
              ? JSON.parse(item.image_url)
              : [],
          }))
        );
      }
    };

    fetchArtworks();
  }, [categorySlug]);

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
        <h2 className="art-gallery-title">Картины великих художников</h2>
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