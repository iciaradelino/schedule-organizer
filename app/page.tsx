"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import EventForm, { type EventDraft, COLORS } from "@/components/EventForm";
import EventList from "@/components/EventList";
import DraftCalendar from "@/components/DraftCalendar";
import type { CalendarEvent } from "@/app/api/export-ics/route";
import type { ImportedEvent } from "@/app/api/import-ics/route";

const CalendarView = dynamic(() => import("@/components/CalendarView"), { ssr: false });

function getWeekStart(weekStartDay: 0 | 1): string {
  const today = new Date();
  const day = today.getDay(); // 0=Sun, 1=Mon, ...
  // days to subtract to reach the desired start day
  const offset = weekStartDay === 1
    ? (day === 0 ? 6 : day - 1)  // back to Monday
    : day;                         // back to Sunday
  const d = new Date(today);
  d.setDate(today.getDate() - offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function dayLabel(dateStr: string) {
  if (!dateStr) return "";
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" });
}

export default function Home() {
  const [weekStartDay, setWeekStartDay] = useState<0 | 1>(1); // 0=Sun, 1=Mon
  const [weekStart, setWeekStart] = useState(() => getWeekStart(1));
  const [preferences, setPreferences] = useState("");
  const [drafts, setDrafts] = useState<EventDraft[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState<EventDraft | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [resultView, setResultView] = useState<"list" | "calendar">("list");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleWeekStartDayChange(day: 0 | 1) {
    setWeekStartDay(day);
    setWeekStart(getWeekStart(day));
  }

  function handleSaveDraft(draft: EventDraft) {
    if (editingDraft) {
      setDrafts((d) => d.map((x) => (x.id === draft.id ? draft : x)));
      setEditingDraft(null);
    } else {
      setDrafts((d) => [...d, draft]);
    }
    setFormOpen(false);
  }

  function handleEditDraft(draft: EventDraft) {
    setEditingDraft(draft);
    setFormOpen(true);
  }

  function handleCancelForm() {
    setEditingDraft(null);
    setFormOpen(false);
  }

  function handleRemoveDraft(id: string) {
    setDrafts((d) => d.filter((x) => x.id !== id));
  }

  async function handleImportIcs(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("weekStart", weekStart);
      const res = await fetch("/api/import-ics", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      const imported: ImportedEvent[] = data.events;
      // convert imported events to drafts, tagged as imported
      const newDrafts: EventDraft[] = imported.map((ev) => ({
        id: ev.id,
        name: ev.name,
        color: COLORS[1],
        notes: "",
        flexible: false,
        durationMinutes: 60,
        imported: true,
        slots: [{ date: ev.date || weekStart, startTime: ev.startTime, endTime: ev.endTime }],
      }));
      setDrafts((d) => [...d, ...newDrafts]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
      // reset input so same file can be re-uploaded
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleGenerate() {
    if (drafts.length === 0) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/parse-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drafts, preferences, weekStart }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unknown error");
      setEvents(data.events);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    const res = await fetch("/api/export-ics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
    });
    if (!res.ok) { setError("Export failed"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "weekly-planner.ics";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleRemoveEvent(index: number) {
    setEvents((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <header className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <span className="text-sm font-semibold tracking-tight">WeekPlanner</span>
        {events.length > 0 && (
          <div className="flex items-center gap-4">
            <button
              onClick={() => setResultView(resultView === "list" ? "calendar" : "list")}
              className="text-sm text-gray-500 hover:text-black transition-colors"
            >
              {resultView === "list" ? "Calendar view" : "List view"}
            </button>
            <button
              onClick={handleExport}
              className="text-sm font-medium bg-black text-white px-4 py-2 hover:bg-gray-800 transition-colors"
            >
              Export to Google Calendar
            </button>
          </div>
        )}
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex gap-8 items-start">

          {/* left column */}
          <div className="flex-1 min-w-0 space-y-8">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">Plan your week</h1>
              <p className="text-sm text-gray-500">
                Add your events, set any preferences, then generate your calendar.
              </p>
            </div>

            {/* week controls row */}
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-500 shrink-0">Week starting</label>
                <input
                  type="date"
                  value={weekStart}
                  onChange={(e) => setWeekStart(e.target.value)}
                  className="border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:border-black"
                />
              </div>

              {/* Mon/Sun toggle */}
              <div className="flex items-center gap-1 border border-gray-300 text-sm">
                <button
                  onClick={() => handleWeekStartDayChange(1)}
                  className={`px-3 py-1.5 transition-colors ${
                    weekStartDay === 1 ? "bg-black text-white" : "text-gray-500 hover:text-black"
                  }`}
                >
                  Mon
                </button>
                <button
                  onClick={() => handleWeekStartDayChange(0)}
                  className={`px-3 py-1.5 transition-colors ${
                    weekStartDay === 0 ? "bg-black text-white" : "text-gray-500 hover:text-black"
                  }`}
                >
                  Sun
                </button>
              </div>
            </div>

            {/* preferences */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Preferences
              </label>
              <textarea
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                placeholder="e.g. I need 1 hour for lunch each day, at least 30 min between meetings, no events before 8am"
                rows={3}
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-black resize-none"
              />
              <p className="text-xs text-gray-400">
                When events have multiple possible times, AI will pick the best slot based on your preferences.
              </p>
            </div>

            {/* import ics */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Import from Google Calendar
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="text-sm border border-gray-300 px-4 py-2 hover:border-black transition-colors disabled:opacity-40"
                >
                  {importing ? "Importing..." : "Upload .ics file"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ics,text/calendar"
                  onChange={handleImportIcs}
                  className="hidden"
                />
                <p className="text-xs text-gray-400">
                  Export from Google Calendar: Settings, then Import and export
                </p>
              </div>
            </div>

            {/* draft event list */}
            {drafts.length > 0 && (
              <div className="divide-y divide-gray-100 border border-gray-200">
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className={`flex items-start justify-between px-4 py-3 ${
                      draft.imported ? "bg-gray-50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                        style={{ backgroundColor: draft.color }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{draft.name}</p>
                          {draft.imported && (
                            <span className="text-xs text-gray-400 border border-dashed border-gray-300 px-1.5 py-0.5 leading-none">
                              imported
                            </span>
                          )}
                        </div>
                        <div className="space-y-0.5 mt-1">
                          {draft.flexible ? (
                            <p className="text-xs text-gray-400">
                              Flexible, {draft.durationMinutes} min
                            </p>
                          ) : (
                            draft.slots.map((slot, j) => (
                              <p key={j} className="text-xs text-gray-400">
                                {slot.date
                                  ? `${dayLabel(slot.date)} ${slot.date} ${slot.startTime} to ${slot.endTime}`
                                  : "No date"}
                              </p>
                            ))
                          )}
                          {draft.notes && (
                            <p className="text-xs text-gray-400 italic">{draft.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      <button
                        onClick={() => handleEditDraft(draft)}
                        className="text-sm text-gray-400 hover:text-black transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleRemoveDraft(draft.id)}
                        className="text-sm text-gray-300 hover:text-black transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* add/edit form */}
            {formOpen ? (
              <EventForm
                weekStart={weekStart}
                editingDraft={editingDraft}
                onSave={handleSaveDraft}
                onCancel={handleCancelForm}
              />
            ) : (
              <button
                onClick={() => setFormOpen(true)}
                className="flex items-center gap-2 text-sm font-medium border border-black px-4 py-2 hover:bg-black hover:text-white transition-colors"
              >
                <span className="text-base leading-none">+</span>
                Add event
              </button>
            )}

            {error && (
              <p className="text-sm text-red-600 border border-red-200 bg-red-50 px-4 py-2">
                {error}
              </p>
            )}

            {drafts.length > 0 && !formOpen && (
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="text-sm font-medium bg-black text-white px-6 py-2.5 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Generating..." : "Generate calendar"}
              </button>
            )}

            {/* results */}
            {events.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    {events.length} event{events.length !== 1 ? "s" : ""}
                  </p>
                  <button
                    onClick={handleExport}
                    className="text-sm text-gray-500 hover:text-black underline underline-offset-2 transition-colors"
                  >
                    Download .ics
                  </button>
                </div>

                {resultView === "list" ? (
                  <EventList events={events} onRemove={handleRemoveEvent} />
                ) : (
                  <CalendarView
                    events={events}
                    weekStart={weekStart}
                    onEventChange={setEvents}
                  />
                )}

                <p className="text-xs text-gray-400">
                  To import: open Google Calendar, go to Settings, then Import and export, and upload the .ics file.
                </p>
              </div>
            )}
          </div>

          {/* right column: live draft calendar */}
          <div className="w-[420px] shrink-0 sticky top-6 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Week preview
            </p>
            <p className="text-xs text-gray-400 mb-2">
              Solid = one time slot. Dashed = multiple possible times. Dotted border = imported.
            </p>
            <DraftCalendar drafts={drafts} weekStart={weekStart} />
          </div>

        </div>
      </div>
    </main>
  );
}
