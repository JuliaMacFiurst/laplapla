interface SlideTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SlideTextEditor({
  value,
  onChange,
}: SlideTextEditorProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Введите текст..."
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
