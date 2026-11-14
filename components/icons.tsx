import type { ScenarioId } from "@/lib/scenarios";

type P = { size?: number; className?: string; stroke?: string };

function Svg({ size = 20, className, stroke = "currentColor", width = 2, children }: P & { width?: number; children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export const Logo = ({ size = 26 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true">
    <circle cx="13" cy="13" r="12" fill="#F28705" />
    <path d="M8 15c1.5 2 3 3 5 3s3.5-1 5-3" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const ChevronRight = (p: P) => (
  <Svg {...p}>
    <path d="M9 6l6 6-6 6" />
  </Svg>
);
export const ChevronDown = (p: P) => (
  <Svg {...p} width={2.2}>
    <path d="M6 9l6 6 6-6" />
  </Svg>
);
export const Back = (p: P) => (
  <Svg {...p} width={2.2}>
    <path d="M15 6l-6 6 6 6" />
  </Svg>
);
export const Arrow = (p: P) => (
  <Svg {...p} width={2.2}>
    <path d="M5 12h14" />
    <path d="M13 6l6 6-6 6" />
  </Svg>
);
export const ArrowUp = (p: P) => (
  <Svg {...p} width={2.2}>
    <path d="M12 19V5" />
    <path d="M6 11l6-6 6 6" />
  </Svg>
);
export const ArrowDown = (p: P) => (
  <Svg {...p} width={2.2}>
    <path d="M12 5v14" />
    <path d="M6 13l6 6 6-6" />
  </Svg>
);
export const Check = (p: P) => (
  <Svg {...p} width={3}>
    <path d="M5 12l5 5 9-10" />
  </Svg>
);
export const Bars = (p: P) => (
  <Svg {...p}>
    <path d="M4 19V10" />
    <path d="M10 19V5" />
    <path d="M16 19v-6" />
    <path d="M22 19H2" />
  </Svg>
);
export const Info = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 8h.01" />
  </Svg>
);
export const Bell = (p: P) => (
  <Svg {...p}>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </Svg>
);
export const Calendar = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M16 3v4" />
    <path d="M8 3v4" />
    <path d="M3 11h18" />
  </Svg>
);
export const Chat = (p: P) => (
  <Svg {...p} width={1.8}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <path d="M8 9h8" />
    <path d="M8 13h5" />
  </Svg>
);

export function ScenarioIcon({ id, size = 30 }: { id: ScenarioId; size?: number }) {
  if (id === "bedtime_refusal")
    return (
      <Svg size={size} width={1.8}>
        <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
      </Svg>
    );
  if (id === "hitting_sibling")
    return (
      <Svg size={size} width={1.8}>
        <circle cx="8" cy="6" r="2.5" />
        <circle cx="17" cy="8" r="2" />
        <path d="M4 20v-4a4 4 0 0 1 8 0v4" />
        <path d="M14 20v-3a3 3 0 0 1 6 0v3" />
      </Svg>
    );
  return (
    <Svg size={size} width={1.8}>
      <path d="M5 21V8" />
      <path d="M5 8h5" />
      <path d="M10 8v3" />
      <path d="M10 11c3 0 4 2 5 5s2 5 5 5" />
      <path d="M3 21h18" />
      <path d="M5 13h5" />
    </Svg>
  );
}
