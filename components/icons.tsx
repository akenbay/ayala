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
    <circle cx="13" cy="13" r="12" fill="#FFB41D" />
    <path d="M8 15c1.5 2 3 3 5 3s3.5-1 5-3" fill="none" stroke="#1C1608" strokeWidth="2" strokeLinecap="round" />
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

/** Lightning bolt: "Help me now". */
export const Bolt = (p: P) => (
  <Svg {...p}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
  </Svg>
);

/** Bookmark: save a phrase. */
export const Bookmark = (p: P) => (
  <Svg {...p}>
    <path d="M6 3h12v18l-6-4-6 4V3Z" />
  </Svg>
);

export const Mic = (p: P) => (
  <Svg {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0" />
    <path d="M12 18v3" />
  </Svg>
);

/** Simple line drawings for the newer stories, keyed by story id. */
const STORY_PATHS: Partial<Record<ScenarioId, React.ReactNode>> = {
  screen_time: (<><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M8 21h8M12 17v4" /></>),
  getting_dressed: (<path d="M8 3 4 6l2 4 2-1v12h8V9l2 1 2-4-4-3c0 2-2 3-4 3S8 5 8 3Z" />),
  car_seat: (<><path d="M5 17h14l-1.5-6.5A2 2 0 0 0 15.6 9H8.4a2 2 0 0 0-1.9 1.5Z" /><circle cx="8" cy="17.5" r="1.8" /><circle cx="16" cy="17.5" r="1.8" /></>),
  bath_time: (<><path d="M3 12h18v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5Z" /><path d="M6 12V6a2 2 0 0 1 4 0" /><path d="M7 19l-1 2M17 19l1 2" /></>),
  brushing_teeth: (<path d="M7 3c-2 0-3 2-3 4 0 3 1 5 2 8 .5 2 1 6 2.5 6S10 17 12 17s2 4 3.5 4S17 17 18 15c1-3 2-5 2-8 0-2-1-4-3-4-2 0-3 1-5 1S9 3 7 3Z" />),
  dinner_table: (<><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="3.5" /><path d="M2 5v6M22 5v14" /></>),
  store_candy: (<><path d="M3 4h2l2.5 11h10L20 7H6.2" /><circle cx="9" cy="19" r="1.5" /><circle cx="17" cy="19" r="1.5" /></>),
  sharing_toys: (<><rect x="3" y="11" width="7" height="7" rx="1" /><rect x="14" y="11" width="7" height="7" rx="1" /><path d="M8 7h8M13 4l3 3-3 3" /></>),
  cleanup_toys: (<><path d="M4 9h16l-1.5 11h-13Z" /><path d="M9 9V6h6v3" /></>),
  daycare_dropoff: (<><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-5h4v5" /></>),
  work_call: (<><rect x="4" y="5" width="16" height="11" rx="1.5" /><path d="M2 19h20" /><circle cx="12" cy="10" r="2" /></>),
  running_off: (<><circle cx="14" cy="4.5" r="2" /><path d="m7 21 3-6 3 2v4M10 15l1-6 4 3 3 1M11 9 7 10l-1 3" /></>),
};

export function ScenarioIcon({ id, size = 30 }: { id: ScenarioId; size?: number }) {
  const story = STORY_PATHS[id];
  if (story)
    return (
      <Svg size={size} width={1.8}>
        {story}
      </Svg>
    );
  if (id === "custom")
    return (
      <Svg size={size} width={1.8}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
      </Svg>
    );
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
