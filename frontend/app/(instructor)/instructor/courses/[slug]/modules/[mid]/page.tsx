"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Trash2, Save, CheckCircle, Upload } from "lucide-react";
import api from "@/lib/api";

interface ModuleData {
  id: number;
  title: string;
  module_type: "video" | "text" | "quiz";
  video_content?: { s3_key: string | null } | null;
  text_content?: { rich_text_html: string | null } | null;
  quiz?: {
    passing_score_pct: number;
    max_attempts: number;
    show_answers_after: boolean;
    questions: QuizQuestion[];
  } | null;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
}

interface QuizState {
  passing_score_pct: number;
  max_attempts: number;
  show_answers_after: boolean;
  questions: QuizQuestion[];
}

export default function ModuleContentPage() {
  const { slug, mid } = useParams<{ slug: string; mid: string }>();
  const router = useRouter();
  const courseId = Number(slug);
  const moduleId = Number(mid);

  const [module, setModule] = useState<ModuleData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [s3Key, setS3Key] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = useState<"idle" | "requesting" | "uploading" | "done" | "error">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [richText, setRichText] = useState("");
  const [quiz, setQuiz] = useState<QuizState>({
    passing_score_pct: 70,
    max_attempts: 3,
    show_answers_after: true,
    questions: [],
  });

  useEffect(() => {
    api.get(`/api/v1/courses/${courseId}/modules/${moduleId}/editor`).then(({ data }) => {
      setModule(data);
      if (data.module_type === "video" && data.video_content) {
        setS3Key(data.video_content.s3_key ?? "");
      } else if (data.module_type === "text" && data.text_content) {
        setRichText(data.text_content.rich_text_html ?? "");
      } else if (data.module_type === "quiz" && data.quiz) {
        setQuiz({
          passing_score_pct: data.quiz.passing_score_pct ?? 70,
          max_attempts: data.quiz.max_attempts ?? 3,
          show_answers_after: data.quiz.show_answers_after ?? true,
          questions: data.quiz.questions ?? [],
        });
      }
    });
  }, [courseId, moduleId]);

  async function saveVideo() {
    setSaving(true);
    setError("");
    try {
      await api.put(`/api/v1/courses/${courseId}/modules/${moduleId}/video-content`, { s3_key: s3Key });
      flash();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveText() {
    setSaving(true);
    setError("");
    try {
      await api.put(`/api/v1/courses/${courseId}/modules/${moduleId}/text-content`, { rich_text_html: richText });
      flash();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveQuiz() {
    setSaving(true);
    setError("");
    try {
      await api.put(`/api/v1/courses/${courseId}/modules/${moduleId}/quiz-content`, quiz);
      flash();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function flash() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function addQuestion() {
    setQuiz((q) => ({
      ...q,
      questions: [...q.questions, { question: "", options: ["", ""], correct_index: 0 }],
    }));
  }

  function removeQuestion(idx: number) {
    setQuiz((q) => ({ ...q, questions: q.questions.filter((_, i) => i !== idx) }));
  }

  function updateQuestion(idx: number, field: keyof QuizQuestion, value: unknown) {
    setQuiz((q) => ({
      ...q,
      questions: q.questions.map((qn, i) => (i === idx ? { ...qn, [field]: value } : qn)),
    }));
  }

  function addOption(qIdx: number) {
    setQuiz((q) => ({
      ...q,
      questions: q.questions.map((qn, i) =>
        i === qIdx ? { ...qn, options: [...qn.options, ""] } : qn
      ),
    }));
  }

  function removeOption(qIdx: number, oIdx: number) {
    setQuiz((q) => ({
      ...q,
      questions: q.questions.map((qn, i) =>
        i === qIdx ? { ...qn, options: qn.options.filter((_, j) => j !== oIdx) } : qn
      ),
    }));
  }

  function updateOption(qIdx: number, oIdx: number, value: string) {
    setQuiz((q) => ({
      ...q,
      questions: q.questions.map((qn, i) =>
        i === qIdx ? { ...qn, options: qn.options.map((o, j) => (j === oIdx ? value : o)) } : qn
      ),
    }));
  }

  if (!module) return <div className="p-8 text-slate-400">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <button
        type="button"
        onClick={() => router.push(`/instructor/courses/${slug}/edit`)}
        className="text-sm text-slate-400 hover:text-slate-600 mb-4 block"
      >
        ← Back to Course Builder
      </button>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">{module.title}</h1>
      <p className="text-sm text-slate-500 mb-6 capitalize">{module.module_type} module</p>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {module.module_type === "video" && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Video Content</h2>
          <div>
            <label htmlFor="s3-key" className="block text-sm font-medium text-slate-700 mb-1">
              S3 Key
            </label>
            <input
              id="s3-key"
              value={s3Key}
              onChange={(e) => setS3Key(e.target.value)}
              placeholder="videos/course-id/module-id/filename.m3u8"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-400 mt-1">S3 object key for the processed HLS manifest.</p>
          </div>
          <button
            type="button"
            onClick={saveVideo}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            <Save className="w-4 h-4" aria-hidden="true" />
            {saved ? "Saved!" : saving ? "Saving…" : "Save"}
          </button>
        </section>
      )}

      {module.module_type === "text" && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Text Content</h2>
          <div>
            <label htmlFor="rich-text" className="block text-sm font-medium text-slate-700 mb-1">
              Content (HTML)
            </label>
            <textarea
              id="rich-text"
              rows={16}
              value={richText}
              onChange={(e) => setRichText(e.target.value)}
              placeholder="<p>Write your lesson content here…</p>"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            />
          </div>
          <button
            type="button"
            onClick={saveText}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            <Save className="w-4 h-4" aria-hidden="true" />
            {saved ? "Saved!" : saving ? "Saving…" : "Save"}
          </button>
        </section>
      )}

      {module.module_type === "quiz" && (
        <div className="space-y-4">
          <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Quiz Settings</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Passing score (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={quiz.passing_score_pct}
                  onChange={(e) => setQuiz({ ...quiz, passing_score_pct: Number(e.target.value) })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Max attempts</label>
                <input
                  type="number"
                  min="1"
                  value={quiz.max_attempts}
                  onChange={(e) => setQuiz({ ...quiz, max_attempts: Number(e.target.value) })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex flex-col justify-end pb-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quiz.show_answers_after}
                    onChange={(e) => setQuiz({ ...quiz, show_answers_after: e.target.checked })}
                    className="rounded"
                  />
                  Show answers after
                </label>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                Questions ({quiz.questions.length})
              </h2>
              <button
                type="button"
                onClick={addQuestion}
                className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition"
              >
                <Plus className="w-4 h-4" aria-hidden="true" /> Add Question
              </button>
            </div>

            <div className="space-y-4">
              {quiz.questions.map((qn, qIdx) => (
                <div key={qIdx} className="border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-semibold text-slate-400 mt-2 shrink-0">Q{qIdx + 1}</span>
                    <input
                      value={qn.question}
                      onChange={(e) => updateQuestion(qIdx, "question", e.target.value)}
                      placeholder="Question text…"
                      className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeQuestion(qIdx)}
                      aria-label="Remove question"
                      className="text-slate-300 hover:text-red-500 transition mt-1"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="space-y-2 pl-5">
                    {qn.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${qIdx}`}
                          checked={qn.correct_index === oIdx}
                          onChange={() => updateQuestion(qIdx, "correct_index", oIdx)}
                          aria-label={`Mark option ${oIdx + 1} as correct`}
                          className="accent-indigo-600"
                        />
                        <input
                          value={opt}
                          onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                          placeholder={`Option ${oIdx + 1}…`}
                          className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        />
                        {qn.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeOption(qIdx, oIdx)}
                            aria-label="Remove option"
                            className="text-slate-300 hover:text-red-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addOption(qIdx)}
                      className="text-xs text-slate-400 hover:text-indigo-600 transition"
                    >
                      + Add option
                    </button>
                  </div>
                </div>
              ))}
              {quiz.questions.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-4">
                  No questions yet. Add your first question above.
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={saveQuiz}
                disabled={saving}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                <Save className="w-4 h-4" aria-hidden="true" />
                {saved ? "Saved!" : saving ? "Saving…" : "Save Quiz"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
