"use client";

import { Header } from "@/components/layout/Header";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Trash2, Edit, MapPin, Calendar, Users, X } from "lucide-react";

interface Attendee {
  id?: string;
  name: string;
  role?: string;
}

interface Meeting {
  id: string;
  companyName: string;
  address: string | null;
  city: string | null;
  notes: string | null;
  meetingDate: string;
  attendees: Attendee[];
}

const emptyForm = {
  companyName: "",
  address: "",
  city: "",
  notes: "",
  meetingDate: new Date().toISOString().split("T")[0],
  attendees: [{ name: "", role: "" }] as Attendee[],
};

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (cityFilter) params.set("city", cityFilter);
      const res = await fetch(`/api/meetings?${params}`);
      const data = await res.json();
      setMeetings(Array.isArray(data) ? data : []);
    } catch {
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, cityFilter]);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (m: Meeting) => {
    setEditingId(m.id);
    setForm({
      companyName: m.companyName,
      address: m.address || "",
      city: m.city || "",
      notes: m.notes || "",
      meetingDate: m.meetingDate.split("T")[0],
      attendees: m.attendees.length > 0 ? m.attendees.map((a) => ({ name: a.name, role: a.role || "" })) : [{ name: "", role: "" }],
    });
    setDialogOpen(true);
  };

  const addAttendee = () => {
    setForm((f) => ({ ...f, attendees: [...f.attendees, { name: "", role: "" }] }));
  };

  const removeAttendee = (idx: number) => {
    setForm((f) => ({ ...f, attendees: f.attendees.filter((_, i) => i !== idx) }));
  };

  const updateAttendee = (idx: number, field: "name" | "role", value: string) => {
    setForm((f) => ({
      ...f,
      attendees: f.attendees.map((a, i) => (i === idx ? { ...a, [field]: value } : a)),
    }));
  };

  const handleSubmit = async () => {
    if (!form.companyName.trim()) return;
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        attendees: form.attendees.filter((a) => a.name.trim()),
      };

      if (editingId) {
        await fetch(`/api/meetings/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/meetings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setDialogOpen(false);
      fetchMeetings();
    } finally {
      setSubmitting(false);
    }
  };

  const deleteMeeting = async (id: string) => {
    await fetch(`/api/meetings/${id}`, { method: "DELETE" });
    setMeetings((prev) => prev.filter((m) => m.id !== id));
  };

  const cities = [...new Set(meetings.map((m) => m.city).filter(Boolean))] as string[];

  return (
    <div>
      <Header title="Meetings" />
      <div className="p-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">All cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New Meeting
          </Button>
        </div>

        {/* Meetings list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : meetings.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground">No meetings found.</p>
              <Button className="mt-4" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Record your first meeting
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {meetings.map((m) => (
              <Card key={m.id} className="hover:bg-accent/20 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                    >
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium">{m.companyName}</h3>
                        {m.city && <Badge variant="secondary">{m.city}</Badge>}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(m.meetingDate).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </span>
                        {m.attendees.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {m.attendees.length} attendee{m.attendees.length !== 1 ? "s" : ""}
                          </span>
                        )}
                        {m.address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {m.address}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(m)} className="h-7 w-7">
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMeeting(m.id)} className="h-7 w-7">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {expandedId === m.id && (
                    <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                      {m.attendees.length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground mb-1">People Met</h4>
                          <div className="flex flex-wrap gap-2">
                            {m.attendees.map((a, i) => (
                              <Badge key={i} variant="outline">
                                {a.name}{a.role ? ` (${a.role})` : ""}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {m.notes && (
                        <div>
                          <h4 className="text-xs font-medium text-muted-foreground mb-1">Notes</h4>
                          <p className="text-sm whitespace-pre-wrap">{m.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent onClose={() => setDialogOpen(false)} className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Meeting" : "New Meeting"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Company Name *</label>
                <Input
                  value={form.companyName}
                  onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                  placeholder="Company name"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Date *</label>
                  <Input
                    type="date"
                    value={form.meetingDate}
                    onChange={(e) => setForm((f) => ({ ...f, meetingDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">City</label>
                  <Input
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    placeholder="City"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Address</label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Company address"
                />
              </div>

              {/* Attendees */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">People Met</label>
                  <Button type="button" variant="ghost" size="sm" onClick={addAttendee}>
                    <Plus className="h-3 w-3" /> Add Person
                  </Button>
                </div>
                <div className="space-y-2">
                  {form.attendees.map((a, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input
                        placeholder="Name"
                        value={a.name}
                        onChange={(e) => updateAttendee(i, "name", e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Role"
                        value={a.role || ""}
                        onChange={(e) => updateAttendee(i, "role", e.target.value)}
                        className="flex-1"
                      />
                      {form.attendees.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeAttendee(i)} className="h-8 w-8 shrink-0">
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Meeting Notes</label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Discussion points, key takeaways..."
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={submitting || !form.companyName.trim()}>
                  {submitting ? "Saving..." : editingId ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
