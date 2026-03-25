"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { CalendarEvent } from "@/app/api/export-ics/route";

interface Props {
  events: CalendarEvent[];
  weekStart: string;
  onEventChange: (events: CalendarEvent[]) => void;
}

interface FCEventDropArg {
  event: {
    id: string;
    title: string;
    startStr: string;
    endStr: string;
    extendedProps: { description?: string; color?: string };
  };
  oldEvent: { id: string; startStr: string };
  revert: () => void;
}

export default function CalendarView({ events, weekStart, onEventChange }: Props) {
  const fcEvents = events.map((ev, i) => ({
    id: String(i),
    title: ev.title,
    start: `${ev.date}T${ev.startTime}`,
    end: `${ev.date}T${ev.endTime}`,
    backgroundColor: ev.color ?? "#000000",
    borderColor: ev.color ?? "#000000",
    textColor: "#ffffff",
    extendedProps: { description: ev.description ?? "", color: ev.color },
  }));

  function handleEventDrop(info: FCEventDropArg) {
    const startDt = new Date(info.event.startStr);
    const endDt = new Date(info.event.endStr);

    const pad = (n: number) => String(n).padStart(2, "0");
    const toDate = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const toTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

    const idx = Number(info.oldEvent.id);
    const updated = events.map((ev, i) => {
      if (i === idx) {
        return {
          ...ev,
          date: toDate(startDt),
          startTime: toTime(startDt),
          endTime: toTime(endDt),
        };
      }
      return ev;
    });
    onEventChange(updated);
  }

  return (
    <div className="bg-white border border-gray-200 p-4">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        initialDate={weekStart}
        editable={true}
        eventDrop={handleEventDrop}
        events={fcEvents}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        height="auto"
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
      />
    </div>
  );
}
