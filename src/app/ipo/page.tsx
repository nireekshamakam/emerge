"use client";

import { Header } from "@/components/layout/Header";
import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Rocket, TrendingUp, TrendingDown } from "lucide-react";

interface IPOItem {
  company: string;
  openDate: string;
  closeDate: string;
  listingDate: string | null;
  priceBand: string;
  lotSize: string;
  issueSize: string;
  status: "upcoming" | "open" | "listed";
  listingPrice: number | null;
  listingGain: string | null;
  gmp: number | null;
  gmpPercent: string | null;
}

interface IPOData {
  upcoming: IPOItem[];
  recent: IPOItem[];
  gmp: IPOItem[];
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    upcoming: "bg-blue-100 text-blue-700",
    open: "bg-emerald-100 text-emerald-700",
    listed: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || ""}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function GainLoss({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const isPositive = !value.startsWith("-");
  return (
    <span className={`flex items-center gap-1 ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {value}
    </span>
  );
}

export default function IPOPage() {
  const [tab, setTab] = useState("upcoming");
  const [data, setData] = useState<IPOData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ipo")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <Header title="IPO Tracker" />
        <div className="p-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="IPO Tracker" />
      <div className="p-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming & Open</TabsTrigger>
            <TabsTrigger value="recent">Recent Listings</TabsTrigger>
            <TabsTrigger value="gmp">GMP Tracker</TabsTrigger>
          </TabsList>

          {/* Upcoming & Open IPOs */}
          <TabsContent value="upcoming">
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Rocket className="h-4 w-4" />
                  Upcoming & Open IPOs
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                {!data?.upcoming?.length ? (
                  <p className="p-6 text-sm text-muted-foreground text-center">No upcoming IPOs found.</p>
                ) : (
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-left py-3 px-3 font-medium">Company</th>
                        <th className="text-left py-3 px-3 font-medium">Open Date</th>
                        <th className="text-left py-3 px-3 font-medium">Close Date</th>
                        <th className="text-right py-3 px-3 font-medium">Price Band</th>
                        <th className="text-right py-3 px-3 font-medium">Lot Size</th>
                        <th className="text-right py-3 px-3 font-medium">Issue Size</th>
                        <th className="text-center py-3 px-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.upcoming.map((ipo, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                          <td className="py-2.5 px-3 text-sm font-medium">{ipo.company}</td>
                          <td className="py-2.5 px-3 text-sm text-muted-foreground">{ipo.openDate || "—"}</td>
                          <td className="py-2.5 px-3 text-sm text-muted-foreground">{ipo.closeDate || "—"}</td>
                          <td className="py-2.5 px-3 text-sm text-right font-mono">{ipo.priceBand || "—"}</td>
                          <td className="py-2.5 px-3 text-sm text-right">{ipo.lotSize || "—"}</td>
                          <td className="py-2.5 px-3 text-sm text-right">{ipo.issueSize || "—"}</td>
                          <td className="py-2.5 px-3 text-center"><StatusBadge status={ipo.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recent Listings */}
          <TabsContent value="recent">
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recent IPO Listings</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                {!data?.recent?.length ? (
                  <p className="p-6 text-sm text-muted-foreground text-center">No recent listings found.</p>
                ) : (
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-left py-3 px-3 font-medium">Company</th>
                        <th className="text-left py-3 px-3 font-medium">Listing Date</th>
                        <th className="text-right py-3 px-3 font-medium">Issue Price</th>
                        <th className="text-right py-3 px-3 font-medium">Listing Price</th>
                        <th className="text-right py-3 px-3 font-medium">Gain/Loss</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent.map((ipo, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                          <td className="py-2.5 px-3 text-sm font-medium">{ipo.company}</td>
                          <td className="py-2.5 px-3 text-sm text-muted-foreground">{ipo.listingDate || "—"}</td>
                          <td className="py-2.5 px-3 text-sm text-right font-mono">{ipo.priceBand || "—"}</td>
                          <td className="py-2.5 px-3 text-sm text-right font-mono">
                            {ipo.listingPrice != null ? `₹${ipo.listingPrice}` : "—"}
                          </td>
                          <td className="py-2.5 px-3 text-sm text-right font-mono">
                            <GainLoss value={ipo.listingGain} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* GMP Tracker */}
          <TabsContent value="gmp">
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Grey Market Premium (GMP)</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                {!data?.gmp?.length ? (
                  <p className="p-6 text-sm text-muted-foreground text-center">No GMP data available.</p>
                ) : (
                  <table className="w-full min-w-[500px]">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-left py-3 px-3 font-medium">Company</th>
                        <th className="text-right py-3 px-3 font-medium">IPO Price</th>
                        <th className="text-right py-3 px-3 font-medium">GMP (₹)</th>
                        <th className="text-right py-3 px-3 font-medium">GMP (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.gmp.map((ipo, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                          <td className="py-2.5 px-3 text-sm font-medium">{ipo.company}</td>
                          <td className="py-2.5 px-3 text-sm text-right font-mono">{ipo.priceBand || "—"}</td>
                          <td className={`py-2.5 px-3 text-sm text-right font-mono ${
                            ipo.gmp != null ? (ipo.gmp >= 0 ? "text-emerald-600" : "text-red-500") : ""
                          }`}>
                            {ipo.gmp != null ? `₹${ipo.gmp}` : "—"}
                          </td>
                          <td className={`py-2.5 px-3 text-sm text-right font-mono ${
                            ipo.gmpPercent ? (ipo.gmpPercent.startsWith("-") ? "text-red-500" : "text-emerald-600") : ""
                          }`}>
                            {ipo.gmpPercent || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
