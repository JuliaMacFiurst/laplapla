// components/Navigation/HomeButton.tsx
import { useRouter } from "next/router";

export default function HomeButton() {
  const router = useRouter();

  return (
    <button
      className="home-button"
      onClick={() => router.push("/")}
      aria-label="Home"
    >
      🏠
    </button>
  );
}