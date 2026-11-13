/**
 * TrailSnack emblem: a bramble sprig — one arching cane, two leaves and a
 * cluster of three berries. The sprig draws in currentColor; the berries take
 * the cloudberry accent so the mark follows every mode palette.
 */
export default function Emblem({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {/* Cane */}
      <path d="M7 29c.6-8 4.6-14.600 13-19" />
      {/* Tip leaf with midrib */}
      <path d="M20 10c-.4-4.200 2.800-7.600 8.500-7.500.3 5.400-3 8.700-8.500 7.500Z" />
      <path d="M20 10l5.200-4.600" strokeWidth="1.1" opacity="0.7" />
      {/* Side leaf */}
      <path d="M11.600 18.200c-4.300.6-7.600-2-8.300-6.700 4.700-.5 7.900 2.200 8.300 6.700Z" />
      <path d="M11.600 18.200 6.400 13.900" strokeWidth="1.1" opacity="0.7" />
      {/* Berry stalks */}
      <path d="M14.200 14.600c1.900.2 3.300 1 4.200 2.300M10.300 21.400c1.600.3 2.800 1 3.600 2M20.500 21.300l1.700 1.800" strokeWidth="1.2" />
      {/* Berries */}
      <g stroke="none" fill="var(--color-amber)">
        <circle cx="20.300" cy="19.200" r="3.300" />
        <circle cx="15.600" cy="25.200" r="3" />
        <circle cx="24" cy="25.400" r="2.700" />
      </g>
      <g stroke="none" fill="var(--color-ink)" opacity="0.75">
        <circle cx="19.200" cy="18" r="0.800" />
        <circle cx="14.600" cy="24.100" r="0.700" />
        <circle cx="23.100" cy="24.400" r="0.650" />
      </g>
    </svg>
  );
}
