"use client";
import { useEffect, useState, useCallback, type FormEvent } from "react";
type Partner = { id: string; name: string; role: string; email?: string };
type Message = {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
};
export default function ProjectMessages({
  projectId,
  userId,
}: {
  projectId: string;
  userId: string;
}) {
  const [partners, setPartners] = useState<Partner[]>([]),
    [messages, setMessages] = useState<Message[]>([]),
    [recipient, setRecipient] = useState("");
  const [draft, setDraft] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    const r = await fetch("/api/messages?projectId=" + projectId, {
        cache: "no-store",
      }),
      data = await r.json();
    if (!r.ok) throw new Error(data.error);
    setPartners(data.partners);
    setMessages(data.messages);
    setRecipient((old) =>
      data.partners.some((p: Partner) => p.id === old)
        ? old
        : data.partners[0]?.id || "",
    );
    setLoading(false);
  }, [projectId]);
  useEffect(() => {
    let active = true;
    const refresh = () =>
      load().catch((e) => {
        if (active) {
          setError(e.message);
          setLoading(false);
        }
      });
    refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [load]);
  async function send(e: FormEvent) {
    e.preventDefault();
    if (busy || !draft.trim() || !recipient) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          recipientId: recipient,
          body: draft,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setDraft("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send.");
    } finally {
      setBusy(false);
    }
  }
  const thread = messages.filter(
    (m) => m.senderId === recipient || m.recipientId === recipient,
  );
  return (
    <section className="project-messages">
      <h1>Messages</h1>
      <p className="field-hint">
        A private conversation between you and this person, for this project.
        Updates refresh automatically while this page is open.
      </p>
      {error && (
        <p role="alert" className="error-banner">
          {error}
        </p>
      )}
      {loading ? (
        <p>Loading conversations…</p>
      ) : !partners.length ? (
        <p>
          Add an architect or contractor in People & access to start a
          conversation.
        </p>
      ) : (
        <>
          <label>
            Conversation
            <select
              disabled={busy}
              value={recipient}
              onChange={(e) => {
                setRecipient(e.target.value);
                setDraft("");
              }}
            >
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.role}
                </option>
              ))}
            </select>
          </label>
          <div className="message-thread" aria-label="Conversation messages">
            {!thread.length && (
              <p className="field-hint">
                No messages yet. Send a note to get started.
              </p>
            )}
            {thread.map((m) => (
              <article
                className={
                  "message-bubble " +
                  (m.senderId === userId ? "sent" : "received")
                }
                key={m.id}
              >
                <small>
                  {m.senderId === userId
                    ? "You"
                    : partners.find((p) => p.id === m.senderId)?.name ||
                      "Team member"}
                </small>
                <p>{m.body}</p>
                <small>
                  {new Date(m.createdAt).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}{" "}
                  IST
                </small>
              </article>
            ))}
          </div>
          <form onSubmit={send}>
            <label>
              Your message
              <textarea
                required
                maxLength={3000}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                placeholder="Ask a question, share a decision or flag an issue…"
              />
            </label>
            <button
              className="button primary full"
              disabled={busy || !draft.trim()}
            >
              {busy ? "Sending…" : "Send message"}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
