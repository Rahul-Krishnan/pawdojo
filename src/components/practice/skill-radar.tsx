"use client";

type SkillData = {
  name: string;
  score: number; // 0-1, combined from avg rating + completion %
};

export function SkillRadar({ skills }: { skills: SkillData[] }) {
  const n = skills.length;
  if (n < 3) return null;

  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 40; // leave room for labels

  // Generate points for each ring and each skill axis
  function polarToXY(angle: number, radius: number): [number, number] {
    return [
      cx + radius * Math.cos(angle - Math.PI / 2),
      cy + radius * Math.sin(angle - Math.PI / 2),
    ];
  }

  const angleStep = (2 * Math.PI) / n;

  // Background rings at 25%, 50%, 75%, 100%
  const rings = [0.25, 0.5, 0.75, 1.0];

  // Skill polygon points
  const skillPoints = skills.map((skill, i) => {
    const angle = i * angleStep;
    const r = skill.score * maxR;
    return polarToXY(angle, r);
  });

  const polygonPath =
    skillPoints.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ") + " Z";

  // Perfect score polygon (all 1.0)
  const perfectPoints = skills.map((_, i) => {
    const angle = i * angleStep;
    return polarToXY(angle, maxR);
  });
  const perfectPath =
    perfectPoints.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ") + " Z";

  return (
    <div className="flex justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background rings */}
        {rings.map((ring) => {
          const ringPoints = skills.map((_, i) => {
            const angle = i * angleStep;
            return polarToXY(angle, ring * maxR);
          });
          const ringPath =
            ringPoints.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ") + " Z";
          return (
            <path
              key={ring}
              d={ringPath}
              fill="none"
              stroke="currentColor"
              className="text-gray-200 dark:text-gray-700"
              strokeWidth={ring === 1.0 ? 1.5 : 0.75}
            />
          );
        })}

        {/* Axis lines */}
        {skills.map((_, i) => {
          const [x, y] = polarToXY(i * angleStep, maxR);
          return (
            <line
              key={`axis-${i}`}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="currentColor"
              className="text-gray-200 dark:text-gray-700"
              strokeWidth={0.75}
            />
          );
        })}

        {/* Perfect score outline (subtle) */}
        <path
          d={perfectPath}
          fill="none"
          stroke="currentColor"
          className="text-primary-200 dark:text-primary-800"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />

        {/* Score polygon */}
        <path
          d={polygonPath}
          className="fill-primary-500/20 dark:fill-primary-400/15 stroke-primary-500 dark:stroke-primary-400"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Score dots */}
        {skillPoints.map(([x, y], i) => (
          <circle
            key={`dot-${i}`}
            cx={x}
            cy={y}
            r={4}
            className="fill-primary-500 dark:fill-primary-400"
          />
        ))}

        {/* Labels */}
        {skills.map((skill, i) => {
          const angle = i * angleStep;
          const labelR = maxR + 22;
          const [lx, ly] = polarToXY(angle, labelR);

          // Determine text-anchor based on position
          const normalizedAngle = angle - Math.PI / 2;
          const cos = Math.cos(normalizedAngle);
          let anchor: "start" | "middle" | "end" = "middle";
          if (cos > 0.3) anchor = "start";
          else if (cos < -0.3) anchor = "end";

          return (
            <text
              key={`label-${i}`}
              x={lx}
              y={ly}
              textAnchor={anchor}
              dominantBaseline="central"
              className="fill-gray-600 dark:fill-gray-400 text-[10px] font-medium"
            >
              {skill.name}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
