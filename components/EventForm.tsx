"use client";

import { useEffect, useState } from "react";

export interface EventSlot {
  date: string;
  startTime: string;
  endTime: string;
}

export interface EventDraft {
  id: string;
  name: string;
  color: string;
  notes: string;
  /** if true, no date/time is pinned; durationMinutes gives the length */
  flexible: boolean;
  durationMinutes: number;
  imported?: boolean;
  slots: EventSlot[];
}

interface Props {
  weekStart: string;
  editingDraft?: EventDraft | null;
  onSave: (draft: EventDraft) => void;
  onCancel: () => void;
}

export const COLORS = [
  "#000000",
  "#6366f1",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
];

const DURATION_OPTIONS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 h", value: 60 },
  { label: "1.5 h", value: 90 },
  { label: "2 h", value: 120 },
  { label: "3 h", value: 180 },
];

function emptySlot(weekStart: string): EventSlot {
  return { date: weekStart, startTime: "09:00", endTime: "10:00" };
}

function dayLabel(dateStr: string) {
  if (!dateStr) return "";
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" });
}

export default function EventForm({ weekStart, editingDraft, onSave, onCancel }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [notes, setNotes] = useState("");
  const [flexible, setFlexible] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [slots, setSlots] = useState([emptySlot(weekStart)]);

  useEffect(() => {
    if (editingDraft) {
      setName(editingDraft.name);
      setColor(editingDraft.color);
      setNotes(editingDraft.notes ?? "");
      setFlexible(editingDraft.flexible);
      setDurationMinutes(editingDraft.durationMinutes || 60);
      setSlots(editingDraft.slots.length > 0 ? editingDraft.slots : [emptySlot(weekStart)]);
    } else {
      setName("");
      setColor(COLORS[0]);
      setNotes("");
      setFlexible(false);
      setDurationMinutes(60);
      setSlots([emptySlot(weekStart)]);
    }
  }, [editingDraft, weekStart]);

  function addSlot() {
    setSlots((s) => [...s, emptySlot(weekStart)]);
  }

  function removeSlot(i: number) {
    setSlots((s) => s.filter((_, idx) => idx !== i));
  }

  function updateSlot(i: number, field: keyof EventSlot, value: string) {
    setSlots((s) => s.map((slot, idx) => (idx === i ? { ...slot, [field]: value } : slot)));
  }

  function handleSubmit() {
    if (!name.trim()) return;
    onSave({
      id: editingDraft?.id ?? crypto.randomUUID(),
      name: name.trim(),
      color,
      notes: notes.trim(),
      flexible,
      durationMinutes,
      imported: editingDraft?.imported,
      slots: flexible ? [] : slots,
    });
  }

  return (
    <div className="border border-black p-5 space-y-5">
      {/* name */}
      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          Event name
        </label>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="e.g. Team standup"
          className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-black"
        />
      </div>

      {/* color */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          Color
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                color === c ? "border-gray-400 scale-110" : "border-transparent"
              }`}
              aria-label={`Color ${c}`}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-6 h-6 rounded-full border border-gray-300 cursor-pointer p-0 overflow-hidden"
            title="Custom color"
          />
        </div>
      </div>

      {/* flexible toggle */}
      <label className="flex items-center gap-2 cursor-pointer w-fit">
        <input
          type="checkbox"
          checked={flexible}
          onChange={(e) => setFlexible(e.target.checked)}
          className="accent-black w-4 h-4"
        />
        <span className="text-sm text-gray-700">Flexible (no fixed date or time)</span>
      </label>

      {flexible ? (
        /* duration picker for flexible events */
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Duration
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDurationMinutes(opt.value)}
                className={`text-sm px-3 py-1.5 border transition-colors ${
                  durationMinutes === opt.value
                    ? "border-black bg-black text-white"
                    : "border-gray-300 text-gray-600 hover:border-black"
                }`}
              >
                {opt.label}
              </button>
            ))}
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={5}
                step={5}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-16 border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-black"
              />
              <span className="text-sm text-gray-500">min</span>
            </div>
          </div>
        </div>
      ) : (
        /* date / time slots */
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Date and time
          </label>

          {slots.map((slot, i) => (
            <div key={i} className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400 w-7 shrink-0">{dayLabel(slot.date)}</span>
                <input
                  type="date"
                  value={slot.date}
                  onChange={(e) => updateSlot(i, "date", e.target.value)}
                  className="border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-black"
                />
              </div>
              <input
                type="time"
                value={slot.startTime}
                onChange={(e) => updateSlot(i, "startTime", e.target.value)}
                className="border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-black"
              />
              <span className="text-gray-400 text-sm">to</span>
              <input
                type="time"
                value={slot.endTime}
                onChange={(e) => updateSlot(i, "endTime", e.target.value)}
                className="border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-black"
              />
              {slots.length > 1 && (
                <button
                  onClick={() => removeSlot(i)}
                  className="text-gray-400 hover:text-black text-sm transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          ))}

          <button
            onClick={addSlot}
            className="text-xs text-gray-500 hover:text-black underline underline-offset-2 transition-colors"
          >
            + add another possible time
          </button>
        </div>
      )}

      {/* notes / special requirements */}
      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          Notes / special requirements
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. needs a quiet room, back-to-back with lunch, avoid mornings"
          rows={2}
          className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-black resize-none"
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="text-sm font-medium bg-black text-white px-5 py-2 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {editingDraft ? "Save changes" : "Add"}
        </button>
        <button
          onClick={onCancel}
          className="text-sm text-gray-500 hover:text-black transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
