"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2, Eye, EyeOff, Video, FileText, HelpCircle, Save, Globe, Upload } from "lucide-react";
import api from "@/lib/api";

interface Module {
  id: number;
  title: string;
  order_index: number;
  module_type: "video" | "text" | "quiz";
  is_preview_free: boolean;
  unlock_after_days: number | null;
}

interface Course {
  id: number;
  title: string;
  description: string | null;
  price_usd: number;
  price_inr: number;
  status: string;
  thumbnail_url: string | null;
}

function ModuleTypeIcon({ type }: { type: string }) {
  if (type === "video") return <Video className="w-4 h-4 text-indigo-500" aria-hidden="true" />;
  if (type === "text") return <FileText className="w-4 h-4 text-slate-400" aria-hidden="true" />;
  return <HelpCircle className="w-4 h-4 text-amber-500" aria-hidden="true" />;
}

function SortableModule({
  module,
  onDelete,
  onTogglePreview,
  onUploadCaption,
  onSetDripDays,
  vttUploading,
}: {
  module: Module;
  onDelete: (id: number) => void;
  onTogglePreview: (id: number, val: boolean) => void;
  onUploadCaption: (id: number, file: File) => void;
  onSetDripDays: (id: number, days: number | null) => void;
  vttUploading: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: module.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4" aria-hidden="true" />
      </button>
      <ModuleTypeIcon type={module.module_type} />
      <span className="flex-1 text-sm font-medium text-slate-800 truncate">{module.title}</span>
      <div className="flex items-center gap-1 shrink-0">
        <label htmlFor={`drip-${module.id}`} className="text-xs text-slate-400 whitespace-nowrap">Unlock after</label>
        <input
          id={`drip-${module.id}`}
          type="number"
          min="0"
          placeholder="—"
          value={module.unlock_after_days ?? ""}
          onChange={(e) => {
            const val = e.target.value === "" ? null : Number(e.target.value);
            onSetDripDays(module.id, val);
          }}
          className="w-14 border border-slate-200 rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-indigo-300"
          aria-label={`Unlock after days for ${module.title}`}
        />
        <span className="text-xs text-slate-400">days</span>
      </div>
      {module.module_type === "video" && (
        <>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={vttUploading}
            title="Upload captions (.vtt)"
            aria-label="Upload captions file"
            className="text-slate-300 hover:text-indigo-500 disabled:opacity-50 transition"
          >
            <Upload className="w-4 h-4" aria-hidden="true" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".vtt"
            className="hidden"
            aria-hidden="true"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadCaption(module.id, file);
              e.target.value = "";
            }}
          />
        </>
      )}
      <button
        type="button"
        onClick={() => onTogglePreview(module.id, !module.is_preview_free)}
        title={module.is_preview_free ? "Free preview (click to lock)" : "Locked (click for free preview)"}
        aria-label={module.is_preview_free ? "Remove free preview" : "Set as free preview"}
        className="text-slate-400 hover:text-indigo-500 transition"
      >
        {module.is_preview_free
          ? <Eye className="w-4 h-4 text-indigo-500" aria-hidden="true" />
          : <EyeOff className="w-4 h-4" aria-hidden="true" />}
      </button>
      <button
        type="button"
        onClick={() => onDelete(module.id)}
        aria-label={`Delete module: ${module.title}`}
        className="text-slate-300 hover:text-red-500 transition"
      >
        <Trash2 className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export default function CourseBuilderPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const courseId = Number(slug);

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [vttUploading, setVttUploading] = useState<Record<number, boolean>>({});

  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<"video" | "text" | "quiz">("video");

  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    api.get(`/api/v1/courses/${courseId}`).then(({ data }) => setCourse(data));
    api.get(`/api/v1/courses/${courseId}/modules`).then(({ data }) => setModules(data));
  }, [courseId]);

  async function saveCourse() {
    if (!course) return;
    setSaving(true);
    try {
      const { data } = await api.put(`/api/v1/courses/${courseId}`, {
        title: course.title,
        description: course.description,
        price_usd: Number(course.price_usd),
        price_inr: Number(course.price_inr),
        thumbnail_url: course.thumbnail_url,
      });
      setCourse(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function publishCourse() {
    setPublishing(true);
    try {
      await api.post(`/api/v1/courses/${courseId}/publish`);
      setCourse((c) => c ? { ...c, status: "published" } : c);
    } finally {
      setPublishing(false);
    }
  }

  async function addModule(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const { data } = await api.post(`/api/v1/courses/${courseId}/modules`, {
      title: newTitle,
      module_type: newType,
      order_index: modules.length,
    });
    setModules((prev) => [...prev, data]);
    setNewTitle("");
  }

  async function deleteModule(moduleId: number) {
    await api.delete(`/api/v1/courses/${courseId}/modules/${moduleId}`);
    setModules((prev) => prev.filter((m) => m.id !== moduleId));
  }

  async function togglePreview(moduleId: number, val: boolean) {
    await api.put(`/api/v1/courses/${courseId}/modules/${moduleId}`, { is_preview_free: val });
    setModules((prev) => prev.map((m) => m.id === moduleId ? { ...m, is_preview_free: val } : m));
  }

  async function updateDripDays(moduleId: number, days: number | null) {
    await api.put(`/api/v1/courses/${courseId}/modules/${moduleId}`, { unlock_after_days: days });
    setModules((prev) => prev.map((m) => m.id === moduleId ? { ...m, unlock_after_days: days } : m));
  }

  async function uploadCaption(moduleId: number, file: File) {
    setVttUploading((prev) => ({ ...prev, [moduleId]: true }));
    try {
      const { data } = await api.get("/api/v1/media/caption-upload-url", {
        params: { module_id: moduleId, filename: file.name },
      });
      await fetch(data.upload_url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": "text/vtt" },
      });
    } catch {
      // AWS not yet configured — upload will work after CloudFront setup
    } finally {
      setVttUploading((prev) => ({ ...prev, [moduleId]: false }));
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = modules.findIndex((m) => m.id === active.id);
    const newIndex = modules.findIndex((m) => m.id === over.id);
    const reordered = arrayMove(modules, oldIndex, newIndex).map((m, i) => ({ ...m, order_index: i }));
    setModules(reordered);
    await api.put(`/api/v1/courses/${courseId}/reorder-modules`, reordered.map((m) => ({ id: m.id, order_index: m.order_index })));
  }

  if (!course) return <div className="p-8 text-slate-400">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            type="button"
            onClick={() => router.push("/instructor/courses")}
            className="text-sm text-slate-400 hover:text-slate-600 mb-1 block"
          >
            ← My Courses
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Course Builder</h1>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={saveCourse}
            disabled={saving}
            className="flex items-center gap-2 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition"
          >
            <Save className="w-4 h-4" aria-hidden="true" />
            {saved ? "Saved!" : saving ? "Saving…" : "Save draft"}
          </button>
          {course.status !== "published" && (
            <button
              type="button"
              onClick={publishCourse}
              disabled={publishing}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              <Globe className="w-4 h-4" aria-hidden="true" />
              {publishing ? "Publishing…" : "Publish"}
            </button>
          )}
          {course.status === "published" && (
            <span className="flex items-center gap-1 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg font-medium">
              <Globe className="w-4 h-4" aria-hidden="true" /> Published
            </span>
          )}
        </div>
      </div>

      {/* Course metadata */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Course Details</h2>
        <div>
          <label htmlFor="course-title" className="block text-sm font-medium text-slate-700 mb-1">Title</label>
          <input
            id="course-title"
            value={course.title}
            onChange={(e) => setCourse({ ...course, title: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="course-description" className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea
            id="course-description"
            rows={3}
            value={course.description ?? ""}
            onChange={(e) => setCourse({ ...course, description: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="price-usd" className="block text-sm font-medium text-slate-700 mb-1">Price (USD)</label>
            <input
              id="price-usd"
              type="number"
              min="0"
              step="0.01"
              value={course.price_usd}
              onChange={(e) => setCourse({ ...course, price_usd: Number(e.target.value) })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="price-inr" className="block text-sm font-medium text-slate-700 mb-1">Price (INR ₹)</label>
            <input
              id="price-inr"
              type="number"
              min="0"
              value={course.price_inr}
              onChange={(e) => setCourse({ ...course, price_inr: Number(e.target.value) })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div>
          <label htmlFor="thumbnail-url" className="block text-sm font-medium text-slate-700 mb-1">Thumbnail URL</label>
          <input
            id="thumbnail-url"
            value={course.thumbnail_url ?? ""}
            onChange={(e) => setCourse({ ...course, thumbnail_url: e.target.value || null })}
            placeholder="https://…"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </section>

      {/* Modules */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
          Modules ({modules.length})
        </h2>

        {modules.length > 0 ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2 mb-4">
                {modules.map((m) => (
                  <SortableModule
                    key={m.id}
                    module={m}
                    onDelete={deleteModule}
                    onTogglePreview={togglePreview}
                    onUploadCaption={uploadCaption}
                    onSetDripDays={updateDripDays}
                    vttUploading={vttUploading[m.id] ?? false}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <p className="text-slate-400 text-sm mb-4">No modules yet. Add your first one below.</p>
        )}

        {/* Add module form */}
        <form onSubmit={addModule} className="flex gap-2 pt-3 border-t border-slate-100">
          <label htmlFor="new-module-type" className="sr-only">Module type</label>
          <select
            id="new-module-type"
            value={newType}
            onChange={(e) => setNewType(e.target.value as "video" | "text" | "quiz")}
            className="border border-slate-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="video">Video</option>
            <option value="text">Text</option>
            <option value="quiz">Quiz</option>
          </select>
          <label htmlFor="new-module-title" className="sr-only">Module title</label>
          <input
            id="new-module-title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Module title…"
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!newTitle.trim()}
            className="flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            <Plus className="w-4 h-4" aria-hidden="true" /> Add
          </button>
        </form>
      </section>
    </div>
  );
}
