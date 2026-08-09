"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { s } from "@/lib/style";
import { Hv } from "./Hover";

interface Review {
  id: number;
  rating: number;
  title: string;
  body: string;
  verified: boolean;
  author: string;
  createdAt: string;
  helpful: number;
  mine: boolean;
  votedByMe: boolean;
}

function Stars({ value, size = 15 }: { value: number; size?: number }) {
  return (
    <span aria-label={`${value} out of 5 stars`} style={s(`color:#c2410c;font-size:${size}px;letter-spacing:1px`)}>
      {"★".repeat(value)}
      <span style={s("color:#d8d1c5")}>{"★".repeat(5 - value)}</span>
    </span>
  );
}

/** Interactive 1-5 star picker. */
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div role="radiogroup" aria-label="Rating" style={s("display:flex;gap:4px")}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          onClick={() => onChange(n)}
          style={s(
            `background:none;border:none;padding:0 2px;cursor:pointer;font-size:26px;line-height:1;color:${n <= value ? "#c2410c" : "#d8d1c5"}`,
          )}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function ProductReviews({ productId }: { productId: number }) {
  const router = useRouter();
  const { customer, customerChecked, showToast, reloadCatalog } = useStore();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<{ total: number; average: number; distribution: Record<number, number> } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setReviews(Array.isArray(data?.reviews) ? data.reviews : []);
      setSummary(
        data && typeof data.total === "number"
          ? { total: data.total, average: data.average ?? 0, distribution: data.distribution ?? {} }
          : null,
      );
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  // Re-fetch once the customer session resolves, so "mine" is accurate —
  // the first load can land before /api/account/me has come back.
  useEffect(() => {
    if (customerChecked && customer) load();
  }, [customerChecked, customer, load]);

  const mine = reviews.find((r) => r.mine);

  const startWriting = () => {
    if (!customer) {
      showToast("Sign in to write a review");
      router.push("/account/login");
      return;
    }
    setRating(mine?.rating ?? 0);
    setTitle(mine?.title ?? "");
    setBody(mine?.body ?? "");
    setFormError("");
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) {
      setFormError("Please pick a rating.");
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, title, body }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFormError(data?.error || "Couldn't save your review. Please try again.");
        return;
      }
      setOpen(false);
      showToast(mine ? "Review updated" : "Thanks for your review");
      await load();
      // The product's rating/review count are denormalized on Product and
      // were just recomputed server-side — refresh the catalog so the
      // header stars and every product card reflect it without a reload.
      reloadCatalog();
    } catch {
      setFormError("Couldn't save your review. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      setOpen(false);
      showToast("Review removed");
      await load();
      reloadCatalog();
    } catch {
      showToast("Couldn't remove your review");
    } finally {
      setBusy(false);
    }
  };

  const voteHelpful = async (r: Review) => {
    if (!customer) {
      showToast("Sign in to mark reviews helpful");
      return;
    }
    // Optimistic — a vote is trivially reversible and the button should
    // feel instant; reconciled from the server response below.
    setReviews((prev) =>
      prev.map((x) =>
        x.id === r.id ? { ...x, votedByMe: !x.votedByMe, helpful: x.helpful + (x.votedByMe ? -1 : 1) } : x,
      ),
    );
    try {
      const res = await fetch(`/api/reviews/${r.id}/helpful`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "vote failed");
      setReviews((prev) =>
        prev.map((x) => (x.id === r.id ? { ...x, helpful: data.helpful, votedByMe: data.voted } : x)),
      );
    } catch (e) {
      // Roll the optimistic update back and say why.
      setReviews((prev) =>
        prev.map((x) =>
          x.id === r.id ? { ...x, votedByMe: r.votedByMe, helpful: r.helpful } : x,
        ),
      );
      showToast(e instanceof Error ? e.message : "Couldn't record your vote");
    }
  };

  const FIELD = "border:1px solid #e0d9cc;border-radius:9px;padding:11px 13px;font-size:14px;width:100%;background:#fff";

  return (
    <section style={s("margin-top:64px")} id="reviews">
      <div style={s("display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:24px")}>
        <h2 style={s("font-size:24px;font-weight:600;letter-spacing:-.02em;margin:0")}>
          Reviews{!loading && reviews.length ? ` (${reviews.length})` : ""}
        </h2>
        <Hv
          as="button"
          onClick={startWriting}
          css="background:#1a1714;color:#fff;border:none;padding:11px 20px;border-radius:9px;font-size:14px;font-weight:500;cursor:pointer;transition:background .25s"
          hover="background:#332e28"
        >
          {mine ? "Edit your review" : "Write a review"}
        </Hv>
      </div>

      {open ? (
        <form
          onSubmit={submit}
          style={s(
            "background:#fff;border:1px solid #e7e0d3;border-radius:14px;padding:22px;display:flex;flex-direction:column;gap:14px;margin-bottom:26px;animation:gbFade .3s both",
          )}
        >
          <StarPicker value={rating} onChange={setRating} />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sum it up in a few words (optional)"
            maxLength={120}
            style={s(FIELD)}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="How did it fit? How does it wear? (optional)"
            maxLength={2000}
            rows={4}
            style={s(FIELD + ";resize:vertical;font-family:inherit;line-height:1.5")}
          />
          {formError ? <div style={s("color:#8a3a25;font-size:13.5px")}>{formError}</div> : null}
          <div style={s("display:flex;gap:10px;align-items:center;flex-wrap:wrap")}>
            <Hv
              as="button"
              type="submit"
              disabled={busy}
              css={`background:#c2410c;color:#fff;border:none;padding:11px 22px;border-radius:9px;font-size:14px;font-weight:500;cursor:${busy ? "default" : "pointer"};opacity:${busy ? ".6" : "1"};transition:background .25s`}
              hover={busy ? "" : "background:#9a330a"}
            >
              {busy ? "Saving…" : mine ? "Update review" : "Post review"}
            </Hv>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={s(
                "background:#fff;color:#1a1714;border:1px solid #e0d9cc;padding:11px 20px;border-radius:9px;font-size:14px;cursor:pointer",
              )}
            >
              Cancel
            </button>
            {mine ? (
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                style={s("background:none;border:none;color:#8a3a25;font-size:13.5px;cursor:pointer;margin-left:auto;padding:6px")}
              >
                Delete my review
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      {loading ? (
        <div style={s("color:#8a8275;font-size:14px")}>Loading reviews…</div>
      ) : loadError ? (
        <div style={s("display:flex;align-items:center;gap:14px;flex-wrap:wrap")}>
          <span style={s("color:#8a3a25;font-size:14px")}>Couldn&apos;t load reviews.</span>
          <button
            onClick={load}
            style={s(
              "background:#1a1714;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer",
            )}
          >
            Retry
          </button>
        </div>
      ) : reviews.length === 0 ? (
        <div style={s("color:#8a8275;font-size:14.5px;line-height:1.6")}>
          No reviews yet — be the first to say how this one wears.
        </div>
      ) : (
        <div style={s("display:flex;flex-direction:column")}>
          {summary && summary.total > 0 ? (
            <div
              style={s(
                "display:flex;gap:34px;align-items:center;flex-wrap:wrap;background:#fff;border:1px solid #e7e0d3;border-radius:14px;padding:20px 24px;margin-bottom:8px",
              )}
            >
              <div style={s("display:flex;flex-direction:column;align-items:center;gap:4px;min-width:96px")}>
                <span style={s("font:600 34px 'Geist Mono',monospace;line-height:1")}>{summary.average.toFixed(1)}</span>
                <Stars value={Math.round(summary.average)} />
                <span style={s("font-size:12.5px;color:#8a8275")}>
                  {summary.total} review{summary.total === 1 ? "" : "s"}
                </span>
              </div>
              <div style={s("flex:1;min-width:220px;display:flex;flex-direction:column;gap:5px")}>
                {[5, 4, 3, 2, 1].map((n) => {
                  const count = summary.distribution[n] ?? 0;
                  const pct = summary.total ? Math.round((count / summary.total) * 100) : 0;
                  return (
                    <div key={n} style={s("display:flex;align-items:center;gap:10px")}>
                      <span style={s("font:400 11.5px 'Geist Mono',monospace;color:#8a8275;width:34px")}>{n} ★</span>
                      <span
                        role="img"
                        aria-label={`${n} stars: ${count} review${count === 1 ? "" : "s"} (${pct}%)`}
                        style={s("flex:1;height:7px;background:#ece7dd;border-radius:999px;overflow:hidden")}
                      >
                        <span style={s(`display:block;height:100%;width:${pct}%;background:#c2410c;border-radius:999px`)} />
                      </span>
                      <span style={s("font:400 11.5px 'Geist Mono',monospace;color:#8a8275;width:26px;text-align:right")}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          {reviews.map((r) => (
            <div key={r.id} style={s("padding:20px 0;border-top:1px solid #ece7dd;display:flex;flex-direction:column;gap:7px")}>
              <div style={s("display:flex;align-items:center;gap:10px;flex-wrap:wrap")}>
                <Stars value={r.rating} />
                <span style={s("font-size:14px;font-weight:500")}>{r.author}</span>
                {r.verified ? (
                  <span
                    style={s(
                      "font:500 10.5px 'Geist Mono',monospace;letter-spacing:.04em;color:#1f513f;background:#e8f1ec;border-radius:5px;padding:3px 7px;text-transform:uppercase",
                    )}
                  >
                    Verified purchase
                  </span>
                ) : null}
                <span style={s("font:400 11.5px 'Geist Mono',monospace;color:#9a948a;margin-left:auto")}>
                  {new Date(r.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                </span>
              </div>
              {r.title ? <div style={s("font-size:15px;font-weight:600")}>{r.title}</div> : null}
              {r.body ? <p style={s("font-size:14.5px;line-height:1.65;color:#5f5a52;margin:0")}>{r.body}</p> : null}
              <div style={s("display:flex;align-items:center;gap:10px;margin-top:3px")}>
                {r.mine ? (
                  // You can't vote on your own review, so show the count
                  // without an actionable control rather than a button
                  // that only ever errors.
                  <span style={s("font-size:12.5px;color:#9a948a")}>
                    {r.helpful > 0 ? `${r.helpful} found this helpful` : "Your review"}
                  </span>
                ) : (
                  <button
                    onClick={() => voteHelpful(r)}
                    aria-pressed={r.votedByMe}
                    style={s(
                      `display:inline-flex;align-items:center;gap:6px;background:${r.votedByMe ? "#f6ece7" : "#fff"};border:1px solid ${r.votedByMe ? "#e0b6a4" : "#e0d9cc"};color:${r.votedByMe ? "#9a330a" : "#5f5a52"};border-radius:999px;padding:5px 12px;font-size:12.5px;cursor:pointer;transition:background .2s,border-color .2s`,
                    )}
                  >
                    <span aria-hidden="true">👍</span>
                    {r.votedByMe ? "Helpful" : "Helpful?"}
                    {r.helpful > 0 ? <span style={s("font-weight:600")}>{r.helpful}</span> : null}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
