import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const meetingSchema = z.object({
  companyName: z.string().min(1),
  address: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
  meetingDate: z.string().transform((s) => new Date(s)),
  attendees: z.array(z.object({
    name: z.string().min(1),
    role: z.string().optional(),
  })).default([]),
});

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get("search") || "";
    const city = req.nextUrl.searchParams.get("city") || "";

    const where: Record<string, unknown> = {};
    if (search) {
      where.companyName = { contains: search, mode: "insensitive" };
    }
    if (city) {
      where.city = { contains: city, mode: "insensitive" };
    }

    const meetings = await prisma.meeting.findMany({
      where,
      include: { attendees: true },
      orderBy: { meetingDate: "desc" },
    });

    return NextResponse.json(meetings);
  } catch {
    return NextResponse.json({ error: "Failed to fetch meetings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = meetingSchema.parse(body);

    const meeting = await prisma.meeting.create({
      data: {
        companyName: data.companyName,
        address: data.address,
        city: data.city,
        notes: data.notes,
        meetingDate: data.meetingDate,
        attendees: {
          create: data.attendees,
        },
      },
      include: { attendees: true },
    });

    return NextResponse.json(meeting, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create meeting" }, { status: 500 });
  }
}
