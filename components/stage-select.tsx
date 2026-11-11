import type { Row } from "@/lib/model";
export default function StageSelect({
  stages,
  value,
  onChange,
  disabled = false,
}: {
  stages: Row[];
  value?: string | number;
  onChange?: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="full-width">
      Construction stage
      <select
        name="stageId"
        disabled={disabled}
        {...(onChange
          ? {
              value: value || "",
              onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
                onChange(e.target.value),
            }
          : { defaultValue: value || "" })}
      >
        <option value="">Whole project / not assigned</option>
        {stages.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title}
          </option>
        ))}
      </select>
      <small>
        {stages.length
          ? "Choose where this record belongs."
          : "Create your stages in Site → Stages, then assign records here."}
      </small>
    </label>
  );
}
