import type { CSSProperties } from "react";

export type VehicleType = "sedan" | "suv" | "truck" | "motorcycle";

type VehicleIconProps = {
  type: VehicleType;
  color: string;
  selected: boolean;
  label: string;
  heading: number;
  lengthPx: number;
};

const bodyPaths = {
  sedan: "M30 2C45 2 53 10 54 26L56 100C56 118 46 128 30 128C14 128 4 118 4 100L6 26C7 10 15 2 30 2Z",
  suv: "M30 2C46 2 54 11 55 28L57 99C57 118 47 128 30 128C13 128 3 118 3 99L5 28C6 11 14 2 30 2Z",
  truck: "M8 5h44v73h4v31c0 12-10 19-26 19S4 121 4 109V78h4Z",
  motorcycle: "M30 4c7 0 11 5 11 13v74c0 21-4 33-11 33s-11-12-11-33V17c0-8 4-13 11-13Z",
} as const;

export default function VehicleIcon({
  type,
  color,
  selected,
  label,
  heading,
  lengthPx,
}: VehicleIconProps) {
  const width = type === "truck" ? lengthPx * 0.31 : type === "motorcycle" ? lengthPx * 0.38 : lengthPx * 0.39;
  const style = {
    "--vehicle-color": color,
    width: `${width}px`,
    height: `${lengthPx}px`,
  } as CSSProperties;

  return (
    <div className={`vehicle-marker ${selected ? "is-selected" : ""}`} style={style}>
      <svg
        aria-hidden="true"
        className="vehicle-svg"
        viewBox="0 0 60 130"
        style={{ transform: `rotate(${heading}deg)` }}
      >
        <defs>
          <linearGradient id={`body-${label}`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity=".72" />
            <stop offset=".25" stopColor={color} />
            <stop offset="1" stopColor="#111820" />
          </linearGradient>
          <linearGradient id={`glass-${label}`} x1="0" x2="0" y1="0" y2="1">
            <stop stopColor="#475b6e" />
            <stop offset="1" stopColor="#111820" />
          </linearGradient>
        </defs>
        <g className="vehicle-art">
          {selected && <path className="vehicle-direction-arrow" d="M30 -18v17m0 0-4-5m4 5 4-5" />}
          <rect className="vehicle-tire" height="20" rx="3" width="7" x="0" y="22" />
          <rect className="vehicle-tire" height="20" rx="3" width="7" x="53" y="22" />
          <rect className="vehicle-tire" height="20" rx="3" width="7" x="0" y="86" />
          <rect className="vehicle-tire" height="20" rx="3" width="7" x="53" y="86" />
          <path d={bodyPaths[type]} fill={`url(#body-${label})`} />
          {type === "motorcycle" ? (
            <>
              <path d="M18 34h24l5 22H13l5-22Z" fill={`url(#glass-${label})`} />
              <ellipse cx="30" cy="77" fill="#dbe8ef" opacity=".7" rx="8" ry="14" />
              <circle cx="30" cy="20" fill="#e6f1f5" opacity=".85" r="4" />
              <circle cx="30" cy="111" fill="#ff4d4d" r="3" />
            </>
          ) : type === "truck" ? (
            <>
              <path d="M12 10h36v36H12z" fill={`url(#glass-${label})`} />
              <path d="M12 53h36v49H12z" fill={color} opacity=".42" />
              <path d="M12 106h36v12H12z" fill="#111820" opacity=".55" />
              <path d="M16 8h10M34 8h10" stroke="#fff6c9" strokeWidth="3" />
              <path d="M16 119h10M34 119h10" stroke="#ff4d4d" strokeWidth="3" />
            </>
          ) : (
            <>
              <path d="M13 38C20 32 40 32 47 38L45 52C38 49 22 49 15 52Z" fill={`url(#glass-${label})`} />
              <path d="M15 54C24 51 36 51 45 54L45 90C36 93 24 93 15 90Z" fill="#ffffff" opacity=".24" />
              <path d="M15 92C22 95 38 95 45 92L47 104C40 108 20 108 13 104Z" fill={`url(#glass-${label})`} />
              <ellipse cx="6" cy="40" fill={color} rx="3" ry="2" />
              <ellipse cx="54" cy="40" fill={color} rx="3" ry="2" />
              <path d="M10 8C14 5 20 5 22 7L21 12C17 11 13 12 10 14Z" fill="#fff6c9" />
              <path d="M50 8C46 5 40 5 38 7L39 12C43 11 47 12 50 14Z" fill="#fff6c9" />
              <rect fill="#ff4d4d" height="4" rx="2" width="12" x="9" y="120" />
              <rect fill="#ff4d4d" height="4" rx="2" width="12" x="39" y="120" />
            </>
          )}
        </g>
      </svg>
      <span className="vehicle-label">{label}</span>
    </div>
  );
}
