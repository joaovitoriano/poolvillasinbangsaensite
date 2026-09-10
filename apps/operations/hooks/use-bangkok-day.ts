"use client";
import { useEffect, useState } from "react";
const day = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
export function useBangkokDay() {
  const [today, setToday] = useState(day);
  useEffect(() => {
    const refresh = () => setToday(day());
    const timer = window.setInterval(refresh, 1000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  return today;
}
