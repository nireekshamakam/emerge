"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

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
    <header className="flex items-center justify-between h-14 px-6 border-b border-pink-200/70 bg-white/50 backdrop-blur-sm sticky top-0 z-30">
      <h2 className="text-lg font-bold flex items-center gap-1.5 gradient-text">
        <Sparkles className="h-4 w-4 text-pink-500" />
        {title}
      </h2>
      <div className="flex items-center gap-4 text-xs">
        <span className="text-pink-700 font-medium">{date}</span>
        <span className="font-mono tabular-nums text-fuchsia-700 bg-pink-100 px-2 py-0.5 rounded-md">
          {time} IST
        </span>
      </div>
    </header>
  );
}
