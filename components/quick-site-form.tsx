import { day, type Row } from "@/lib/model";
export default function QuickSiteForm({
  row,
  author,
}: {
  row?: Row;
  author: string;
}) {
  return (
    <>
      <label>
        What happened today?
        <input
          name="title"
          required
          defaultValue={row?.title}
          placeholder="e.g. First-floor brickwork completed"
          maxLength={500}
        />
      </label>
      <label>
        Work done or anything to flag
        <textarea
          name="note"
          required
          defaultValue={row?.note}
          placeholder="Work completed, blockers or a note for the owner…"
          rows={4}
          maxLength={3000}
        />
      </label>
      <label className="review-checkbox">
        <input
          type="checkbox"
          name="shared"
          value="yes"
          defaultChecked={row?.shared === "yes"}
        />{" "}
        Share this note and attachment with everyone in the home
      </label>
      <small>
        Leave unchecked for owner-and-author access. Shared notes should not
        contain private financial details.
      </small>
      <details className="entry-extra">
        <summary>Date, team & photo link</summary>
        <label>
          Date
          <input
            type="date"
            name="date"
            required
            defaultValue={row?.date || day()}
          />
        </label>
        <label>
          Posted by
          <input
            name="author"
            required
            defaultValue={row?.author || author}
            maxLength={500}
          />
        </label>
        <label>
          People on site
          <input
            name="workers"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            required
            defaultValue={row?.workers || 0}
          />
        </label>
        <label>
          Photo link (optional)
          <input
            name="url"
            type="url"
            defaultValue={row?.url}
            placeholder="https://"
          />
        </label>
      </details>
    </>
  );
}
