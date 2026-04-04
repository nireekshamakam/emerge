"use client";

import { useEffect, useState } from "react";

export function Header({ title }: { title: string }) {
  const [time, setTime] = useState<string>("");
  const [date, setDate] = useState<string>("");

  useEffect(() => {
    function update() {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
      setDate(
        now.toLocaleDateString("en-IN", {
          timeZone: "Asia/Kolkata",
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      );
    }
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="flex items-center justify-between h-14 px-6 border-b border-border">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{date}</span>
        <span className="font-mono tabular-nums">{time} IST</span>
      </div>
    </header>
  );
}
