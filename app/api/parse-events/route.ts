import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { CalendarEvent } from "@/app/api/export-ics/route";

interface Slot {
  date: string;
  startTime: string;
  endTime: string;
}

interface EventDraft {
  id: string;
  name: string;
  color: string;
  notes: string;
  flexible: boolean;
  durationMinutes: number;
  imported?: boolean;
  slots: Slot[];
}

function flattenDrafts(drafts: EventDraft[]): CalendarEvent[] {
  return drafts.flatMap((draft) => {
    if (draft.flexible) {
      // flexible events have no pinned slot yet; include as unscheduled placeholders
      return [{
        title: draft.name,
        date: "",
        startTime: "",
        endTime: "",
        color: draft.color,
        flexible: true,
        durationMinutes: draft.durationMinutes,
        imported: draft.imported,
        description: draft.notes ?? "",
      }];
    }
    return draft.slots.map((slot) => ({
      title: draft.name,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      color: draft.color,
      imported: draft.imported,
      description: draft.notes ?? "",
    }));
  });
}

function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    const da = `${a.date}T${a.startTime || "00:00"}`;
    const db = `${b.date}T${b.startTime || "00:00"}`;
    return da < db ? -1 : da > db ? 1 : 0;
  });
}

export async function POST(req: NextRequest) {
  const { drafts, preferences, weekStart }: {
    drafts: EventDraft[];
    preferences?: string;
    weekStart: string;
  } = await req.json();

  if (!drafts || drafts.length === 0) {
    return NextResponse.json({ error: "No events provided" }, { status: 400 });
  }

  // if no preferences or api key, just flatten and sort
  if (!preferences?.trim() || !process.env.OPENAI_API_KEY) {
    return NextResponse.json({ events: sortEvents(flattenDrafts(drafts)) });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // build a representation for the AI: fixed-slot events + flexible events
  const fixedDrafts = drafts.filter((d) => !d.flexible);
  const flexibleDrafts = drafts.filter((d) => d.flexible);

  const eventsForAI = [
    ...fixedDrafts.map((d) => ({
      id: d.id,
      name: d.name,
      notes: d.notes,
      slots: d.slots,
    })),
    ...flexibleDrafts.map((d) => ({
      id: d.id,
      name: d.name,
      notes: d.notes,
      flexible: true,
      durationMinutes: d.durationMinutes,
    })),
  ];

  const prompt = `You are a scheduling assistant for the week starting ${weekStart}.

For fixed events (with candidate slots): pick exactly ONE slot.
For flexible events (no slots, just a duration): assign a date and start/end time within the week that fits the user preferences.

Return a JSON array where each object has: id, date (YYYY-MM-DD), startTime (HH:mm), endTime (HH:mm). Return ONLY valid JSON, no markdown.

User preferences: "${preferences}"

Events:
${JSON.stringify(eventsForAI, null, 2)}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    const raw = completion.choices[0].message.content ?? "[]";
    const cleaned = raw.replace(/```(?:json)?/g, "").trim();
    const chosen: { id: string; date: string; startTime: string; endTime: string }[] =
      JSON.parse(cleaned);

    const draftMap = Object.fromEntries(drafts.map((d) => [d.id, d]));
    const events: CalendarEvent[] = chosen.map((c) => {
      const draft = draftMap[c.id];
      return {
        title: draft?.name ?? c.id,
        date: c.date,
        startTime: c.startTime,
        endTime: c.endTime,
        color: draft?.color ?? "#000000",
        flexible: draft?.flexible,
        durationMinutes: draft?.durationMinutes,
        imported: draft?.imported,
        description: draft?.notes ?? "",
      };
    });

    return NextResponse.json({ events: sortEvents(events) });
  } catch (err) {
    console.error("parse-events AI error:", err);
    return NextResponse.json({ events: sortEvents(flattenDrafts(drafts)) });
  }
}
