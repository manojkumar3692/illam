import type { Row } from "@/lib/model";
export default function BuildView({ stages }: { stages: Row[] }) {
  const progress = stages.length
    ? Math.round(
        stages.reduce((n, s) => n + Number(s.progress || 0), 0) / stages.length,
      )
    : 0;
  const active = stages.find(
    (s) => Number(s.progress) > 0 && Number(s.progress) < 100,
  );
  return (
    <section className="build-view">
      <div className="spread">
        <div>
          <small>YOUR HOME TAKING SHAPE</small>
          <h2>
            {progress === 100
              ? "Ready for the next chapter"
              : active
                ? String(active.title)
                : "Every home starts here"}
          </h2>
        </div>
        <strong>{progress}%</strong>
      </div>
      <svg
        viewBox="0 0 420 240"
        role="img"
        aria-label={`Illustrative house, ${progress} percent recorded progress`}
      >
        <defs>
          <linearGradient id="land" x2="1" y2="1">
            <stop stopColor="#e0e7d4" />
            <stop offset="1" stopColor="#c5d2b4" />
          </linearGradient>
        </defs>
        <ellipse cx="210" cy="204" rx="165" ry="25" fill="#d9dfcf" />
        <path d="M35 161 203 78 386 166 214 231Z" fill="url(#land)" />
        <path d="m106 156 101-50 108 52-101 51Z" fill="#b7b8a9" />
        <g opacity={progress > 0 ? 1 : 0.28}>
          <path d="m112 151 94-47v-66l-94 48Z" fill="#e6dfca" />
          <path d="m206 104 103 48V86L206 38Z" fill="#f6f1df" />
          <path d="m112 86 94-47 103 47-94 47Z" fill="#ddd4b9" />
          <path d="m112 151 94-47 103 48-94 48Z" fill="#c4bca4" />
        </g>
        <g opacity={progress >= 30 ? 1 : 0.15}>
          <path d="m112 88 94-46v-25l-94 47Z" fill="#ddd4bd" />
          <path d="m206 42 103 48V65L206 17Z" fill="#f3ecd8" />
          <path d="m103 65 103-52 113 53-104 53Z" fill="#697b61" />
          <path d="m103 65 112 54v9L103 74Z" fill="#42533d" />
          <path d="m215 119 104-53v9l-104 53Z" fill="#53684a" />
        </g>
        <g opacity={progress >= 65 ? 1 : 0.15} fill="#667c78">
          <path d="m130 112 22-11v25l-22 11Z" />
          <path d="m168 94 23-11v25l-23 11Z" />
          <path d="m226 125 22 10v24l-22-10Z" />
          <path d="m269 144 22 10v24l-22-10Z" />
        </g>
        <g opacity={progress >= 90 ? 1 : 0.18}>
          <path d="m248 179 18-9 77 36-19 10Z" fill="#ede6d3" />
          <path d="M65 157v-29m275 52v-30" stroke="#887b5e" strokeWidth="5" />
          <circle cx="65" cy="120" r="18" fill="#7b9365" />
          <circle cx="340" cy="143" r="20" fill="#91a677" />
        </g>
      </svg>
      <p>
        Illustrative view from your recorded stage progress. Not your
        architectural model or a site measurement.
      </p>
    </section>
  );
}
