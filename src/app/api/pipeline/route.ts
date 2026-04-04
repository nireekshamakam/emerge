import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createPipelineSchema = z.object({
  companyName: z.string().min(1),
  sector: z.string().optional(),
  description: z.string().optional(),
  dealSize: z.number().optional(),
  stage: z.string().default("SCREENING"),
});

export async function GET() {
  try {
    const items = await prisma.pipelineItem.findMany({
      orderBy: [{ stage: "asc" }, { position: "asc" }],
    });
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Failed to fetch pipeline" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createPipelineSchema.parse(body);

    // Get max position in the target stage
    const maxPos = await prisma.pipelineItem.aggregate({
      where: { stage: data.stage },
      _max: { position: true },
    });

    const item = await prisma.pipelineItem.create({
      data: {
        ...data,
        position: (maxPos._max.position ?? -1) + 1,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create pipeline item" }, { status: 500 });
  }
}
