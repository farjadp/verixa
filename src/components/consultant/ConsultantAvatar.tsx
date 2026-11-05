export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const SIZES = {
  sm: "h-10 w-10 rounded-xl text-sm",
  md: "h-16 w-16 rounded-2xl text-xl",
  lg: "h-28 w-28 rounded-3xl text-3xl md:h-36 md:w-36 md:text-4xl",
} as const;

/** Real photo when the consultant uploaded one, otherwise brand-gradient initials. */
export default function ConsultantAvatar({
  name,
  src,
  size = "md",
  className = "",
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const base = `${SIZES[size]} shrink-0 overflow-hidden ${className}`;
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={`Portrait of ${name}`} className={`${base} object-cover`} />;
  }
  return (
    <div
      aria-hidden="true"
      className={`${base} flex items-center justify-center bg-gradient-to-br from-navy to-teal font-bold text-white`}
    >
      {initials(name)}
    </div>
  );
}
