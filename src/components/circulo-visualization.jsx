import { useState, useEffect, useRef } from "react";

const PEOPLE = [
  // Íntimos (inner circle)
  { id: 1, name: "Ana", initials: "AN", circle: 0, angle: 300, post: { type: "need", text: "preciso de carona hoje à noite" } },
  { id: 2, name: "Rafa", initials: "RA", circle: 0, angle: 60, post: { type: "dream", text: "quero abrir uma cafeteria" } },
  { id: 3, name: "Leo", initials: "LE", circle: 0, angle: 180, post: null },

  // Amigos (middle circle)
  { id: 4, name: "Mari", initials: "MA", circle: 1, angle: 30, post: { type: "role", text: "show sexta, quem topa?" } },
  { id: 5, name: "João", initials: "JO", circle: 1, angle: 130, post: null },
  { id: 6, name: "Bea", initials: "BE", circle: 1, angle: 220, post: { type: "project", text: "lançando meu podcast" } },
  { id: 7, name: "Cris", initials: "CR", circle: 1, angle: 330, post: null },

  // Conhecidos (outer circle)
  { id: 8, name: "Bia", initials: "BI", circle: 2, angle: 20, post: null },
  { id: 9, name: "Teo", initials: "TE", circle: 2, angle: 90, post: { type: "need", text: "procuro personal trainer" } },
  { id: 10, name: "Lu", initials: "LU", circle: 2, angle: 160, post: null },
  { id: 11, name: "Gus", initials: "GU", circle: 2, angle: 240, post: null },
  { id: 12, name: "Pam", initials: "PA", circle: 2, angle: 310, post: { type: "role", text: "expo de arte domingo" } },
];

const RADII = [110, 185, 265];
const AVATAR_SIZES = [26, 22, 18];

const POST_STYLES = {
  need:    { bg: "#FFF0E6", border: "#F4956A", label: "precisa", dot: "#F4956A" },
  dream:   { bg: "#EEF0FF", border: "#8B8FF8", label: "sonho",   dot: "#8B8FF8" },
  role:    { bg: "#E8F9F2", border: "#4DC68B", label: "rolê",    dot: "#4DC68B" },
  project: { bg: "#FFF8E6", border: "#F0BA3A", label: "projeto", dot: "#F0BA3A" },
};

// CSS keyframes injetadas uma vez no head
const PULSE_CSS = `
@keyframes pulseRing {
  0%   { r: 0; opacity: 0.7; }
  100% { r: 38; opacity: 0; }
}
.pulse-ring {
  animation: pulseRing 2s ease-out infinite;
  transform-origin: center;
}
.pulse-ring-2 {
  animation: pulseRing 2s ease-out infinite 0.7s;
}
.pulse-ring-3 {
  animation: pulseRing 2s ease-out infinite 1.4s;
}
`;

const CIRCLE_COLORS = [
  { ring: "#E8C87A", ringOpacity: 0.9,  fill: "#FFFBF0", label: "íntimos"    },
  { ring: "#7ACFB8", ringOpacity: 0.75, fill: "#F0FBF7", label: "amigos"     },
  { ring: "#A89FE8", ringOpacity: 0.6,  fill: "#F5F3FF", label: "conhecidos" },
];

function toRad(deg) { return (deg * Math.PI) / 180; }

function getPos(angle, radius) {
  return {
    x: Math.cos(toRad(angle - 90)) * radius,
    y: Math.sin(toRad(angle - 90)) * radius,
  };
}

export default function CirculoViz() {
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [mounted, setMounted] = useState(false);
  const svgRef = useRef(null);

  useEffect(() => {
    // Injeta CSS de animação
    if (!document.getElementById("circulo-pulse-css")) {
      const style = document.createElement("style");
      style.id = "circulo-pulse-css";
      style.textContent = PULSE_CSS;
      document.head.appendChild(style);
    }
    setTimeout(() => setMounted(true), 50);
  }, []);

  const cx = 300, cy = 300;
  const active = selected ?? hovered;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#FAFAF8",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      padding: "24px 16px",
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24, textAlign: "center" }}>
        <div style={{ fontSize: 28, fontWeight: 400, letterSpacing: "0.12em", color: "#2A2A2A" }}>
          círculo
        </div>
        <div style={{ fontSize: 13, color: "#999", letterSpacing: "0.05em", marginTop: 4, fontFamily: "sans-serif" }}>
          sua rede de apoio
        </div>
      </div>

      {/* SVG Canvas */}
      <div style={{ position: "relative" }}>
        <svg
          ref={svgRef}
          width={600}
          height={600}
          viewBox="0 0 600 600"
          style={{ overflow: "visible", maxWidth: "100%", height: "auto" }}
        >
          <defs>
            {CIRCLE_COLORS.map((c, i) => (
              <radialGradient key={i} id={`grad${i}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={c.fill} stopOpacity="0.6" />
                <stop offset="100%" stopColor={c.fill} stopOpacity="0" />
              </radialGradient>
            ))}
            <filter id="soft-shadow">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#00000018" />
            </filter>
            <filter id="glow">
              <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#E8C87A" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Circle fills */}
          {[2, 1, 0].map(i => (
            <circle
              key={`fill-${i}`}
              cx={cx} cy={cy}
              r={RADII[i] + AVATAR_SIZES[i] + 10}
              fill={`url(#grad${i})`}
              style={{
                opacity: mounted ? 1 : 0,
                transition: `opacity 0.8s ease ${i * 0.15}s`,
              }}
            />
          ))}

          {/* Circle rings */}
          {CIRCLE_COLORS.map((c, i) => (
            <circle
              key={`ring-${i}`}
              cx={cx} cy={cy}
              r={RADII[i]}
              fill="none"
              stroke={c.ring}
              strokeWidth={i === 0 ? 2 : 1.5}
              strokeOpacity={c.ringOpacity}
              strokeDasharray={i === 2 ? "5 4" : i === 1 ? "none" : "none"}
              style={{
                opacity: mounted ? 1 : 0,
                transition: `opacity 0.6s ease ${0.2 + i * 0.15}s`,
              }}
            />
          ))}

          {/* Circle labels */}
          {CIRCLE_COLORS.map((c, i) => (
            <text
              key={`label-${i}`}
              x={cx}
              y={cy - RADII[i] + 14}
              textAnchor="middle"
              fontSize={10}
              fill={c.ring}
              fontFamily="sans-serif"
              letterSpacing="0.08em"
              style={{
                opacity: mounted ? 0.85 : 0,
                transition: `opacity 0.6s ease ${0.4 + i * 0.1}s`,
              }}
            >
              {c.label}
            </text>
          ))}

          {/* Connector lines to active post */}
          {PEOPLE.filter(p => p.post).map(p => {
            const pos = getPos(p.angle, RADII[p.circle]);
            const isActive = active?.id === p.id;
            return (
              <line
                key={`line-${p.id}`}
                x1={cx + pos.x}
                y1={cy + pos.y}
                x2={cx + pos.x + (pos.x > 0 ? 50 : -50)}
                y2={cy + pos.y + (pos.y > 0 ? 30 : -30)}
                stroke={POST_STYLES[p.post.type].border}
                strokeWidth={1}
                strokeOpacity={isActive ? 0.6 : 0.25}
                strokeDasharray="3 3"
                style={{ transition: "stroke-opacity 0.2s" }}
              />
            );
          })}

          {/* Person avatars */}
          {PEOPLE.map((p, idx) => {
            const pos = getPos(p.angle, RADII[p.circle]);
            const r = AVATAR_SIZES[p.circle];
            const isActive = active?.id === p.id;
            const cc = CIRCLE_COLORS[p.circle];
            const delay = 0.5 + idx * 0.06;

            return (
              <g
                key={p.id}
                transform={`translate(${cx + pos.x}, ${cy + pos.y})`}
                style={{
                  cursor: "pointer",
                  opacity: mounted ? 1 : 0,
                  transition: `opacity 0.4s ease ${delay}s`,
                }}
                onClick={() => setSelected(selected?.id === p.id ? null : p)}
                onMouseEnter={() => setHovered(p)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Pulse rings — aparecem quando a pessoa tem um pulso */}
                {p.post && (
                  <>
                    <circle
                      cx={0} cy={0} r={0}
                      fill="none"
                      stroke={POST_STYLES[p.post.type].dot}
                      strokeWidth={1.5}
                      strokeOpacity={0.5}
                      className="pulse-ring"
                    />
                    <circle
                      cx={0} cy={0} r={0}
                      fill="none"
                      stroke={POST_STYLES[p.post.type].dot}
                      strokeWidth={1}
                      strokeOpacity={0.3}
                      className="pulse-ring pulse-ring-2"
                    />
                  </>
                )}
                {/* Pulso indicator dot */}
                {p.post && (
                  <circle
                    cx={r - 4} cy={-(r - 4)}
                    r={5}
                    fill={POST_STYLES[p.post.type].dot}
                    stroke="#FAFAF8"
                    strokeWidth={1.5}
                  />
                )}
                {/* Avatar circle */}
                <circle
                  r={r}
                  fill={isActive ? cc.ring : cc.fill}
                  stroke={cc.ring}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  filter={isActive ? "url(#soft-shadow)" : "none"}
                  style={{ transition: "all 0.2s ease" }}
                />
                {/* Initials */}
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={r * 0.72}
                  fontFamily="sans-serif"
                  fontWeight="500"
                  fill={isActive ? "#FFF" : "#444"}
                  style={{ pointerEvents: "none", transition: "fill 0.2s" }}
                >
                  {p.initials}
                </text>
                {/* Name label */}
                <text
                  y={r + 13}
                  textAnchor="middle"
                  fontSize={9}
                  fontFamily="sans-serif"
                  fill="#888"
                  style={{ pointerEvents: "none" }}
                >
                  {p.name}
                </text>
              </g>
            );
          })}

          {/* Post bubbles */}
          {PEOPLE.filter(p => p.post).map(p => {
            const pos = getPos(p.angle, RADII[p.circle]);
            const isActive = active?.id === p.id;
            const style = POST_STYLES[p.post.type];
            const bx = cx + pos.x + (pos.x > 0 ? 52 : -52);
            const by = cy + pos.y + (pos.y > 0 ? 28 : -38);
            const bw = 110, bh = 36;

            return (
              <g
                key={`bubble-${p.id}`}
                style={{
                  opacity: isActive ? 1 : 0.3,
                  transition: "opacity 0.25s ease",
                  pointerEvents: "none",
                }}
              >
                <rect
                  x={bx - bw / 2} y={by - bh / 2}
                  width={bw} height={bh}
                  rx={8}
                  fill={style.bg}
                  stroke={style.border}
                  strokeWidth={1}
                />
                <text
                  x={bx}
                  y={by - 6}
                  textAnchor="middle"
                  fontSize={8}
                  fontFamily="sans-serif"
                  fontWeight="600"
                  fill={style.border}
                  letterSpacing="0.06em"
                >
                  PULSO · {style.label.toUpperCase()}
                </text>
                <text
                  x={bx}
                  y={by + 8}
                  textAnchor="middle"
                  fontSize={8.5}
                  fontFamily="sans-serif"
                  fill="#444"
                >
                  {p.post.text.length > 18 ? p.post.text.slice(0, 18) + "…" : p.post.text}
                </text>
              </g>
            );
          })}

          {/* Center — você */}
          <g
            style={{
              opacity: mounted ? 1 : 0,
              transition: "opacity 0.5s ease 0.3s",
            }}
          >
            <circle cx={cx} cy={cy} r={32} fill="#2A2A2A" filter="url(#glow)" />
            <circle cx={cx} cy={cy} r={32} fill="#2A2A2A" />
            <text
              x={cx} y={cy - 4}
              textAnchor="middle"
              fontSize={9}
              fontFamily="sans-serif"
              letterSpacing="0.12em"
              fill="#E8C87A"
            >
              VOCÊ
            </text>
            <circle cx={cx} cy={cy + 10} r={3} fill="#E8C87A" opacity={0.6} />
          </g>
        </svg>

        {/* Legend */}
        <div style={{
          position: "absolute",
          bottom: 8,
          right: 0,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}>
          <span style={{ fontSize: 9, color: "#CCC", fontFamily: "sans-serif", letterSpacing: "0.08em" }}>PULSOS</span>
          {Object.entries(POST_STYLES).map(([key, s]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: s.dot,
              }} />
              <span style={{ fontSize: 10, color: "#999", fontFamily: "sans-serif" }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom hint */}
      <div style={{
        marginTop: 16,
        fontSize: 11,
        color: "#BBB",
        fontFamily: "sans-serif",
        letterSpacing: "0.04em",
      }}>
        toque em alguém para ver o pulso dela
      </div>

      {/* Detail card */}
      {selected && selected.post && (
        <div style={{
          marginTop: 20,
          background: "#FFF",
          border: `1.5px solid ${POST_STYLES[selected.post.type].border}`,
          borderRadius: 14,
          padding: "16px 24px",
          maxWidth: 300,
          width: "100%",
          boxShadow: "0 4px 20px #0000000A",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: POST_STYLES[selected.post.type].border,
              fontFamily: "sans-serif",
            }}>
              {POST_STYLES[selected.post.type].label.toUpperCase()}
            </span>
            <span style={{ fontSize: 11, color: "#BBB", fontFamily: "sans-serif" }}>
              {selected.name} · {["íntimos", "amigos", "conhecidos"][selected.circle]}
            </span>
          </div>
          <p style={{ fontSize: 15, color: "#2A2A2A", margin: 0, fontStyle: "italic" }}>
            "{selected.post.text}"
          </p>
        </div>
      )}

      {selected && !selected.post && (
        <div style={{
          marginTop: 20,
          background: "#FFF",
          border: "1px solid #EEE",
          borderRadius: 14,
          padding: "14px 24px",
          maxWidth: 300,
          width: "100%",
          textAlign: "center",
        }}>
          <p style={{ fontSize: 13, color: "#AAA", margin: 0, fontFamily: "sans-serif" }}>
            {selected.name} ainda não criou um pulso
          </p>
        </div>
      )}
    </div>
  );
}
