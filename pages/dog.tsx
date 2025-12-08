// /pages/dog.tsx



const categories = [
  { name: 'Мультяшные персонажи', slug: 'cartoon-characters' },
  { name: 'Каваийные милашки', slug: 'kawaii' },
  { name: 'Сцены природы', slug: 'nature-scenes' },
  { name: 'Ботанические композиции', slug: 'botanical' },
  { name: 'Дессерты', slug: 'desserts' },
  { name: 'Знаки Зодиака', slug: 'zodiac' },
  { name: 'Лица', slug: 'faces' },
  { name: 'Наряды', slug: 'outfits' },
  { name: 'Мандала', slug: 'mandala' },
  { name: 'Фигуры в движении', slug: 'motion' },
  { name: 'Динозавры', slug: 'dinosaurs' },
  { name: 'Животные', slug: 'animals' },
  { name: 'Мемы и брейнроты', slug: 'memes' },
  { name: 'Аниме лица', slug: 'anime-faces' },
  { name: 'Рисование рук', slug: 'hands' },
  { name: 'Городские пейзажи', slug: 'cityscapes' },
];

const categoryIcons = [
  'cartoon.webp',
  'kawaii.webp',
  'nature.webp',
  'botanic.webp',
  'dessert.webp',
  'zodiac.webp',
  'faces.webp',
  'outfits.webp',
  'mandala.webp',
  'motion.webp',
  'dino.webp',
  'animals.webp',
  'memes.webp',
  'anime.webp',
  'hands.webp',
  'city.webp',
];

export default function DogPage() {
  return (
    <main>
      <div className="dog-header-container">
        <img src="/dog/frank.webp" alt="Фрэнк" className="dog-header-image" />
        <div className="dog-header-wrapper">
          <h1 className="dog-page-title page-title">Пёсики нарисуют</h1>
          <h2 className="dog-page-subtitle">Что ты хочешь нарисовать сегодня?</h2>
        </div>
        <img src="/dog/fibi.webp" alt="Фиби" className="dog-header-image" />
      </div>

      <div className="dog-category-grid">
        {categories.map((cat, index) => (
          <button
            key={cat.slug}
            onClick={() => window.location.href = `/dog/lessons?category=${cat.slug}`}
            className={`dog-category-button dog-category-color-${(index % 8) + 1}`}
          >
            <img src={`/icons/drawing-lessons-icons/${categoryIcons[index]}`} alt={cat.name} className="dog-category-icon" />
            <span>{cat.name}</span>
          </button>
        ))}
      </div>
    </main>
  );
}