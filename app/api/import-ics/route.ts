import { NextRequest, NextResponse } from "next/server";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function parseIcsDate(val: string): { date: string; time: string; allDay: boolean } | null {
  if (!val) return null;

  // DATE-only: 20240325
  if (/^\d{8}$/.test(val)) {
    const y = val.slice(0, 4);
    const m = val.slice(4, 6);
    const d = val.slice(6, 8);
    return { date: `${y}-${m}-${d}`, time: "", allDay: true };
  }

  // DATETIME: 20240325T090000 or 20240325T090000Z
  const match = val.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
  if (match) {
    const [, y, mo, d, h, mi] = match;
    return {
      date: `${y}-${mo}-${d}`,
      time: `${h}:${mi}`,
      allDay: false,
    };
  }

  return null;
}

export interface ImportedEvent {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  imported: true;
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const weekStartParam = (formData.get("weekStart") as string | null) ?? "";

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  // build inclusive week range: [weekStart, weekEnd] as YYYY-MM-DD strings
  let weekStartDate = "";
  let weekEndDate = "";
  if (weekStartParam) {
    weekStartDate = weekStartParam;
    const end = new Date(`${weekStartParam}T00:00:00`);
    end.setDate(end.getDate() + 6);
    weekEndDate = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
  }

  const text = await file.text();

  const events: ImportedEvent[] = [];

  // split into VEVENT blocks
  const veventBlocks = text.split("BEGIN:VEVENT").slice(1);

  for (const block of veventBlocks) {
    const lines: string[] = [];

    // unfold continuation lines (RFC 5545: lines starting with space/tab are continuations)
    for (const raw of block.split(/\r?\n/)) {
      if (/^[ \t]/.test(raw)) {
        if (lines.length > 0) lines[lines.length - 1] += raw.slice(1);
      } else {
        lines.push(raw);
      }
    }

    const get = (key: string): string => {
      for (const line of lines) {
        // match KEY: or KEY;PARAM=...:
        const match = line.match(new RegExp(`^${key}(?:;[^:]*)?:(.*)`, "i"));
        if (match) return match[1].trim();
      }
      return "";
    };

    const summary = get("SUMMARY").replace(/\\,/g, ",").replace(/\\n/g, " ").trim();
    if (!summary) continue;

    // pick up DTSTART, handling VALUE=DATE param
    let dtStartRaw = "";
    let dtEndRaw = "";
    for (const line of lines) {
      if (/^DTSTART/i.test(line)) dtStartRaw = line.replace(/^DTSTART[^:]*:/i, "").trim();
      if (/^DTEND/i.test(line)) dtEndRaw = line.replace(/^DTEND[^:]*:/i, "").trim();
    }

    const start = parseIcsDate(dtStartRaw);
    const end = parseIcsDate(dtEndRaw);

    if (!start) continue;

    // filter to the selected week if a weekStart was provided
    if (weekStartDate && weekEndDate) {
      if (start.date < weekStartDate || start.date > weekEndDate) continue;
    }

    events.push({
      id: crypto.randomUUID(),
      name: summary,
      date: start.date,
      startTime: start.allDay ? "" : start.time,
      endTime: end && !end.allDay ? end.time : "",
      allDay: start.allDay,
      imported: true,
    });
  }

  events.sort((a, b) => {
    const da = `${a.date}T${a.startTime || "00:00"}`;
    const db = `${b.date}T${b.startTime || "00:00"}`;
    return da < db ? -1 : da > db ? 1 : 0;
  });

  return NextResponse.json({ events });
}

