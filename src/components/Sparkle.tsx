// A small four-point twinkle star — the accent detail from Cody's tattoo,
// used as a category marker and a brand flourish instead of a plain dot.
export function Sparkle({
  className,
  color,
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={color ?? "currentColor"}
      className={className}
      aria-hidden="true"
    >
      <path d="M12 0L14.4 9.6L24 12L14.4 14.4L12 24L9.6 14.4L0 12L9.6 9.6Z" />
    </svg>
  );
}
