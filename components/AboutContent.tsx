interface AboutContentProps {
  mode: "preview" | "section";
  title: string;
  preview?: string;
  full?: string;
}

function renderFullText(text: string) {
  const blocks = text.split("\n\n");

  return blocks.map((block, i) => {
    if (block.startsWith("### ")) {
      return <h3 key={i}>{block.replace("### ", "")}</h3>;
    }

    if (block.startsWith("— ")) {
      const items = block
        .split("\n")
        .map((line) => line.replace("— ", ""));

      return (
        <ul key={i}>
          {items.map((item, j) => (
            <li key={j}>{item}</li>
          ))}
        </ul>
      );
    }

    return <p key={i}>{block}</p>;
  });
}

export default function AboutContent({
  mode,
  title,
  preview,
  full,
}: AboutContentProps) {
  // Короткая версия для плитки (/about)
  if (mode === "preview") {
    return (
      <div className="about-card-content">
        <h2>{title}</h2>
        <p>{preview}</p>
      </div>
    );
  }

  // Полная версия для страницы секции (/about/[section])
  if (mode === "section") {
    return (
      <div className="about-content">
        <section className="about-section">
          <h2>{title}</h2>
          <p>{preview}</p>
          {full && (
            <div className="about-full-content">
              {renderFullText(full)}
            </div>
          )}
        </section>
      </div>
    );
  }

  return null;
}
