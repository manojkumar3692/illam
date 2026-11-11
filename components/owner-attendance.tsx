"use client";
import { useState, type FormEvent } from "react";
import { day, type Project, type Row } from "@/lib/model";
import StageSelect from "./stage-select";
export default function OwnerAttendance({
  project,
  members,
  onSave,
}: {
  project: Project;
  members: Row[];
  onSave: (next: Project) => Promise<void>;
}) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [date, setDate] = useState(day());
  const people = [
    ...members
      .filter((r) => ["contractor", "architect"].includes(String(r.role)))
      .map((r) => ({
        id: r.id,
        name: String(
          r.name ||
            project.people.find(
              (p) =>
                String(p.email).toLowerCase() === String(r.email).toLowerCase(),
            )?.title ||
            r.email,
        ),
        role: String(r.role),
      })),
    ...project.people
      .filter(
        (r) =>
          !members.some(
            (m) =>
              r.email &&
              String(m.email).toLowerCase() === String(r.email).toLowerCase(),
          ),
      )
      .map((r) => ({
        id: "contact:" + r.id,
        name: String(r.title),
        role: String(r.role),
      })),
  ];
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    const person = people.find((p) => p.id === f.get("person"));
    if (!person) return;
    setBusy(true);
    setError("");
    try {
      const date = String(f.get("date"));
      const existing = (project.attendance || []).find(
        (r) => r.userId === person.id && r.date === date,
      );
      const row: Row = {
        ...existing,
        id: existing?.id || crypto.randomUUID(),
        userId: person.id,
        person: person.name,
        role: person.role,
        date,
        status: String(f.get("status")),
        note: String(f.get("note") || ""),
        stageId: String(f.get("stageId") || ""),
        confirmed: "yes",
        source: "owner-recorded",
      };
      await onSave({
        ...project,
        attendance: [
          row,
          ...(project.attendance || []).filter((r) => r.id !== row.id),
        ],
      });
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save attendance.");
    } finally {
      setBusy(false);
    }
  }
  async function confirm(id: string) {
    setBusy(true);
    setError("");
    try {
      await onSave({
        ...project,
        attendance: (project.attendance || []).map((r) =>
          r.id === id ? { ...r, confirmed: "yes" } : r,
        ),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not confirm.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="owner-attendance">
      <div className="section-heading">
        <h2>Attendance</h2>
        <button className="text-link" onClick={() => setOpen(!open)}>
          {open ? "Close" : "+ Record"}
        </button>
      </div>
      <p className="field-hint">
        Contractors and architects can check in themselves. Confirm visits or
        record a person’s day here. No location tracking or wage calculation.
      </p>
      {error && (
        <p role="alert" className="error-banner">
          {error}
        </p>
      )}
      {open && (
        <form onSubmit={submit} className="team-form">
          <label>
            Person
            <select name="person" required>
              <option value="">Choose a person</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.role}
                </option>
              ))}
            </select>
          </label>
          {!people.length && (
            <p>Add a contact or grant a contractor/architect access first.</p>
          )}
          <label>
            Date
            <input
              name="date"
              type="date"
              required
              defaultValue={date}
              max={day()}
            />
          </label>
          <label>
            Attendance
            <select name="status">
              <option>On site</option>
              <option>Remote work</option>
              <option>Half day</option>
              <option>Absent</option>
            </select>
          </label>
          <StageSelect stages={project.stages} />
          <label>
            Note / correction reason
            <textarea name="note" maxLength={1000} />
          </label>
          <p className="field-hint">
            Saving for the same person and date updates their existing entry.
          </p>
          <button className="button primary" disabled={busy}>
            Save attendance
          </button>
        </form>
      )}
      <label className="stage-filter">
        Day
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <div className="attendance-summary">
        <span>
          {
            (project.attendance || []).filter(
              (r) =>
                r.date === date &&
                ["On site", "Half day"].includes(String(r.status)),
            ).length
          }{" "}
          on site
        </span>
        <span>
          {
            (project.attendance || []).filter(
              (r) => r.date === date && r.confirmed !== "yes",
            ).length
          }{" "}
          awaiting confirmation
        </span>
      </div>
      {!(project.attendance || []).some((r) => r.date === date) && (
        <p className="field-hint">
          No attendance recorded for this day. Missing entries are not assumed
          absent.
        </p>
      )}
      {(project.attendance || [])
        .filter((r) => r.date === date)
        .map((r) => (
          <article className="team-record" key={r.id}>
            <div className="spread">
              <strong>{r.person}</strong>
              <span className="badge">{r.status}</span>
            </div>
            <small>
              {r.role} · {r.source || "Recorded"}
            </small>
            {r.checkInAt && (
              <small>
                In:{" "}
                {new Date(String(r.checkInAt)).toLocaleTimeString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {r.checkOutAt
                  ? ` · Out: ${new Date(String(r.checkOutAt)).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })}`
                  : ""}{" "}
                IST
              </small>
            )}
            <p>{r.note}</p>
            {r.confirmed === "yes" ? (
              <small>Confirmed</small>
            ) : (
              <button
                className="button"
                disabled={busy}
                onClick={() => confirm(r.id)}
              >
                Confirm attendance
              </button>
            )}
          </article>
        ))}
    </section>
  );
}
