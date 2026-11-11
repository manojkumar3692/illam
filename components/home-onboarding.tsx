"use client";
import { useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, House, Check } from "lucide-react";
import {
  buildFirstHome,
  starterStages,
  type HomeSetup,
} from "@/lib/onboarding";
import type { Project } from "@/lib/model";
export default function HomeOnboarding({
  email,
  onCreate,
  onRefresh,
  onCancel,
  onLogout,
}: {
  email: string;
  onCreate: (data: Project) => Promise<void>;
  onRefresh: () => Promise<void>;
  onCancel?: () => void;
  onLogout: () => Promise<void>;
}) {
  const [step, setStep] = useState(0),
    [joining, setJoining] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  const [draft, setDraft] = useState<HomeSetup>({
    name: "",
    location: "",
    budget: "",
    target: "",
    stages: true,
  });
  function change(key: keyof HomeSetup, value: string | boolean) {
    setDraft((p) => ({ ...p, [key]: value }));
    setError("");
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    setError("");
    try {
      const data = buildFirstHome(draft);
      if (step < 2) {
        setStep(step + 1);
        return;
      }
      lock.current = true;
      setBusy(true);
      await onCreate(data);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to create your home. Please try again.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function action(fn: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="app-shell onboarding-shell">
      <header className="app-header">
        <a href="/" className="wordmark" aria-label="ILLAM homepage">
          illam<span>•</span>
        </a>
        <button
          className="text-link"
          disabled={busy}
          onClick={() => action(onLogout)}
        >
          Sign out
        </button>
      </header>
      <main className="onboarding-content">
        <a href="/" className="text-link">
          <ArrowLeft size={16} /> Back to homepage
        </a>
        <p className="eyebrow">WELCOME TO ILLAM</p>
        <h1>
          {joining
            ? "Joining someone’s build?"
            : [
                "Let’s give your home a place.",
                "A plan, at your pace.",
                "Ready for your first day.",
              ][step]}
        </h1>
        <p className="muted">
          {joining
            ? "Your project owner gives you access using your account email."
            : "A few details now. Everything can be changed later."}
        </p>
        {error && (
          <p className="error-banner" role="alert">
            {error}
          </p>
        )}
        {joining ? (
          <section className="onboarding-join">
            <p>
              Ask the owner to add <strong>{email}</strong> in People & access.
              You don’t need to create another home.
            </p>
            <button
              className="button primary full"
              disabled={busy}
              onClick={() => action(onRefresh)}
            >
              {busy ? "Checking…" : "Check for my invitation"}
            </button>
            <button
              className="text-link"
              disabled={busy}
              onClick={() => setJoining(false)}
            >
              I’m building my own home
            </button>
          </section>
        ) : (
          <>
            <ol className="onboarding-steps" aria-label="Setup progress">
              {["Your home", "Your plan", "Review"].map((label, i) => (
                <li
                  key={label}
                  aria-current={step === i ? "step" : undefined}
                  className={i <= step ? "active" : ""}
                >
                  <span>{i < step ? <Check size={15} /> : i + 1}</span>
                  {label}
                </li>
              ))}
            </ol>
            <form onSubmit={submit}>
              {step === 0 && (
                <>
                  <label>
                    What would you like to call your home?
                    <input
                      autoFocus
                      value={draft.name}
                      onChange={(e) => change("name", e.target.value)}
                      placeholder="e.g. Our dream home"
                      required
                      maxLength={100}
                    />
                  </label>
                  <label>
                    Where are you building?
                    <input
                      value={draft.location}
                      onChange={(e) => change("location", e.target.value)}
                      placeholder="e.g. Purva Raagam, Chennai"
                      required
                      maxLength={200}
                    />
                    <small>
                      Area and city are enough. No exact address needed.
                    </small>
                  </label>
                </>
              )}
              {step === 1 && (
                <>
                  <label>
                    Estimated total budget · optional
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="1000000000000"
                      step="any"
                      value={draft.budget}
                      onChange={(e) => change("budget", e.target.value)}
                      placeholder="Amount in rupees (₹)"
                    />
                    <small>
                      A planning estimate, not money added to your funds.
                    </small>
                  </label>
                  <label>
                    Target move-in date · optional
                    <input
                      type="date"
                      value={draft.target}
                      onChange={(e) => change("target", e.target.value)}
                    />
                  </label>
                  <label className="onboarding-check">
                    <input
                      type="checkbox"
                      checked={draft.stages}
                      onChange={(e) => change("stages", e.target.checked)}
                    />
                    <span>
                      Start with suggested construction stages
                      <small>
                        {starterStages.join(" · ")}. Rename, add or remove these
                        later.
                      </small>
                    </span>
                  </label>
                  <p className="muted">
                    Already building? Record your actual stage progress once
                    your home is created.
                  </p>
                </>
              )}
              {step === 2 && (
                <>
                  <div className="onboarding-summary">
                    <House size={30} />
                    <h2>{draft.name.trim()}</h2>
                    <p>{draft.location.trim()}</p>
                    <dl>
                      <dt>Budget</dt>
                      <dd>
                        {draft.budget
                          ? new Intl.NumberFormat("en-IN", {
                              style: "currency",
                              currency: "INR",
                              maximumFractionDigits: 0,
                            }).format(Number(draft.budget))
                          : "Decide later"}
                      </dd>
                      <dt>Move-in target</dt>
                      <dd>{draft.target || "Decide later"}</dd>
                      <dt>Stages</dt>
                      <dd>
                        {draft.stages
                          ? "6 editable stages, starting at 0%"
                          : "Add your own later"}
                      </dd>
                    </dl>
                  </div>
                  <p>
                    Your home starts with no expenses or money entries. Next,
                    add your first expense, set stage progress or bring your
                    team in.
                  </p>
                </>
              )}
              <div className="onboarding-actions">
                {step > 0 && (
                  <button
                    type="button"
                    className="button"
                    disabled={busy}
                    onClick={() => {
                      setStep(step - 1);
                      setError("");
                    }}
                  >
                    Back
                  </button>
                )}
                <button className="button primary" disabled={busy}>
                  {busy
                    ? "Creating your home…"
                    : step === 2
                      ? "Create my home"
                      : "Continue"}
                  <ArrowRight size={18} />
                </button>
              </div>
            </form>
            {step === 0 && (
              <button
                className="text-link onboarding-join-toggle"
                disabled={busy}
                onClick={() => setJoining(true)}
              >
                Invited as architect, contractor or family?
              </button>
            )}
          </>
        )}
        {onCancel && (
          <button
            className="text-link onboarding-join-toggle"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel and return to my project
          </button>
        )}
      </main>
    </div>
  );
}
