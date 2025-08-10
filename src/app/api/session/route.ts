import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    const isAuthenticated = session.authenticated || false;

    return NextResponse.json({ authenticated: isAuthenticated });
  } catch (error) {
    return NextResponse.json({ authenticated: false });
  }
}
