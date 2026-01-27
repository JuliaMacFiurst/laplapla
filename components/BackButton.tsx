import { useRouter } from "next/router";

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="back-button"
      onClick={() => router.back()}
      aria-label="Go back"
    >
      🔙
    </button>
  );
}
