/**
 * TrailSnack emblem: concentric topographic contours with a north tick,
 * drawn in currentColor so it follows every mode palette.
 */
export default function Emblem({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M16 29c7.2 0 13-5.8 13-13S23.2 3 16 3 3 8.8 3 16s5.8 13 13 13Z" opacity="0.9" />
      <path d="M9.5 18.5c-.6-4.2 2.6-8 6.8-8.4 4.1-.4 7.7 2.7 7.5 6.8-.2 3.6-3.4 6.3-7 6.1-3.3-.2-6.8-1.4-7.3-4.5Z" />
      <path d="M12.6 17.6c-.2-2.2 1.6-4.2 3.9-4.3 2.2-.1 4 1.6 3.9 3.8-.1 1.9-1.9 3.3-3.8 3.2-1.8-.1-3.8-1-4-2.7Z" />
      <path d="M16 3v3.5" strokeWidth="2.4" />
      <path d="M6.5 22.5c2.5-.8 5.3-.4 7.5 1" opacity="0.7" />
    </svg>
  );
}
