"use client";

type SkillData = {
  name: string;
  score: number; // 0-1, combined from avg rating + completion %
};

// Abbreviate long skill names for the radar
function abbreviate(name: string): string {
  const map: Record<string, string> = {
    "Loose Leash Walking": "Leash",
    "Come (Recall)": "Recall",
    "Focus (Watch Me)": "Focus",
    "Polite Greetings": "Greetings",
  };
  return map[name] ?? name;
}

export function SkillRadar({ skills }: { skills: SkillData[] }) {
  const n = skills.length;
  if (n < 3) return null;

  // Use a large internal viewBox with generous padding for labels
  const padding = 60;
  const chartR = 100; // radius of the chart area
  const viewSize = (chartR + padding) * 2;
  const cx = viewSize / 2;
  const cy = viewSize / 2;

  function polarToXY(angle: number, radius: number): [number, number] {
    return [
      cx + radius * Math.cos(angle - Math.PI / 2),
      cy + radius * Math.sin(angle - Math.PI / 2),
    ];
  }

  const angleStep = (2 * Math.PI) / n;
  const rings = [0.25, 0.5, 0.75, 1.0];

  const skillPoints = skills.map((skill, i) => {
    const angle = i * angleStep;
    const r = skill.score * chartR;
    return polarToXY(angle, r);
  });

  const polygonPath =
    skillPoints.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ") + " Z";

  const perfectPoints = skills.map((_, i) => {
    const angle = i * angleStep;
    return polarToXY(angle, chartR);
  });
  const perfectPath =
    perfectPoints.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ") + " Z";

  return (
    <div className="flex justify-center">
      <svg
        width="100%"
        viewBox={`0 0 ${viewSize} ${viewSize}`}
        className="max-w-[340px]"
      >
        {/* Background rings */}
        {rings.map((ring) => {
          const ringPoints = skills.map((_, i) => {
            const angle = i * angleStep;
            return polarToXY(angle, ring * chartR);
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
              strokeWidth={ring === 1.0 ? 1 : 0.5}
            />
          );
        })}

        {/* Axis lines */}
        {skills.map((_, i) => {
          const [x, y] = polarToXY(i * angleStep, chartR);
          return (
            <line
              key={`axis-${i}`}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="currentColor"
              className="text-gray-200 dark:text-gray-700"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Perfect score outline */}
        <path
          d={perfectPath}
          fill="none"
          stroke="currentColor"
          className="text-primary-200 dark:text-primary-800"
          strokeWidth={1}
          strokeDasharray="3 2"
        />

        {/* Score polygon */}
        <path
          d={polygonPath}
          className="fill-primary-500/20 dark:fill-primary-400/15 stroke-primary-500 dark:stroke-primary-400"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />

        {/* Score dots */}
        {skillPoints.map(([x, y], i) => (
          <circle
            key={`dot-${i}`}
            cx={x}
            cy={y}
            r={2.5}
            className="fill-primary-500 dark:fill-primary-400"
          />
        ))}

        {/* Labels */}
        {skills.map((skill, i) => {
          const angle = i * angleStep;
          const labelR = chartR + 14;
          const [lx, ly] = polarToXY(angle, labelR);

          const normalizedAngle = angle - Math.PI / 2;
          const cos = Math.cos(normalizedAngle);
          let anchor: "start" | "middle" | "end" = "middle";
          if (cos > 0.25) anchor = "start";
          else if (cos < -0.25) anchor = "end";

          return (
            <text
              key={`label-${i}`}
              x={lx}
              y={ly}
              textAnchor={anchor}
              dominantBaseline="central"
              className="fill-gray-600 dark:fill-gray-400"
              fontSize={8}
              fontWeight={500}
            >
              {abbreviate(skill.name)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
