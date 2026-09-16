"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Circle, ChevronLeft, Lock, RotateCcw, ChevronDown, ChevronUp, ArrowLeft, Trash2, FileDown, Pencil } from "lucide-react";
import api from "@/lib/api";
import { toast } from "@/components/ui/Toast";

interface Module {
  id: number;
  title: string;
  module_type: string;
  is_preview_free: boolean;
  order_index: number;
  is_drip_locked?: boolean;
  available_in_days?: number;
}

interface Quiz {
  id: number;
  title: string;
  max_attempts: number;
  show_answers_after: boolean;
  passing_score_pct: number;
  questions: { question: string; options: string[] }[];
}

interface QuizResult {
  score: number;
  total: number;
  score_pct: number;
  passed: boolean;
  passing_pct: number;
  attempts_used: number;
  attempts_remaining: number;
  correct_answers?: number[];
}

interface Course {
  id: number;
  title: string;
  slug: string;
  instructor_id?: number;
  modules: Module[];
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

interface Note {
  id: number;
  course_id: number;
  module_id: number;
  timestamp_seconds: number | null;
  body: string;
  created_at: string;
  updated_at: string;
}

export default function LearnPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [progressMap, setProgressMap] = useState<Record<number, boolean>>({});
  const [activeModule, setActiveModule] = useState<Module | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [marking, setMarking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedPosition, setSavedPosition] = useState(0);
  const [captionUrl, setCaptionUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const positionTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [me, setMe] = useState<Me | null>(null);

  // Q&A state
  const [qaOpen, setQaOpen] = useState(false);
  const [qaQuestions, setQaQuestions] = useState<QAQuestion[]>([]);
  const [qaLoading, setQaLoading] = useState(false);
  const [qaSelectedQ, setQaSelectedQ] = useState<QADetail | null>(null);
  const [qaTitle, setQaTitle] = useState("");
  const [qaBody, setQaBody] = useState("");
  const [qaPosting, setQaPosting] = useState(false);
  const [qaAnswerBody, setQaAnswerBody] = useState("");
  const [qaPostingA, setQaPostingA] = useState(false);

  // Notes state
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteBody, setNoteBody] = useState("");
  const [noteTimestamp, setNoteTimestamp] = useState<number | null>(null);
  const [notePosting, setNotePosting] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingBody, setEditingBody] = useState("");

  useEffect(() => {
    Promise.all([
      api.get(`/api/v1/courses/${courseId}`),
      api.get("/api/v1/enrollments/me"),
      api.get("/api/v1/auth/me").catch(() => null),
    ]).then(([courseRes, enrollRes, meRes]) => {
      const c: Course = courseRes.data;
      setCourse(c);
      if (meRes) setMe(meRes.data);
      const enrollment = enrollRes.data.find((e: any) => e.course_id === Number(courseId));
      if (!enrollment) { router.push("/courses"); return; }
      if (c.modules.length > 0) {
        const firstUnlocked = c.modules.find((m) => !m.is_drip_locked);
        setActiveModule(firstUnlocked ?? c.modules[0]);
      }
    }).catch(() => router.push("/courses"))
      .finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => {
    if (!activeModule) return;
    setTextContent(null);
    setQuiz(null);
    setQuizResult(null);
    setAnswers({});
    setSavedPosition(0);
    setCaptionUrl(null);
    setQaOpen(false);
    setQaSelectedQ(null);
    setQaQuestions([]);
    setQaTitle("");
    setQaBody("");
    setQaAnswerBody("");
    setNotesOpen(false);
    setNotes([]);
    setNoteBody("");
    setNoteTimestamp(null);
    setEditingNoteId(null);
    setEditingBody("");

    if (activeModule.module_type === "text") {
      api.get(`/api/v1/courses/${courseId}/modules/${activeModule.id}/content`)
        .then(({ data }) => setTextContent(data.rich_text_html))
        .catch(() => setTextContent("<p>Content unavailable.</p>"));
    } else if (activeModule.module_type === "quiz") {
      api.get(`/api/v1/courses/${courseId}/modules/${activeModule.id}/quiz`)
        .then(({ data }) => setQuiz(data))
        .catch(() => setQuiz(null));
    } else if (activeModule.module_type === "video") {
      api.get(`/api/v1/enrollments/${courseId}/position/${activeModule.id}`)
        .then(({ data }) => setSavedPosition(data.position_seconds || 0))
        .catch(() => {});
      api.get(`/api/v1/media/caption-url/${activeModule.id}`)
        .then(({ data }) => setCaptionUrl(data.url || null))
        .catch(() => {});
    }

    loadQAQuestions(activeModule.id);
    loadNotes(activeModule.id);

    return () => {
      if (positionTimer.current) clearInterval(positionTimer.current);
    };
  }, [activeModule?.id]);

  async function loadQAQuestions(moduleId: number) {
    setQaLoading(true);
    try {
      const { data } = await api.get(`/api/v1/courses/${courseId}/questions?module_id=${moduleId}`);
      setQaQuestions(data);
    } finally {
      setQaLoading(false);
    }
  }

  async function openQAQuestion(id: number) {
    const { data } = await api.get(`/api/v1/questions/${id}`);
    setQaSelectedQ(data);
    setQaAnswerBody("");
  }

  async function submitQAQuestion() {
    if (!activeModule || !qaTitle.trim()) return;
    setQaPosting(true);
    try {
      await api.post(`/api/v1/courses/${courseId}/questions`, {
        title: qaTitle.trim(),
        body: qaBody.trim() || null,
        module_id: activeModule.id,
      });
      setQaTitle("");
      setQaBody("");
      await loadQAQuestions(activeModule.id);
      toast.success("Question posted!");
    } catch {
      toast.error("Failed to post question.");
    } finally {
      setQaPosting(false);
    }
  }

  async function submitQAAnswer() {
    if (!qaSelectedQ || !qaAnswerBody.trim()) return;
    setQaPostingA(true);
    try {
      await api.post(`/api/v1/questions/${qaSelectedQ.id}/answers`, { body: qaAnswerBody.trim() });
      setQaAnswerBody("");
      const { data } = await api.get(`/api/v1/questions/${qaSelectedQ.id}`);
      setQaSelectedQ(data);
    } catch {
      toast.error("Failed to post answer.");
    } finally {
      setQaPostingA(false);
    }
  }

  async function acceptQAAnswer(answerId: number) {
    if (!qaSelectedQ) return;
    try {
      await api.put(`/api/v1/answers/${answerId}/accept`);
      const { data } = await api.get(`/api/v1/questions/${qaSelectedQ.id}`);
      setQaSelectedQ(data);
    } catch {
      toast.error("Failed to accept answer.");
    }
  }

  async function deleteQAQuestion(id: number) {
    if (!activeModule) return;
    try {
      await api.delete(`/api/v1/questions/${id}`);
      setQaSelectedQ(null);
      await loadQAQuestions(activeModule.id);
    } catch {
      toast.error("Failed to delete question.");
    }
  }

  async function deleteQAAnswer(id: number) {
    if (!qaSelectedQ) return;
    try {
      await api.delete(`/api/v1/answers/${id}`);
      const { data } = await api.get(`/api/v1/questions/${qaSelectedQ.id}`);
      setQaSelectedQ(data);
    } catch {
      toast.error("Failed to delete answer.");
    }
  }

  function canModifyQA(authorId: number): boolean {
    if (!me) return false;
    return me.id === authorId || me.role === "admin" || (course?.instructor_id != null && me.id === course.instructor_id);
  }

  function handleVideoLoaded() {
    if (videoRef.current && savedPosition > 0) {
      videoRef.current.currentTime = savedPosition;
    }
    if (positionTimer.current) clearInterval(positionTimer.current);
    positionTimer.current = setInterval(() => {
      if (!activeModule || !videoRef.current) return;
      const pos = Math.floor(videoRef.current.currentTime);
      if (pos > 0) {
        api.post(`/api/v1/enrollments/${courseId}/position`, {
          module_id: activeModule.id,
          position_seconds: pos,
        }).catch(() => {});
      }
    }, 10000);
  }

  async function markComplete() {
    if (!activeModule || marking) return;
    setMarking(true);
    try {
      await api.post(`/api/v1/enrollments/${courseId}/progress`, { module_id: activeModule.id });
      setProgressMap((prev) => ({ ...prev, [activeModule.id]: true }));
      const idx = course!.modules.findIndex((m) => m.id === activeModule.id);
      const nextUnlocked = course!.modules.slice(idx + 1).find((m) => !m.is_drip_locked);
      if (nextUnlocked) setActiveModule(nextUnlocked);
    } finally {
      setMarking(false);
    }
  }

  async function submitQuiz() {
    if (!quiz || !activeModule) return;
    setSubmitting(true);
    try {
      const answersList = quiz.questions.map((_, i) => answers[i] ?? -1);
      const { data } = await api.post(
        `/api/v1/enrollments/${courseId}/quiz/${activeModule.id}/submit`,
        { answers: answersList }
      );
      setQuizResult(data);
      if (data.passed) {
        setProgressMap((prev) => ({ ...prev, [activeModule.id]: true }));
      }
    } catch (err: any) {
      if (err?.response?.status === 429) {
        setQuizResult({
          score: 0, total: quiz.questions.length, score_pct: 0,
          passed: false, passing_pct: quiz.passing_score_pct,
          attempts_used: quiz.max_attempts, attempts_remaining: 0,
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  function retakeQuiz() {
    setQuizResult(null);
    setAnswers({});
  }

  async function loadNotes(moduleId: number) {
    setNotesLoading(true);
    try {
      const { data } = await api.get(`/api/v1/courses/${courseId}/notes?module_id=${moduleId}`);
      setNotes(data);
    } finally {
      setNotesLoading(false);
    }
  }

  async function createNote() {
    if (!activeModule || !noteBody.trim()) return;
    setNotePosting(true);
    try {
      await api.post(`/api/v1/courses/${courseId}/notes`, {
        module_id: activeModule.id,
        timestamp_seconds: noteTimestamp,
        body: noteBody.trim(),
      });
      setNoteBody("");
      setNoteTimestamp(null);
      await loadNotes(activeModule.id);
    } catch {
      toast.error("Failed to save note.");
    } finally {
      setNotePosting(false);
    }
  }

  async function updateNote() {
    if (!editingNoteId || !editingBody.trim()) return;
    try {
      await api.put(`/api/v1/notes/${editingNoteId}`, { body: editingBody.trim() });
      setEditingNoteId(null);
      setEditingBody("");
      if (activeModule) await loadNotes(activeModule.id);
    } catch {
      toast.error("Failed to update note.");
    }
  }

  async function deleteNote(id: number) {
    try {
      await api.delete(`/api/v1/notes/${id}`);
      if (activeModule) await loadNotes(activeModule.id);
    } catch {
      toast.error("Failed to delete note.");
    }
  }

  async function exportNotes() {
    try {
      const res = await api.get(`/api/v1/courses/${courseId}/notes/export`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${course?.title ?? "course"}-notes.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to export notes.");
    }
  }

  function fmtTimestamp(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  if (loading) return <div className="h-screen flex items-center justify-center text-slate-400">Loading…</div>;
  if (!course) return null;

  const completedCount = Object.values(progressMap).filter(Boolean).length;
  const totalCount = course.modules.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isVideoModule = activeModule?.module_type === "video";

  const qaPanel = activeModule && (
    <div className="mt-8 border border-slate-200 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setQaOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition text-left"
      >
        <span className="font-semibold text-slate-800 text-sm">
          Module Q&amp;A
          {qaQuestions.length > 0 && (
            <span className="ml-2 text-xs text-slate-400 font-normal">{qaQuestions.length} question{qaQuestions.length !== 1 ? "s" : ""}</span>
          )}
        </span>
        {qaOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {qaOpen && (
        <div className="p-5 space-y-4">
          {qaSelectedQ ? (
            <div>
              <button
                type="button"
                onClick={() => setQaSelectedQ(null)}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
              >
                <ArrowLeft className="w-4 h-4" /> Back to questions
              </button>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {qaSelectedQ.is_answered && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Answered</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-slate-900 text-sm">{qaSelectedQ.title}</h3>
                    {qaSelectedQ.body && <p className="text-sm text-slate-600 mt-1">{qaSelectedQ.body}</p>}
                    <p className="text-xs text-slate-400 mt-2">by {qaSelectedQ.user_name} · {new Date(qaSelectedQ.created_at).toLocaleDateString()}</p>
                  </div>
                  {canModifyQA(qaSelectedQ.user_id) && (
                    <button
                      type="button"
                      onClick={() => deleteQAQuestion(qaSelectedQ.id)}
                      className="text-slate-300 hover:text-red-400 transition shrink-0"
                      aria-label="Delete question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {qaSelectedQ.answers.length > 0 && (
                <div className="space-y-3 mb-4">
                  <p className="text-sm font-semibold text-slate-700">
                    {qaSelectedQ.answers.length} answer{qaSelectedQ.answers.length !== 1 ? "s" : ""}
                  </p>
                  {qaSelectedQ.answers.map((a) => (
                    <div
                      key={a.id}
                      className={`rounded-2xl p-4 border ${a.is_accepted ? "bg-green-50 border-green-200" : "bg-white border-slate-200"}`}
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
                          {!a.is_accepted && me && me.id === qaSelectedQ.user_id && (
                            <button
                              type="button"
                              onClick={() => acceptQAAnswer(a.id)}
                              className="text-xs text-green-600 hover:text-green-700 font-medium border border-green-200 px-2 py-0.5 rounded-lg transition"
                            >
                              Accept
                            </button>
                          )}
                          {canModifyQA(a.user_id) && (
                            <button
                              type="button"
                              onClick={() => deleteQAAnswer(a.id)}
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

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <p className="text-sm font-semibold text-slate-700 mb-2">Post an answer</p>
                <textarea
                  value={qaAnswerBody}
                  onChange={(e) => setQaAnswerBody(e.target.value)}
                  rows={3}
                  placeholder="Share your knowledge…"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none bg-white"
                />
                <button
                  type="button"
                  onClick={submitQAAnswer}
                  disabled={qaPostingA || !qaAnswerBody.trim()}
                  className="mt-2 bg-indigo-600 text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {qaPostingA ? "Posting…" : "Post answer"}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="bg-indigo-50 rounded-2xl p-4 mb-4 border border-indigo-100">
                <p className="text-sm font-semibold text-slate-700 mb-3">Ask a question about this module</p>
                <input
                  type="text"
                  value={qaTitle}
                  onChange={(e) => setQaTitle(e.target.value)}
                  placeholder="Your question title…"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white mb-2"
                />
                <textarea
                  value={qaBody}
                  onChange={(e) => setQaBody(e.target.value)}
                  rows={2}
                  placeholder="Add more details (optional)…"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none bg-white"
                />
                <button
                  type="button"
                  onClick={submitQAQuestion}
                  disabled={qaPosting || !qaTitle.trim()}
                  className="mt-3 bg-indigo-600 text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {qaPosting ? "Posting…" : "Post question"}
                </button>
              </div>

              {qaLoading ? (
                <p className="text-sm text-slate-400">Loading questions…</p>
              ) : qaQuestions.length === 0 ? (
                <p className="text-sm text-slate-400">No questions yet for this module. Be the first to ask!</p>
              ) : (
                <div className="space-y-2">
                  {qaQuestions.map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => openQAQuestion(q.id)}
                      className="w-full text-left bg-white border border-slate-200 rounded-2xl p-4 hover:border-indigo-200 hover:bg-indigo-50 transition"
                    >
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {q.is_answered && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Answered</span>
                        )}
                        <span className="text-sm font-medium text-slate-900">{q.title}</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {q.user_name} · {new Date(q.created_at).toLocaleDateString()} · {q.answer_count} answer{q.answer_count !== 1 ? "s" : ""}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const notesPanel = activeModule && (
    <div className="mt-4 border border-slate-200 rounded-2xl overflow-hidden">
      <div className="w-full flex items-center justify-between px-5 py-4 bg-slate-50">
        <button
          type="button"
          onClick={() => setNotesOpen((v) => !v)}
          className="flex items-center gap-2 text-left flex-1"
        >
          <span className="font-semibold text-slate-800 text-sm">
            My Notes
            {notes.length > 0 && (
              <span className="ml-2 text-xs text-slate-400 font-normal">{notes.length} note{notes.length !== 1 ? "s" : ""}</span>
            )}
          </span>
          {notesOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        <button
          type="button"
          onClick={exportNotes}
          title="Export all course notes"
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition px-2 py-1 rounded-lg hover:bg-indigo-50"
        >
          <FileDown className="w-4 h-4" />
          Export
        </button>
      </div>

      {notesOpen && (
        <div className="p-5 space-y-4">
          {notesLoading ? (
            <p className="text-sm text-slate-400">Loading notes…</p>
          ) : (
            <>
              {notes.length > 0 && (
                <div className="space-y-3">
                  {notes.map((n) => (
                    <div key={n.id} className="bg-white border border-slate-200 rounded-2xl p-4">
                      {editingNoteId === n.id ? (
                        <div>
                          <textarea
                            value={editingBody}
                            onChange={(e) => setEditingBody(e.target.value)}
                            rows={3}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              type="button"
                              onClick={updateNote}
                              disabled={!editingBody.trim()}
                              className="bg-indigo-600 text-white text-xs font-semibold px-4 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => { setEditingNoteId(null); setEditingBody(""); }}
                              className="text-xs text-slate-500 hover:text-slate-700 px-4 py-1.5 rounded-lg border border-slate-200 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            {n.timestamp_seconds !== null && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (isVideoModule && videoRef.current) {
                                    videoRef.current.currentTime = n.timestamp_seconds!;
                                  }
                                }}
                                title={isVideoModule ? "Seek to this moment" : undefined}
                                className={`inline-flex items-center text-xs font-mono bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md mb-1.5 ${isVideoModule ? "hover:bg-indigo-200 cursor-pointer" : "cursor-default"}`}
                              >
                                {fmtTimestamp(n.timestamp_seconds)}
                              </button>
                            )}
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{n.body}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => { setEditingNoteId(n.id); setEditingBody(n.body); }}
                              className="text-slate-300 hover:text-indigo-400 transition"
                              aria-label="Edit note"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteNote(n.id)}
                              className="text-slate-300 hover:text-red-400 transition"
                              aria-label="Delete note"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                <p className="text-sm font-semibold text-slate-700 mb-2">Add a note</p>
                {isVideoModule && noteTimestamp !== null && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md">
                      {fmtTimestamp(noteTimestamp)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setNoteTimestamp(null)}
                      className="text-xs text-slate-400 hover:text-red-400 transition"
                    >
                      ✕ clear
                    </button>
                  </div>
                )}
                <textarea
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  rows={3}
                  placeholder="Write your note…"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none bg-white"
                />
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {isVideoModule && (
                    <button
                      type="button"
                      onClick={() => setNoteTimestamp(Math.floor(videoRef.current?.currentTime ?? 0))}
                      className="text-xs text-indigo-600 hover:text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg transition"
                    >
                      Capture timestamp
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={createNote}
                    disabled={notePosting || !noteBody.trim()}
                    className="bg-amber-500 text-white text-sm font-semibold px-5 py-1.5 rounded-xl hover:bg-amber-600 disabled:opacity-50 transition"
                  >
                    {notePosting ? "Saving…" : "Add note"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="px-4 py-4 border-b border-slate-200">
          <Link href="/dashboard" className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" /> My Dashboard
          </Link>
          <h2 className="font-semibold text-slate-900 text-sm leading-tight">{course.title}</h2>
          <div className="mt-2">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{completedCount} / {totalCount} complete</span>
              <span>{progressPct}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${completedCount} of ${totalCount} modules complete`}
              className="h-1.5 bg-slate-100 rounded-full"
            >
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
        <nav aria-label="Course modules" className="flex-1 overflow-y-auto py-2">
          {course.modules.map((m, i) => {
            const done = progressMap[m.id];
            const active = activeModule?.id === m.id;
            const locked = !!m.is_drip_locked;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => !locked && setActiveModule(m)}
                disabled={locked}
                aria-current={active ? "true" : undefined}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition ${
                  locked
                    ? "opacity-60 cursor-not-allowed"
                    : active
                    ? "bg-indigo-50"
                    : "hover:bg-slate-50"
                }`}
              >
                {locked ? (
                  <Lock className="w-4 h-4 mt-0.5 shrink-0 text-slate-300" aria-hidden="true" />
                ) : done ? (
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" aria-hidden="true" />
                ) : (
                  <Circle className={`w-4 h-4 mt-0.5 shrink-0 ${active ? "text-indigo-400" : "text-slate-300"}`} aria-hidden="true" />
                )}
                <div>
                  <p className={`text-xs font-medium leading-tight ${locked ? "text-slate-400" : active ? "text-indigo-700" : "text-slate-700"}`}>
                    {i + 1}. {m.title}
                  </p>
                  {locked ? (
                    <p className="text-xs text-amber-500 mt-0.5 font-medium">
                      Available in {m.available_in_days ?? 0} day{(m.available_in_days ?? 0) !== 1 ? "s" : ""}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-0.5 capitalize">{m.module_type}</p>
                  )}
                </div>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main aria-label="Course content" className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {activeModule ? (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">{activeModule.title}</h1>
                <p className="text-sm text-slate-400 capitalize mt-1">{activeModule.module_type}</p>
              </div>

              {/* Video module */}
              {activeModule.module_type === "video" && (
                <div className="mb-6">
                  <div className="aspect-video bg-slate-900 rounded-2xl flex items-center justify-center">
                    <div className="text-center text-slate-400">
                      <Lock className="w-8 h-8 mx-auto mb-2" aria-hidden="true" />
                      <p className="text-sm">Video player — connect AWS CloudFront to enable</p>
                      {savedPosition > 0 && (
                        <p className="text-xs mt-2 text-indigo-400">
                          Resume at {Math.floor(savedPosition / 60)}:{String(savedPosition % 60).padStart(2, "0")}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Real player (uncomment when CloudFront is wired):
                  <video
                    ref={videoRef}
                    className="w-full rounded-2xl"
                    controls
                    onLoadedMetadata={handleVideoLoaded}
                    src="<cloudfront-signed-url>"
                  >
                    {captionUrl && (
                      <track kind="captions" src={captionUrl} srcLang="en" label="English" default />
                    )}
                  </video>
                  */}
                </div>
              )}

              {/* Text module */}
              {activeModule.module_type === "text" && textContent && (
                <div
                  className="prose prose-slate max-w-none mb-6"
                  dangerouslySetInnerHTML={{ __html: textContent }}
                />
              )}

              {/* Quiz module */}
              {activeModule.module_type === "quiz" && quiz && !quizResult && (
                <div className="space-y-6 mb-6">
                  {quiz.max_attempts > 0 && (
                    <p className="text-xs text-slate-500">
                      Pass mark: {quiz.passing_score_pct}% &middot; Max attempts: {quiz.max_attempts}
                    </p>
                  )}
                  {quiz.questions.map((q, qi) => (
                    <div key={qi} className="bg-white border border-slate-200 rounded-2xl p-5">
                      <p className="font-medium text-slate-900 mb-3">{qi + 1}. {q.question}</p>
                      <div className="space-y-2" role="radiogroup" aria-label={`Question ${qi + 1}`}>
                        {q.options.map((opt, oi) => (
                          <label key={oi} className="flex items-center gap-3 cursor-pointer group">
                            <input
                              type="radio"
                              name={`q-${qi}`}
                              checked={answers[qi] === oi}
                              onChange={() => setAnswers((prev) => ({ ...prev, [qi]: oi }))}
                              className="accent-indigo-600"
                            />
                            <span className="text-sm text-slate-700 group-hover:text-slate-900">{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={submitQuiz}
                    disabled={submitting || Object.keys(answers).length < quiz.questions.length}
                    className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 transition"
                  >
                    {submitting ? "Submitting…" : "Submit quiz"}
                  </button>
                </div>
              )}

              {/* Quiz result */}
              {activeModule.module_type === "quiz" && quizResult && (
                <div className="mb-6 space-y-4">
                  <div className={`rounded-2xl p-6 text-center ${
                    quizResult.passed
                      ? "bg-green-50 border border-green-200"
                      : "bg-amber-50 border border-amber-200"
                  }`}>
                    <p className="text-3xl font-bold text-slate-900 mb-1">{quizResult.score_pct}%</p>
                    <p className="text-sm font-medium text-slate-700 mb-1">
                      {quizResult.score} / {quizResult.total} correct
                    </p>
                    <p className={`text-sm font-semibold ${quizResult.passed ? "text-green-700" : "text-amber-700"}`}>
                      {quizResult.passed ? "Passed! Module marked complete." : `Not yet — need ${quizResult.passing_pct}% to pass.`}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      Attempt {quizResult.attempts_used} of {quizResult.attempts_used + quizResult.attempts_remaining}
                      {quizResult.attempts_remaining > 0 && !quizResult.passed && " — retake available"}
                    </p>
                  </div>

                  {quizResult.correct_answers && quiz && (
                    <div className="space-y-3">
                      {quiz.questions.map((q, qi) => {
                        const selected = answers[qi];
                        const correct = quizResult.correct_answers![qi];
                        const isRight = selected === correct;
                        return (
                          <div key={qi} className={`bg-white border rounded-2xl p-4 ${isRight ? "border-green-200" : "border-red-200"}`}>
                            <p className="text-sm font-medium text-slate-900 mb-2">{qi + 1}. {q.question}</p>
                            {q.options.map((opt, oi) => (
                              <p key={oi} className={`text-sm px-3 py-1 rounded-lg mb-1 ${
                                oi === correct ? "bg-green-100 text-green-800 font-medium" :
                                oi === selected && !isRight ? "bg-red-100 text-red-700" :
                                "text-slate-500"
                              }`}>
                                {oi === correct ? "✓ " : oi === selected ? "✗ " : ""}{opt}
                              </p>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!quizResult.passed && quizResult.attempts_remaining > 0 && (
                    <button
                      type="button"
                      onClick={retakeQuiz}
                      className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition"
                    >
                      <RotateCcw className="w-4 h-4" aria-hidden="true" />
                      Retake quiz
                    </button>
                  )}

                  {qaPanel}
                  {notesPanel}
                </div>
              )}

              {/* Mark complete button (non-quiz) */}
              {activeModule.module_type !== "quiz" && (
                <>
                  <button
                    type="button"
                    onClick={markComplete}
                    disabled={marking || progressMap[activeModule.id]}
                    className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition ${
                      progressMap[activeModule.id]
                        ? "bg-green-50 text-green-600 border border-green-200 cursor-default"
                        : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                    }`}
                  >
                    {progressMap[activeModule.id] ? "Completed ✓" : marking ? "Saving…" : "Mark as complete"}
                  </button>
                  {qaPanel}
                  {notesPanel}
                </>
              )}
            </>
          ) : (
            <div className="text-center py-20 text-slate-400">Select a module to begin learning.</div>
          )}
        </div>
      </main>
    </div>
  );
}
