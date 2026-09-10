"use client";

import { useLayoutEffect, useRef, useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6)].filter(Boolean).join("-");
}

type PhoneInputProps = Omit<ComponentProps<typeof Input>, "type" | "inputMode" | "value" | "defaultValue" | "ref"> & {
  value?: string;
  defaultValue?: string;
};

export function PhoneInput({ value, defaultValue = "", onChange, ...props }: PhoneInputProps) {
  const [internalValue, setInternalValue] = useState(() => formatPhone(defaultValue));
  const displayedValue = formatPhone(value ?? internalValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (caretRef.current !== null) {
      inputRef.current?.setSelectionRange(caretRef.current, caretRef.current);
      caretRef.current = null;
    }
  });

  return (
    <Input
      {...props}
      ref={inputRef}
      type="tel"
      inputMode="numeric"
      value={displayedValue}
      onChange={(event) => {
        const input = event.currentTarget;
        const raw = input.value;
        let digitsBeforeCaret = raw.slice(0, input.selectionStart ?? raw.length).replace(/\D/g, "").length;
        let digits = raw.replace(/\D/g, "");
        const inputType = (event.nativeEvent as InputEvent).inputType;

        // Deleting beside a separator must remove a digit rather than trapping
        // the cursor behind a dash that the mask immediately inserts again.
        if (digits === displayedValue.replace(/\D/g, "") && raw.length < displayedValue.length) {
          const index = inputType === "deleteContentBackward" ? digitsBeforeCaret - 1 : digitsBeforeCaret;
          if (index >= 0 && index < digits.length) {
            digits = digits.slice(0, index) + digits.slice(index + 1);
            if (inputType === "deleteContentBackward") digitsBeforeCaret--;
          }
        }

        const formatted = formatPhone(digits);
        let caret = 0;
        let seen = 0;
        while (caret < formatted.length && seen < digitsBeforeCaret) {
          if (/\d/.test(formatted[caret])) seen++;
          caret++;
        }
        input.value = formatted;
        input.setSelectionRange(caret, caret);
        caretRef.current = caret;
        setInternalValue(formatted);
        onChange?.(event);
      }}
    />
  );
}
