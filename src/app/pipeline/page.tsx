"use client";

import { Header } from "@/components/layout/Header";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { PIPELINE_STAGES } from "@/lib/constants";
import { formatCompactNumber } from "@/lib/utils";
import { Plus, GripVertical, Edit, Trash2 } from "lucide-react";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface PipelineItem {
  id: string;
  companyName: string;
  sector: string | null;
  description: string | null;
  dealSize: number | null;
  stage: string;
  position: number;
}

const emptyForm = {
  companyName: "",
  sector: "",
  description: "",
  dealSize: "",
  stage: "SCREENING",
};

function SortableCard({
  item,
  onEdit,
  onDelete,
}: {
  item: PipelineItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { type: "card", item },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card border rounded-md p-3 shadow-sm hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners} className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium truncate">{item.companyName}</h4>
          {item.sector && (
            <span className="text-xs text-muted-foreground">{item.sector}</span>
          )}
          {item.dealSize != null && (
            <div className="text-xs text-primary mt-1">{formatCompactNumber(item.dealSize)}</div>
          )}
        </div>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1 hover:bg-accent rounded cursor-pointer">
            <Edit className="h-3 w-3" />
          </button>
          <button onClick={onDelete} className="p-1 hover:bg-accent rounded cursor-pointer">
            <Trash2 className="h-3 w-3 text-destructive" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CardOverlay({ item }: { item: PipelineItem }) {
  return (
    <div className="bg-card border rounded-md p-3 shadow-lg w-60">
      <h4 className="text-sm font-medium">{item.companyName}</h4>
      {item.sector && <span className="text-xs text-muted-foreground">{item.sector}</span>}
    </div>
  );
}

function Column({
  stageId,
  label,
  color,
  items,
  onEdit,
  onDelete,
}: {
  stageId: string;
  label: string;
  color: string;
  items: PipelineItem[];
  onEdit: (item: PipelineItem) => void;
  onDelete: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stageId });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[240px] max-w-[280px] flex-1 rounded-lg border transition-colors ${
        isOver ? "border-primary/50 bg-primary/5" : "border-border bg-muted/30"
      }`}
    >
      <div className="flex items-center gap-2 p-3 border-b border-border/50">
        <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
        <h3 className="text-sm font-medium flex-1">{label}</h3>
        <Badge variant="secondary" className="text-xs">{items.length}</Badge>
      </div>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="p-2 space-y-2 flex-1 min-h-[100px] overflow-y-auto max-h-[calc(100vh-240px)]">
          {items.map((item) => (
            <SortableCard
              key={item.id}
              item={item}
              onEdit={() => onEdit(item)}
              onDelete={() => onDelete(item.id)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export default function PipelinePage() {
  const [items, setItems] = useState<PipelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState<PipelineItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PipelineItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pipeline");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const getItemsByStage = (stageId: string) =>
    items.filter((i) => i.stage === stageId).sort((a, b) => a.position - b.position);

  const findStageForItem = (itemId: string): string | undefined => {
    const item = items.find((i) => i.id === itemId);
    return item?.stage;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const item = items.find((i) => i.id === event.active.id);
    setActiveItem(item || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeStage = findStageForItem(activeId);
    // Over can be a column or another card
    const overStage = PIPELINE_STAGES.some((s) => s.id === overId)
      ? overId
      : findStageForItem(overId);

    if (!activeStage || !overStage || activeStage === overStage) return;

    setItems((prev) => {
      const updated = prev.map((item) =>
        item.id === activeId ? { ...item, stage: overStage } : item
      );
      return updated;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const item = items.find((i) => i.id === activeId);
    if (!item) return;

    // Determine target stage and position
    let targetStage = item.stage;
    let targetPosition = item.position;

    if (PIPELINE_STAGES.some((s) => s.id === overId)) {
      // Dropped on a column
      targetStage = overId;
      targetPosition = getItemsByStage(overId).filter((i) => i.id !== activeId).length;
    } else {
      // Dropped on another card
      const overItem = items.find((i) => i.id === overId);
      if (overItem) {
        targetStage = overItem.stage;
        const stageItems = getItemsByStage(targetStage).filter((i) => i.id !== activeId);
        const overIndex = stageItems.findIndex((i) => i.id === overId);
        targetPosition = overIndex >= 0 ? overIndex : stageItems.length;
      }
    }

    // Optimistic update
    const prevItems = [...items];
    setItems((prev) => {
      const without = prev.filter((i) => i.id !== activeId);
      const updated = { ...item, stage: targetStage, position: targetPosition };
      const inStage = without
        .filter((i) => i.stage === targetStage)
        .sort((a, b) => a.position - b.position);
      inStage.splice(targetPosition, 0, updated);
      const reindexed = inStage.map((i, idx) => ({ ...i, position: idx }));
      const others = without.filter((i) => i.stage !== targetStage);
      return [...others, ...reindexed];
    });

    try {
      await fetch(`/api/pipeline/${activeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: targetStage, position: targetPosition }),
      });
    } catch {
      setItems(prevItems); // revert on failure
    }
  };

  const openCreate = (stage: string = "SCREENING") => {
    setEditingItem(null);
    setForm({ ...emptyForm, stage });
    setSheetOpen(true);
  };

  const openEdit = (item: PipelineItem) => {
    setEditingItem(item);
    setForm({
      companyName: item.companyName,
      sector: item.sector || "",
      description: item.description || "",
      dealSize: item.dealSize?.toString() || "",
      stage: item.stage,
    });
    setSheetOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.companyName.trim()) return;
    setSubmitting(true);
    try {
      const payload = {
        companyName: form.companyName,
        sector: form.sector || undefined,
        description: form.description || undefined,
        dealSize: form.dealSize ? parseFloat(form.dealSize) : undefined,
        stage: form.stage,
      };

      if (editingItem) {
        await fetch(`/api/pipeline/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/pipeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setSheetOpen(false);
      fetchItems();
    } finally {
      setSubmitting(false);
    }
  };

  const deleteItem = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/pipeline/${id}`, { method: "DELETE" });
  };

  if (loading) {
    return (
      <div>
        <Header title="Deal Pipeline" />
        <div className="p-6 flex gap-4 overflow-x-auto">
          {PIPELINE_STAGES.map((s) => (
            <Skeleton key={s.id} className="h-96 min-w-[240px] flex-1" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Deal Pipeline" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">{items.length} deals in pipeline</p>
          <Button size="sm" onClick={() => openCreate()}>
            <Plus className="h-4 w-4" />
            Add Deal
          </Button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {PIPELINE_STAGES.map((stage) => (
              <Column
                key={stage.id}
                stageId={stage.id}
                label={stage.label}
                color={stage.color}
                items={getItemsByStage(stage.id)}
                onEdit={openEdit}
                onDelete={deleteItem}
              />
            ))}
          </div>

          <DragOverlay>
            {activeItem ? <CardOverlay item={activeItem} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Create/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent onClose={() => setSheetOpen(false)}>
          <SheetHeader>
            <SheetTitle>{editingItem ? "Edit Deal" : "New Deal"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Company Name *</label>
              <Input
                value={form.companyName}
                onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                placeholder="Company name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Sector</label>
              <Input
                value={form.sector}
                onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}
                placeholder="e.g. Technology, Healthcare"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Deal Size (in Cr)</label>
              <Input
                type="number"
                value={form.dealSize}
                onChange={(e) => setForm((f) => ({ ...f, dealSize: e.target.value }))}
                placeholder="e.g. 100"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Stage</label>
              <select
                value={form.stage}
                onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {PIPELINE_STAGES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Notes about this deal..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting || !form.companyName.trim()}>
                {submitting ? "Saving..." : editingItem ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
