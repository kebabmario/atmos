import { useId } from "react";

const CLOUD = "M7.5 19A3.5 3.5 0 0 1 7.8 12A5 5 0 0 1 17.8 12.2A3.4 3.4 0 0 1 17.8 19Z";

/* The atmos mark: a line cloud with the sun set just behind it. */
export function Logo({ size = 22 }: { size?: number }) {
  const mask = `${useId().replace(/:/g, "")}cloud`;

  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="logo">
      <mask id={mask}>
        <rect width="24" height="24" fill="#fff" />
        {/* the cloud cuts the sun with a small gap, so the two read as layers */}
        <path d={CLOUD} fill="#000" stroke="#000" strokeWidth="4" strokeLinejoin="round" />
      </mask>
      <circle cx="17" cy="7.4" r="4.4" fill="var(--sun)" mask={`url(#${mask})`} />
      <path
        d={CLOUD}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
