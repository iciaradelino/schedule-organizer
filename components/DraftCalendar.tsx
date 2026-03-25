"use client";

import type { EventDraft } from "@/components/EventForm";

interface Props {
  drafts: EventDraft[];
  weekStart: string; // YYYY-MM-DD
}

const HOUR_START = 7;
const HOUR_END = 22;
const TOTAL_HOURS = HOUR_END - HOUR_START;
const SLOT_HEIGHT = 48; // px per hour

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function getDaysOfWeek(weekStart: string): string[] {
  const days: string[] = [];
  const base = new Date(`${weekStart}T00:00:00`);
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function shortDay(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" });
}

function shortDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).getDate();
}

interface BlockProps {
  top: number;
  height: number;
  color: string;
  label: string;
  /** dashed = multiple possible time slots */
  dashed: boolean;
  /** dotted = imported from Google Calendar */
  imported: boolean;
  allDay?: boolean;
}

function EventBlock({ top, height, color, label, dashed, imported, allDay }: BlockProps) {
  if (allDay) {
    // all-day events shown as a small pill at the top
    return null;
  }

  // border style: imported uses dotted, multiple-slot uses dashed, normal uses solid
  const borderStyle = imported ? "dotted" : dashed ? "dashed" : "solid";
  const bg = imported || dashed ? "transparent" : color;
  const textColor = imported || dashed ? color : "#fff";

  return (
    <div
      style={{
        position: "absolute",
        top,
        height: Math.max(height, 18),
        left: 2,
        right: 2,
        backgroundColor: bg,
        border: `2px ${borderStyle} ${color}`,
        borderRadius: 3,
        overflow: "hidden",
        opacity: imported ? 0.6 : dashed ? 0.75 : 1,
      }}
    >
      <span
        style={{
          fontSize: 9,
          lineHeight: "12px",
          padding: "1px 3px",
          color: textColor,
          display: "block",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
    </div>
  );
}

export default function DraftCalendar({ drafts, weekStart }: Props) {
  const days = getDaysOfWeek(weekStart);
  const gridHeight = TOTAL_HOURS * SLOT_HEIGHT;

  // flexible (no fixed time) events shown in a header row
  const flexibleDrafts = drafts.filter((d) => d.flexible);

  // timed events grouped by date
  const byDay: Record<string, { draft: EventDraft; slotIdx: number; dashed: boolean }[]> = {};
  days.forEach((d) => (byDay[d] = []));

  drafts.forEach((draft) => {
    if (draft.flexible) return;
    const dashed = draft.slots.length > 1;
    draft.slots.forEach((slot, slotIdx) => {
      if (byDay[slot.date]) byDay[slot.date].push({ draft, slotIdx, dashed });
    });
  });

  const hasFlexible = flexibleDrafts.length > 0;

  return (
    <div className="border border-gray-200 bg-white overflow-hidden select-none text-black">
      {/* day headers */}
      <div className="flex border-b border-gray-200">
        <div className="w-10 shrink-0" />
        {days.map((d) => (
          <div
            key={d}
            className="flex-1 text-center py-2 border-l border-gray-100 first:border-l-0"
          >
            <p className="text-xs text-gray-400">{shortDay(d)}</p>
            <p className="text-sm font-semibold">{shortDate(d)}</p>
          </div>
        ))}
      </div>

      {/* flexible events row */}
      {hasFlexible && (
        <div className="border-b border-gray-200 px-3 py-1.5 flex flex-wrap gap-1.5">
          {flexibleDrafts.map((draft) => {
            const hrs = Math.floor(draft.durationMinutes / 60);
            const mins = draft.durationMinutes % 60;
            const durLabel = hrs > 0
              ? `${hrs}h${mins > 0 ? `${mins}m` : ""}`
              : `${mins}m`;
            return (
              <div
                key={draft.id}
                style={{
                  backgroundColor: "transparent",
                  border: `2px dashed ${draft.color}`,
                  borderRadius: 3,
                  padding: "1px 6px",
                }}
              >
                <span style={{ fontSize: 9, color: draft.color, fontWeight: 600 }}>
                  {draft.name} ({durLabel})
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* timed grid */}
      <div className="flex overflow-y-auto" style={{ maxHeight: 480 }}>
        {/* hour labels */}
        <div className="w-10 shrink-0 relative" style={{ height: gridHeight }}>
          {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
            <div
              key={i}
              style={{ position: "absolute", top: i * SLOT_HEIGHT - 7, right: 4 }}
              className="text-xs text-gray-300 leading-none"
            >
              {HOUR_START + i}
            </div>
          ))}
        </div>

        {/* day columns */}
        {days.map((d) => (
          <div
            key={d}
            className="flex-1 border-l border-gray-100 first:border-l-0 relative"
            style={{ height: gridHeight }}
          >
            {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
              <div
                key={i}
                style={{ position: "absolute", top: i * SLOT_HEIGHT, left: 0, right: 0 }}
                className="border-t border-gray-100"
              />
            ))}

            {byDay[d].map(({ draft, slotIdx, dashed }, i) => {
              const slot = draft.slots[slotIdx];
              const startMin = timeToMinutes(slot.startTime || "00:00");
              const endMin = timeToMinutes(slot.endTime || "01:00");
              const top = ((startMin - HOUR_START * 60) / 60) * SLOT_HEIGHT;
              const height = ((endMin - startMin) / 60) * SLOT_HEIGHT;
              return (
                <EventBlock
                  key={i}
                  top={top}
                  height={height}
                  color={draft.color}
                  label={draft.name}
                  dashed={dashed}
                  imported={!!draft.imported}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
