import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "bc-admin";

export async function POST(req: Request) {
  try {
    const { password } = await req.json();

    if (password === ADMIN_PASSWORD) {
      return NextResponse.json({ authenticated: true, message: "Security clearance granted." });
    }

    return NextResponse.json(
      { authenticated: false, error: "ACCESS DENIED: Invalid Admin Security Passcode" },
      { status: 401 }
    );
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
