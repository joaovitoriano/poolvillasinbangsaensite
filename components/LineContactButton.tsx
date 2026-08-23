import Image from "next/image";

export function LineContactButton({ href, locale }: { href: string; locale: "en" | "th" }) {
  const label = locale === "th" ? "ติดต่อเราทาง LINE" : "Contact us on LINE";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="fixed z-50 block size-12 overflow-hidden rounded-[22%] shadow-[0_10px_28px_rgba(0,50,35,.28)] transition-shadow hover:shadow-[0_14px_32px_rgba(0,50,35,.36)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#07334a] focus-visible:ring-offset-3 sm:size-14"
      style={{
        right: "max(1rem, env(safe-area-inset-right))",
        bottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
    >
      <Image src="/line-brand-icon.png" alt="" aria-hidden="true" width={48} height={48} className="size-full" />
    </a>
  );
}
