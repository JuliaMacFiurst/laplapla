import type { CSSProperties } from "react";
import { useQuest1I18n } from "./i18n";

export default function QuestTextBlocks({
  blocks,
  className = "quest-story-text",
  style,
}: {
  blocks: string[][];
  className?: string;
  style?: CSSProperties;
}) {
  const { lang } = useQuest1I18n();
  return (
    <div className={className} style={style} dir={lang === "he" ? "rtl" : "ltr"}>
      {blocks.map((block, blockIndex) => (
        <div className="quest-text-paper" key={blockIndex}>
          <div className="quest-text-inner">
            {block.map((paragraph, paragraphIndex) => (
              <p
                key={paragraphIndex}
                className="quest-p"
                dangerouslySetInnerHTML={{ __html: paragraph }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
