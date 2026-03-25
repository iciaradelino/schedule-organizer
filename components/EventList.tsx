"use client";

import type { CalendarEvent } from "@/app/api/export-ics/route";

interface Props {
  events: CalendarEvent[];
  onRemove: (index: number) => void;
}

const DAY_LABELS: Record<string, string> = {};

function getDayLabel(dateStr: string): string {
  if (DAY_LABELS[dateStr]) return DAY_LABELS[dateStr];
  const d = new Date(`${dateStr}T00:00:00`);
  const label = d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  DAY_LABELS[dateStr] = label;
  return label;
}

export default function EventList({ events, onRemove }: Props) {
  if (events.length === 0) return null;

  const grouped: Record<string, { ev: CalendarEvent; idx: number }[]> = {};
  events.forEach((ev, idx) => {
    const key = ev.date || "unscheduled";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push({ ev, idx });
  });

  const sortedDates = Object.keys(grouped).sort();

  return (
    <div className="divide-y divide-gray-100">
      {sortedDates.map((date) => (
        <div key={date} className="py-4 first:pt-0 last:pb-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            {date === "unscheduled" ? "No date" : getDayLabel(date)}
          </p>
          <div className="space-y-2">
            {grouped[date].map(({ ev, idx }) => (
              <div
                key={idx}
                className={`flex items-start justify-between px-4 py-3 ${
                  ev.imported
                    ? "border border-dashed border-gray-300"
                    : "border border-gray-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                    style={{ backgroundColor: ev.color ?? "#000000" }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-black">{ev.title}</p>
                      {ev.imported && (
                        <span className="text-xs text-gray-400 border border-gray-300 px-1.5 py-0.5 leading-none">
                          imported
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {ev.flexible || !ev.startTime
                        ? `Flexible, ${ev.durationMinutes ?? "?"}  min`
                        : `${ev.startTime} to ${ev.endTime}`}
                    </p>
                    {ev.description && (
                      <p className="text-xs text-gray-400 mt-1">{ev.description}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onRemove(idx)}
                  className="ml-4 text-gray-300 hover:text-black transition-colors text-sm shrink-0"
                  aria-label="Remove event"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
