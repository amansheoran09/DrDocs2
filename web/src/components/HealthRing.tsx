// Document Health Score ring — centrepiece of HM-01 / AL-03 (Section 6.1).
// 0 = critical (red), 50 = average (gold), 80+ = well-managed (green).
export function HealthRing({ score, size = 168 }: { score: number; size?: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = clamped >= 80 ? "var(--green)" : clamped >= 50 ? "var(--gold)" : "var(--red)";
  const label =
    clamped >= 80 ? "Well managed" : clamped >= 50 ? "Average" : "Needs attention";

  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.9s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ fontFamily: "var(--font-display)", fontSize: size * 0.3, fontWeight: 800, color }}>
          {clamped}
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          Health Score
        </div>
        <div style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</div>
      </div>
    </div>
  );
}
