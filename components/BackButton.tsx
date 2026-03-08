import { useRouter } from "next/router";

type BackButtonProps = {
  href?: string;
};

export default function BackButton({ href }: BackButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      className="back-button"
      onClick={() => {
        if (href) {
          router.push(href);
        } else {
          router.back();
        }
      }}
      aria-label="Go back"
    >
      🔙
    </button>
  );
}
