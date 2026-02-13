import { dictionaries, type Lang } from "@/i18n";

interface SlideTextEditorProps {
  lang: Lang;
  value: string;
  onChange: (value: string) => void;
}

export default function SlideTextEditor({
  lang,
  value,
  onChange,
}: SlideTextEditorProps) {
  const t = dictionaries[lang].cats.studio
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={t.textPlaceholder}
      style={{
        width: 360,
        height: 100,
        padding: 8,
        borderRadius: 8,
        border: "1px solid #ccc",
        fontFamily: "'Amatic SC', cursive",
      }}
    />
  );
}
