import { NextRequest, NextResponse } from "next/server";
import ical, { ICalEventStatus } from "ical-generator";

export interface CalendarEvent {
  title: string;
  date: string;       // YYYY-MM-DD, empty if flexible and unscheduled
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
  description?: string;
  color?: string;
  flexible?: boolean;
  durationMinutes?: number;
  imported?: boolean;
}

export async function POST(req: NextRequest) {
  const { events }: { events: CalendarEvent[] } = await req.json();

  if (!events || events.length === 0) {
    return NextResponse.json({ error: "No events provided" }, { status: 400 });
  }

  const calendar = ical({ name: "Weekly Planner" });

  for (const ev of events) {
    // skip flexible events with no assigned date
    if (!ev.date) continue;

    const start = new Date(`${ev.date}T${ev.startTime || "00:00"}:00`);
    const end = ev.endTime
      ? new Date(`${ev.date}T${ev.endTime}:00`)
      : new Date(start.getTime() + (ev.durationMinutes ?? 60) * 60000);

    calendar.createEvent({
      start,
      end,
      summary: ev.title,
      description: ev.description ?? "",
      status: ICalEventStatus.CONFIRMED,
    });
  }

  const icsString = calendar.toString();

  return new NextResponse(icsString, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="weekly-planner.ics"',
    },
  });
}
