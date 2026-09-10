"use client";
import { useCallback, useRef, useState } from "react";

function snapshot(form: HTMLFormElement) {
  return JSON.stringify(Array.from(new FormData(form).entries()).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value.name]));
}

export function useFormChanges() {
  const baseline = useRef<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const ref = useCallback((form: HTMLFormElement | null) => {
    baseline.current = form ? snapshot(form) : null;
    setDirty(false);
  }, []);
  const onChange = (event: React.FormEvent<HTMLFormElement>) => setDirty(snapshot(event.currentTarget) !== baseline.current);
  const capture = (form: HTMLFormElement) => snapshot(form);
  const saved = (form: HTMLFormElement, submitted: string) => {
    baseline.current = submitted;
    setDirty(snapshot(form) !== submitted);
  };
  return { ref, dirty, onChange, capture, saved };
}
