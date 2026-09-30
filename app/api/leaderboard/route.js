import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "leaderboard.json");
const MAX_ENTRIES = 10;

async function readEntries() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeEntries(entries) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(entries, null, 2));
}

export async function GET() {
  const entries = await readEntries();
  return NextResponse.json(entries);
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 12) : "Player";
  const score = Number.isFinite(body.score) ? body.score : 0;
  const timeMs = Number.isFinite(body.timeMs) ? body.timeMs : 0;

  const entries = await readEntries();
  entries.push({ name, score, timeMs, date: new Date().toLocaleDateString() });
  entries.sort((a, b) => b.score - a.score);
  const trimmed = entries.slice(0, MAX_ENTRIES);

  try {
    await writeEntries(trimmed);
  } catch {
    // Some hosts (e.g. typical serverless deployments) have a read-only
    // filesystem at runtime, so this write can fail there. The caller
    // falls back to a per-device localStorage leaderboard when that
    // happens — see lib/onlineLeaderboard.js.
    return NextResponse.json({ error: "Could not persist score on this host" }, { status: 500 });
  }

  return NextResponse.json(trimmed);
}
