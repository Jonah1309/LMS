"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { Lock, Play, CheckCircle, Star, ArrowLeft, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { toast } from "@/components/ui/Toast";

interface Module {
  id: number;
  title: string;
  module_type: string;
  is_preview_free: boolean;
  order_index: number;
}

interface Course {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  price_usd: number;
  price_inr: number;
  thumbnail_url: string | null;
  avg_rating: number;
  review_count: number;
  instructor_id?: number;
  modules: Module[];
}

interface ReviewItem {
  id: number;
  rating: number;
  body: string;
  created_at: string;
  user_name: string;
  user_avatar: string | null;
}

interface Me {
  id: number;
  role: string;
}

interface QAQuestion {
  id: number;
  title: string;
  body: string | null;
  is_answered: boolean;
  answer_count: number;
  user_id: number;
  user_name: string;
  created_at: string;
}

interface QAAnswer {
  id: number;
  body: string;
  is_accepted: boolean;
  user_id: number;
  user_name: string;
  created_at: string;
}

interface QADetail extends QAQuestion {
  answers: QAAnswer[];
}

function StarRow({ value, onChange }: { value: number; onChange?: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-6 h-6 cursor-pointer transition ${
            n <= (hover || value) ? "fill-amber-400 text-amber-400" : "text-slate-300"
          }`}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => onChange && setHover(n)}
          onMouseLeave={() => onChange && setHover(0)}
        />
      ))}
    </div>
  );
}

export default function CourseDetailClient() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { token } = useAuthStore();
  const [course, setCourse] = useState<Course | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [myRating, setMyRating] = useState(0);
  const [myBody, setMyBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"overview" | "reviews" | "qa">("overview");
  const [me, setMe] = useState<Me | null>(null);

  const [questions, setQuestions] = useState<QAQuestion[]>([]);
  const [qaLoading, setQaLoading] = useState(false);
  const [selectedQ, setSelectedQ] = useState<QADetail | null>(null);
  const [qTitle, setQTitle] = useState("");
  const [qBody, setQBody] = useState("");
  const [askingQ, setAskingQ] = useState(false);
  const [answerBody, setAnswerBody] = useState("");
  const [postingA, setPostingA] = useState(false);

  useEffect(() => {
    api.get(`/api/v1/courses/${slug}`).then(({ data }) => {
      setCourse(data);
      return api.get(`/api/v1/courses/${data.id}/reviews`);
    }).then(({ data }) => setReviews(data)).finally(() => setLoading(false));

    if (token) {
      api.get("/api/v1/enrollments/me").then(({ data }) => {
        setEnrolled(data.some((e: any) => e.course_slug === slug));
      }).catch(() => {});
      api.get("/api/v1/auth/me").then(({ data }) => setMe(data)).catch(() => {});
    }
  }, [slug, token]);

  useEffect(() => {
    if (tab === "qa" && course) loadQuestions(course.id);
  }, [tab, course?.id]);

  async function loadQuestions(courseId: number) {
    setQaLoading(true);
    try {
      const { data } = await api.get(`/api/v1/courses/${courseId}/questions`);
      setQuestions(data);
    } finally {
      setQaLoading(false);
    }
  }

  async function openQuestion(id: number) {
    const { data } = await api.get(`/api/v1/questions/${id}`);
    setSelectedQ(data);
    setAnswerBody("");
  }

  async function submitQuestion() {
    if (!course || !qTitle.trim()) return;
    setAskingQ(true);
    try {
      await api.post(`/api/v1/courses/${course.id}/questions`, {
        title: qTitle.trim(),
        body: qBody.trim() || null,
      });
      setQTitle("");
      setQBody("");
      await loadQuestions(course.id);
      toast.success("Question posted!");
    } catch {
      toast.error("Failed to post question.");
    } finally {
      setAskingQ(false);
    }
  }

  async function submitAnswer() {
    if (!selectedQ || !answerBody.trim()) return;
    setPostingA(true);
    try {
      await api.post(`/api/v1/questions/${selectedQ.id}/answers`, { body: answerBody.trim() });
      setAnswerBody("");
      const { data } = await api.get(`/api/v1/questions/${selectedQ.id}`);
      setSelectedQ(data);
    } catch {
      toast.error("Failed to post answer.");
    } finally {
      setPostingA(false);
    }
  }

  async function acceptAnswer(answerId: number) {
    if (!selectedQ) return;
    try {
      await api.put(`/api/v1/answers/${answerId}/accept`);
      const { data } = await api.get(`/api/v1/questions/${selectedQ.id}`);
      setSelectedQ(data);
    } catch {
      toast.error("Failed to accept answer.");
    }
  }

  async function deleteQuestion(id: number) {
    if (!course) return;
    try {
      await api.delete(`/api/v1/questions/${id}`);
      setSelectedQ(null);
      await loadQuestions(course.id);
    } catch {
      toast.error("Failed to delete question.");
    }
  }

  async function deleteAnswer(id: number) {
    if (!selectedQ) return;
    try {
      await api.delete(`/api/v1/answers/${id}`);
      const { data } = await api.get(`/api/v1/questions/${selectedQ.id}`);
      setSelectedQ(data);
    } catch {
      toast.error("Failed to delete answer.");
    }
  }

  function canModify(authorId: number): boolean {
    if (!me) return false;
    return me.id === authorId || me.role === "admin" || (course?.instructor_id != null && me.id === course.instructor_id);
  }

  async function handleEnroll() {
    if (!token) { router.push("/login"); return; }
    setEnrolling(true);
    try {
      if (course?.price_usd === 0) {
        await api.post(`/api/v1/enrollments/${course.id}/enroll`);
        setEnrolled(true);
        router.push(`/learn/${course.id}`);
      } else {
        router.push(`/checkout/${course?.id}`);
      }
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setEnrolled(true);
        router.push(`/learn/${course?.id}`);
      }
    } finally {
      setEnrolling(false);
    }
  }

  async function submitReview() {
    if (!course || myRating === 0) return;
    setSubmitting(true);
    try {
      await api.post(`/api/v1/courses/${course.id}/reviews`, { rating: myRating, body: myBody });
      const { data } = await api.get(`/api/v1/courses/${course.id}/reviews`);
      setReviews(data);
      const { data: updated } = await api.get(`/api/v1/courses/${slug}`);
      setCourse(updated);
      toast.success("Review submitted!");
    } catch {
      toast.error("Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <><Navbar /><div className="p-16 text-center text-slate-400">Loading…</div></>;
  if (!course) return <><Navbar /><div className="p-16 text-center text-slate-400">Course not found.</div></>;

  const freeModules = course.modules.filter((m) => m.is_preview_free);

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left: course info */}
          <div className="lg:col-span-2 space-y-6">
            {course.thumbnail_url && (
              <div className="aspect-video rounded-2xl overflow-hidden bg-slate-100">
                <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
              </div>
            )}
            <h1 className="text-3xl font-bold text-slate-900">{course.title}</h1>
            {course.avg_rating > 0 && (
              <div className="flex items-center gap-2 text-amber-500">
                <StarRow value={Math.round(course.avg_rating)} />
                <span className="font-semibold text-slate-700">{course.avg_rating.toFixed(1)}</span>
                <span className="text-slate-400 text-sm">({course.review_count} review{course.review_count !== 1 ? "s" : ""})</span>
              </div>
            )}
            {course.description && <p className="text-slate-600 leading-relaxed">{course.description}</p>}

            {/* Tab bar */}
            <div className="border-b border-slate-200">
              <div className="flex gap-6">
                {(["overview", "reviews", "qa"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setTab(t); setSelectedQ(null); }}
                    className={`pb-3 text-sm font-semibold border-b-2 transition -mb-px ${
                      tab === t
                        ? "border-indigo-600 text-indigo-600"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {t === "qa" ? "Q&A" : t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Overview tab */}
            {tab === "overview" && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">Curriculum</h2>
                <div className="space-y-2">
                  {course.modules.map((m, i) => (
                    <div key={m.id} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                      <span className="text-xs text-slate-400 w-5 text-right">{i + 1}</span>
                      {m.is_preview_free ? (
                        <Play className="w-4 h-4 text-indigo-500 shrink-0" />
                      ) : (
                        <Lock className="w-4 h-4 text-slate-300 shrink-0" />
                      )}
                      <span className="text-sm text-slate-700 flex-1">{m.title}</span>
                      {m.is_preview_free && (
                        <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Preview</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews tab */}
            {tab === "reviews" && (
              <div>
                {enrolled && (
                  <div className="bg-indigo-50 rounded-2xl p-5 mb-6 border border-indigo-100">
                    <p className="text-sm font-semibold text-slate-700 mb-3">Leave a review</p>
                    <StarRow value={myRating} onChange={setMyRating} />
                    <textarea
                      value={myBody}
                      onChange={(e) => setMyBody(e.target.value)}
                      rows={3}
                      placeholder="Share your experience…"
                      className="mt-3 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none bg-white"
                    />
                    <button
                      onClick={submitReview}
                      disabled={submitting || myRating === 0}
                      className="mt-3 bg-indigo-600 text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition"
                    >
                      {submitting ? "Submitting…" : "Submit review"}
                    </button>
                  </div>
                )}
                {reviews.length === 0 ? (
                  <p className="text-sm text-slate-400">No reviews yet. Be the first!</p>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((r) => (
                      <div key={r.id} className="bg-white border border-slate-200 rounded-2xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                            {r.user_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{r.user_name}</p>
                            <p className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="ml-auto flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star key={n} className={`w-4 h-4 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
                            ))}
                          </div>
                        </div>
                        {r.body && <p className="text-sm text-slate-600">{r.body}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Q&A tab */}
            {tab === "qa" && (
              <div className="space-y-4">
                {selectedQ ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => setSelectedQ(null)}
                      className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back to questions
                    </button>

                    <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {selectedQ.is_answered && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Answered</span>
                            )}
                          </div>
                          <h3 className="font-semibold text-slate-900">{selectedQ.title}</h3>
                          {selectedQ.body && <p className="text-sm text-slate-600 mt-1">{selectedQ.body}</p>}
                          <p className="text-xs text-slate-400 mt-2">by {selectedQ.user_name} · {new Date(selectedQ.created_at).toLocaleDateString()}</p>
                        </div>
                        {canModify(selectedQ.user_id) && (
                          <button
                            type="button"
                            onClick={() => deleteQuestion(selectedQ.id)}
                            className="text-slate-300 hover:text-red-400 transition shrink-0"
                            aria-label="Delete question"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {selectedQ.answers.length > 0 && (
                      <div className="space-y-3 mb-4">
                        <p className="text-sm font-semibold text-slate-700">
                          {selectedQ.answers.length} answer{selectedQ.answers.length !== 1 ? "s" : ""}
                        </p>
                        {selectedQ.answers.map((a) => (
                          <div
                            key={a.id}
                            className={`rounded-2xl p-4 border ${
                              a.is_accepted ? "bg-green-50 border-green-200" : "bg-white border-slate-200"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                {a.is_accepted && (
                                  <div className="flex items-center gap-1 mb-1">
                                    <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                                    <span className="text-xs text-green-700 font-medium">Accepted answer</span>
                                  </div>
                                )}
                                <p className="text-sm text-slate-700">{a.body}</p>
                                <p className="text-xs text-slate-400 mt-1">by {a.user_name} · {new Date(a.created_at).toLocaleDateString()}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {!a.is_accepted && me && me.id === selectedQ.user_id && (
                                  <button
                                    type="button"
                                    onClick={() => acceptAnswer(a.id)}
                                    className="text-xs text-green-600 hover:text-green-700 font-medium border border-green-200 px-2 py-0.5 rounded-lg transition"
                                  >
                                    Accept
                                  </button>
                                )}
                                {canModify(a.user_id) && (
                                  <button
                                    type="button"
                                    onClick={() => deleteAnswer(a.id)}
                                    className="text-slate-300 hover:text-red-400 transition"
                                    aria-label="Delete answer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {token && (
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                        <p className="text-sm font-semibold text-slate-700 mb-2">Post an answer</p>
                        <textarea
                          value={answerBody}
                          onChange={(e) => setAnswerBody(e.target.value)}
                          rows={3}
                          placeholder="Share your knowledge…"
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none bg-white"
                        />
                        <button
                          type="button"
                          onClick={submitAnswer}
                          disabled={postingA || !answerBody.trim()}
                          className="mt-2 bg-indigo-600 text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition"
                        >
                          {postingA ? "Posting…" : "Post answer"}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {enrolled && (
                      <div className="bg-indigo-50 rounded-2xl p-5 mb-6 border border-indigo-100">
                        <p className="text-sm font-semibold text-slate-700 mb-3">Ask a question</p>
                        <input
                          type="text"
                          value={qTitle}
                          onChange={(e) => setQTitle(e.target.value)}
                          placeholder="Your question title…"
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white mb-2"
                        />
                        <textarea
                          value={qBody}
                          onChange={(e) => setQBody(e.target.value)}
                          rows={2}
                          placeholder="Add more details (optional)…"
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none bg-white"
                        />
                        <button
                          type="button"
                          onClick={submitQuestion}
                          disabled={askingQ || !qTitle.trim()}
                          className="mt-3 bg-indigo-600 text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition"
                        >
                          {askingQ ? "Posting…" : "Post question"}
                        </button>
                      </div>
                    )}

                    {qaLoading ? (
                      <p className="text-sm text-slate-400">Loading questions…</p>
                    ) : questions.length === 0 ? (
                      <p className="text-sm text-slate-400">No questions yet.{enrolled ? " Be the first to ask!" : ""}</p>
                    ) : (
                      <div className="space-y-3">
                        {questions.map((q) => (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => openQuestion(q.id)}
                            className="w-full text-left bg-white border border-slate-200 rounded-2xl p-4 hover:border-indigo-200 hover:bg-indigo-50 transition"
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  {q.is_answered && (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Answered</span>
                                  )}
                                  <span className="text-sm font-medium text-slate-900">{q.title}</span>
                                </div>
                                <p className="text-xs text-slate-400">
                                  {q.user_name} · {new Date(q.created_at).toLocaleDateString()} · {q.answer_count} answer{q.answer_count !== 1 ? "s" : ""}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: purchase card */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="text-3xl font-bold text-slate-900">
                {course.price_usd === 0 ? "Free" : `$${course.price_usd}`}
              </div>
              {course.price_inr > 0 && (
                <p className="text-sm text-slate-400">₹{course.price_inr} for India</p>
              )}

              {enrolled ? (
                <Link
                  href={`/learn/${course.id}`}
                  className="block w-full bg-green-600 text-white text-center py-3 rounded-xl font-semibold hover:bg-green-700 transition"
                >
                  Continue learning →
                </Link>
              ) : (
                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {enrolling ? "Enrolling…" : course.price_usd === 0 ? "Enroll for free" : "Enroll now"}
                </button>
              )}

              <ul className="text-sm text-slate-600 space-y-2 pt-2">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> {course.modules.length} modules</li>
                {freeModules.length > 0 && (
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> {freeModules.length} free preview lessons</li>
                )}
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Certificate on completion</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
