import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updatePipelineSchema = z.object({
  companyName: z.string().optional(),
  sector: z.string().optional(),
  description: z.string().optional(),
  dealSize: z.number().optional(),
  stage: z.string().optional(),
  position: z.number().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const item = await prisma.pipelineItem.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ error: "Failed to fetch item" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = updatePipelineSchema.parse(body);

    // If stage or position changed, handle reordering
    if (data.stage !== undefined || data.position !== undefined) {
      const current = await prisma.pipelineItem.findUnique({ where: { id } });
      if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const newStage = data.stage ?? current.stage;
      const newPosition = data.position ?? current.position;

      await prisma.$transaction(async (tx) => {
        // If moving to a different stage, close gap in old stage
        if (newStage !== current.stage) {
          await tx.pipelineItem.updateMany({
            where: { stage: current.stage, position: { gt: current.position } },
            data: { position: { decrement: 1 } },
          });

          // Make room in new stage
          await tx.pipelineItem.updateMany({
            where: { stage: newStage, position: { gte: newPosition } },
            data: { position: { increment: 1 } },
          });
        } else {
          // Same stage reorder
          if (newPosition > current.position) {
            await tx.pipelineItem.updateMany({
              where: {
                stage: newStage,
                position: { gt: current.position, lte: newPosition },
                id: { not: id },
              },
              data: { position: { decrement: 1 } },
            });
          } else if (newPosition < current.position) {
            await tx.pipelineItem.updateMany({
              where: {
                stage: newStage,
                position: { gte: newPosition, lt: current.position },
                id: { not: id },
              },
              data: { position: { increment: 1 } },
            });
          }
        }

        // Update the item
        await tx.pipelineItem.update({
          where: { id },
          data: { ...data, stage: newStage, position: newPosition },
        });
      });

      const updated = await prisma.pipelineItem.findUnique({ where: { id } });
      return NextResponse.json(updated);
    }

    // Simple field update (no stage/position change)
    const item = await prisma.pipelineItem.update({
      where: { id },
      data,
    });
    return NextResponse.json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const item = await prisma.pipelineItem.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.pipelineItem.delete({ where: { id } });
      await tx.pipelineItem.updateMany({
        where: { stage: item.stage, position: { gt: item.position } },
        data: { position: { decrement: 1 } },
      });
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
