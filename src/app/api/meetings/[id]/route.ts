import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateMeetingSchema = z.object({
  companyName: z.string().min(1).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
  meetingDate: z.string().transform((s) => new Date(s)).optional(),
  attendees: z.array(z.object({
    name: z.string().min(1),
    role: z.string().optional(),
  })).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: { attendees: true },
    });
    if (!meeting) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(meeting);
  } catch {
    return NextResponse.json({ error: "Failed to fetch meeting" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = updateMeetingSchema.parse(body);

    // If attendees are provided, delete existing and re-create
    if (data.attendees) {
      await prisma.attendee.deleteMany({ where: { meetingId: id } });
    }

    const meeting = await prisma.meeting.update({
      where: { id },
      data: {
        ...(data.companyName && { companyName: data.companyName }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.meetingDate && { meetingDate: data.meetingDate }),
        ...(data.attendees && {
          attendees: { create: data.attendees },
        }),
      },
      include: { attendees: true },
    });

    return NextResponse.json(meeting);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update meeting" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.meeting.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete meeting" }, { status: 500 });
  }
}
