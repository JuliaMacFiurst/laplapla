import Image from "next/image";

interface AboutContentProps {
  mode: "preview" | "section";
  title: string;
  preview?: string;
  full?: string;
  icon?: string;
  image?: string;
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
  icon,
  image,
}: AboutContentProps) {
  // Короткая версия для плитки (/about)
  if (mode === "preview") {
    return (
      <div className="about-card-content">
        <div className="about-card-text">
          <h2>{title}</h2>
          <p>{preview}</p>
        </div>
        {icon && (
          <Image
            src={icon}
            alt=""
            className="about-card-sticker"
            width={140}
            height={140}
            unoptimized
          />
        )}
      </div>
    );
  }

  // Полная версия для страницы секции (/about/[section])
  if (mode === "section") {
    return (
      <div className="about-content">
        <section className="about-section">
          <h2>{title}</h2>
          {image && (
            <div className="about-author-image">
              <Image src={image} alt={title} width={420} height={420} unoptimized />
            </div>
          )}
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
