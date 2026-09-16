import { NextResponse } from "next/server";
import { getWinnersExport, getParticipantsExport } from "@/lib/contest-store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // "winners" or "participants"

  if (type === "winners") {
    const winners = getWinnersExport();
    return new NextResponse(JSON.stringify(winners, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="winners_list_${Date.now()}.json"`,
      },
    });
  }

  const participants = getParticipantsExport();
  return new NextResponse(JSON.stringify(participants, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="participants_list_${Date.now()}.json"`,
    },
  });
}
