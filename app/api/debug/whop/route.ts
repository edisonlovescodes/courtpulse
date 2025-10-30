import { whopSdk } from "@/lib/whop-sdk";
import { resolveAdminContext } from "@/lib/whopContext";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const ctx = await resolveAdminContext(req, whopSdk);
    return NextResponse.json(ctx);
}
