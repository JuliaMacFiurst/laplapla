interface AboutContentProps {
  mode: "preview" | "section";
  title: string;
  text: string;
}

export default function AboutContent({
  mode,
  title,
  text,
}: AboutContentProps) {
  // Короткая версия для плитки (/about)
  if (mode === "preview") {
    return (
      <div className="about-card-content">
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    );
  }

  // Полная версия для страницы секции (/about/[section])
  if (mode === "section") {
    return (
      <div className="about-content">
        <section className="about-section">
          <h2>{title}</h2>
          <p>{text}</p>
        </section>
      </div>
    );
  }

  return null;
}
