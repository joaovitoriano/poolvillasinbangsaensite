"use client";

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  Info,
  LoaderCircle,
  X,
} from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { useAdminLocale } from "./AdminLocale";

export const adminTheme = {
  ink: "#001e33",
  pool: "#0f6474",
  paper: "#fbfaf6",
  line: "#ddd6ca",
  coral: "#c66f4e",
};

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "quiet" | "destructive";

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "border-[#001e33] bg-[#001e33] text-white hover:border-[#0f6474] hover:bg-[#0f6474]",
  secondary:
    "border-[#cfc8bc] bg-white text-[#001e33] hover:border-[#0f6474] hover:bg-[#f5f8f7]",
  quiet:
    "border-transparent bg-transparent text-[#0f6474] hover:bg-[#eef5f3] hover:text-[#001e33]",
  destructive:
    "border-[#d9a99b] bg-white text-[#9a3f32] hover:border-[#9a3f32] hover:bg-[#fff5f2]",
};

export const AdminButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  busy?: boolean;
  busyLabel?: string;
}>(function AdminButton({
  variant = "primary",
  busy = false,
  busyLabel,
  className,
  children,
  disabled,
  type = "button",
  ...props
}, ref) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c66f4e] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45",
        buttonStyles[variant],
        className,
      )}
      {...props}
    >
      {busy ? <LoaderCircle size={15} className="animate-spin motion-reduce:animate-none" /> : null}
      {busy && busyLabel ? busyLabel : children}
    </button>
  );
});

type FieldShellProps = {
  id?: string;
  label: string;
  helper?: string;
  error?: string;
  optional?: boolean;
  sourceText?: string;
  currentValue?: unknown;
  children: (ids: { id: string; describedBy?: string }) => ReactNode;
  className?: string;
};

function SourceTextPopover({ text }: { text: string }) {
  const { copy } = useAdminLocale();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const cancelClose = () => { if (closeTimer.current !== null) window.clearTimeout(closeTimer.current); closeTimer.current = null; };
  const scheduleClose = () => { cancelClose(); closeTimer.current = window.setTimeout(() => setOpen(false), 120); };
  useEffect(() => () => cancelClose(), []);
  return <Popover.Root open={open} onOpenChange={setOpen}><Popover.Trigger asChild><button type="button" onPointerEnter={(event) => { if (event.pointerType === "mouse") { cancelClose(); setOpen(true); } }} onPointerLeave={(event) => { if (event.pointerType === "mouse") scheduleClose(); }} className="inline-flex shrink-0 items-center gap-1 rounded-sm text-[11px] font-medium text-[#0f6474] hover:text-[#001e33] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c66f4e]" aria-label={copy("View source text", "ดูข้อความต้นฉบับ")}>{copy("Source text", "ข้อความต้นฉบับ")}<CircleHelp size={12} strokeWidth={1.8} aria-hidden="true" /></button></Popover.Trigger><Popover.Portal><Popover.Content sideOffset={6} collisionPadding={12} avoidCollisions sticky="always" onPointerEnter={(event) => { if (event.pointerType === "mouse") cancelClose(); }} onPointerLeave={(event) => { if (event.pointerType === "mouse") scheduleClose(); }} className="z-[90] max-h-[min(18rem,calc(100dvh-2rem))] w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-lg border border-[#d5d8d4] bg-white p-3 text-xs leading-5 text-[#163038] shadow-[0_12px_30px_rgba(0,30,51,.16)] outline-none"><p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#68777a]">{copy("Original source", "ต้นฉบับเดิม")}</p><p className="whitespace-pre-wrap break-words">{text || copy("No source text yet.", "ยังไม่มีข้อความต้นฉบับ")}</p><Popover.Arrow className="fill-white" /></Popover.Content></Popover.Portal></Popover.Root>;
}

function FieldShell({ id, label, helper, error, optional, sourceText, currentValue, children, className }: FieldShellProps) {
  const { copy } = useAdminLocale();
  const generated = useId();
  const inputId = id ?? generated;
  const helperId = helper ? `${inputId}-help` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(" ") || undefined;
  const showSourceText = sourceText !== undefined && String(currentValue ?? "").trim() !== sourceText.trim();
  return (
    <div className={cx("min-w-0", className)}>
      <div className="flex items-baseline justify-between gap-3 text-xs font-semibold text-[#405256]"><label htmlFor={inputId}>{label}</label><span className="flex items-center gap-2">{showSourceText ? <SourceTextPopover text={sourceText} /> : null}{optional ? <span className="font-normal text-[#7d888a]">{copy("Optional", "ไม่บังคับ")}</span> : null}</span></div>
      {children({ id: inputId, describedBy })}
      {helper ? <p id={helperId} className="mt-1.5 text-[11px] leading-5 text-[#68777a]">{helper}</p> : null}
      {error ? <p id={errorId} role="alert" className="mt-1.5 text-[11px] font-semibold leading-5 text-[#9a3f32]">{error}</p> : null}
    </div>
  );
}

const controlClass =
  "mt-1.5 min-h-11 w-full rounded-xl border border-[#d5d8d4] bg-white px-3.5 text-sm text-[#163038] outline-none transition placeholder:text-[#9aa2a2] hover:border-[#9daaa6] focus:border-[#0f6474] focus-visible:ring-2 focus-visible:ring-[#c66f4e]/25 disabled:cursor-not-allowed disabled:bg-[#f0eee9] disabled:text-[#8a9292]";

export const AdminField = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & Omit<FieldShellProps, "children" | "id">
>(function AdminField({ label, helper, error, optional, sourceText, className, ...props }, ref) {
  return (
    <FieldShell label={label} helper={helper} error={error} optional={optional} sourceText={sourceText} currentValue={props.value ?? props.defaultValue} className={className}>
      {({ id, describedBy }) => (
        <input ref={ref} id={id} aria-invalid={Boolean(error) || undefined} aria-describedby={describedBy} className={controlClass} {...props} />
      )}
    </FieldShell>
  );
});

export const AdminTextarea = forwardRef<
  HTMLTextAreaElement,
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & Omit<FieldShellProps, "children" | "id">
>(function AdminTextarea({ label, helper, error, optional, sourceText, className, rows = 4, ...props }, ref) {
  return (
    <FieldShell label={label} helper={helper} error={error} optional={optional} sourceText={sourceText} currentValue={props.value ?? props.defaultValue} className={className}>
      {({ id, describedBy }) => (
        <textarea ref={ref} id={id} rows={rows} aria-invalid={Boolean(error) || undefined} aria-describedby={describedBy} className={cx(controlClass, "min-h-28 resize-y py-3 leading-6")} {...props} />
      )}
    </FieldShell>
  );
});

export const AdminSelect = forwardRef<
  HTMLSelectElement,
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & Omit<FieldShellProps, "children" | "id">
>(function AdminSelect({ label, helper, error, optional, sourceText, className, children, ...props }, ref) {
  return (
    <FieldShell label={label} helper={helper} error={error} optional={optional} sourceText={sourceText} currentValue={props.value ?? props.defaultValue} className={className}>
      {({ id, describedBy }) => (
        <select ref={ref} id={id} aria-invalid={Boolean(error) || undefined} aria-describedby={describedBy} className={controlClass} {...props}>{children}</select>
      )}
    </FieldShell>
  );
});

export function AdminCheckbox({
  label,
  helper,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; helper?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 text-sm font-medium text-[#163038]">
        <input id={id} type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[#0f6474] focus-visible:ring-2 focus-visible:ring-[#c66f4e]" {...props} />
        <span>{label}</span>
      </label>
      {helper ? <p className="-mt-2 ml-7 text-[11px] leading-5 text-[#68777a]">{helper}</p> : null}
    </div>
  );
}

export function AdminPanel({ children, className, as: Tag = "section" }: { children: ReactNode; className?: string; as?: "section" | "div" | "article" }) {
  return <Tag className={cx("overflow-hidden rounded-2xl border border-[#e0e2de] bg-white", className)}>{children}</Tag>;
}

export function AdminPanelHeader({ title, detail, action, className }: { title: string; detail?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cx("flex flex-col gap-3 border-b border-[#e8e2d8] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5", className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-[#001e33]">{title}</h2>
        {detail ? <p className="mt-1 text-xs leading-5 text-[#68777a]">{detail}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

type NoticeTone = "info" | "success" | "warning" | "error";
const notices: Record<NoticeTone, { box: string; icon: typeof Info }> = {
  info: { box: "border-[#b7d2d7] bg-[#f1f7f8] text-[#164e58]", icon: Info },
  success: { box: "border-[#b7d4c8] bg-[#f1f8f5] text-[#276553]", icon: CheckCircle2 },
  warning: { box: "border-[#e1bea9] bg-[#fff8f1] text-[#8b4d35]", icon: AlertTriangle },
  error: { box: "border-[#deb4aa] bg-[#fff5f2] text-[#923d32]", icon: AlertCircle },
};

export function AdminNotice({ tone = "info", title, children, className }: { tone?: NoticeTone; title?: string; children: ReactNode; className?: string }) {
  const config = notices[tone];
  const Icon = config.icon;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("flex gap-3 rounded-xl border p-3 text-xs leading-5", config.box, className)}>
      <Icon size={16} className="mt-0.5 shrink-0" />
      <div><p className={title ? "font-semibold" : undefined}>{title ?? children}</p>{title ? <div className="mt-0.5 opacity-85">{children}</div> : null}</div>
    </div>
  );
}

type ToastItem = {
  id: number;
  tone: NoticeTone;
  title?: string;
  content: ReactNode;
  exiting: boolean;
};

const ToastContext = createContext<
  ((toast: Omit<ToastItem, "id" | "exiting">) => void) | null
>(null);

export function AdminToastProvider({ children }: { children: ReactNode }) {
  const { copy } = useAdminLocale();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef<Set<number>>(new Set());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.map((toast) => toast.id === id ? { ...toast, exiting: true } : toast));
    const timer = window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      timers.current.delete(timer);
    }, 180);
    timers.current.add(timer);
  }, []);

  const push = useCallback((toast: Omit<ToastItem, "id" | "exiting">) => {
    const id = ++nextId.current;
    setToasts((current) => [...current.filter((item) => !item.exiting), { ...toast, id, exiting: false }].slice(-4));
    const duration = toast.tone === "success" ? 2400 : toast.tone === "error" ? 5000 : 3500;
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      dismiss(id);
    }, duration);
    timers.current.add(timer);
  }, [dismiss]);

  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current.clear();
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[80] flex justify-center px-3 sm:top-4 sm:justify-end sm:px-4 md:left-60" aria-live="polite" aria-atomic="false">
        <ol className="flex w-full max-w-sm flex-col gap-2">
          {toasts.map((toast) => {
            const config = notices[toast.tone];
            const Icon = config.icon;
            return (
              <li key={toast.id} role={toast.tone === "error" ? "alert" : "status"} className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-3 text-xs leading-5 shadow-[0_12px_30px_rgba(0,30,51,.14)] ${config.box} ${toast.exiting ? "admin-toast-exit" : "admin-toast-enter"}`}>
                <Icon size={16} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  {toast.title ? <p className="font-semibold">{toast.title}</p> : null}
                  <div className={toast.title ? "mt-0.5 opacity-85" : undefined}>{toast.content}</div>
                </div>
                <button type="button" onClick={() => dismiss(toast.id)} className="grid size-8 shrink-0 place-items-center rounded-lg opacity-60 transition hover:bg-black/5 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current" aria-label={copy("Dismiss notification", "ปิดการแจ้งเตือน")}>
                  <X size={14} />
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </ToastContext.Provider>
  );
}

export function AdminToast({ tone = "success", title, children }: { tone?: NoticeTone; title?: string; children: ReactNode }) {
  const push = useContext(ToastContext);
  const lastPushed = useRef<{ tone: NoticeTone; title?: string; children: ReactNode } | null>(null);
  useEffect(() => {
    if (!push) return;
    const previous = lastPushed.current;
    if (previous && previous.tone === tone && previous.title === title && Object.is(previous.children, children)) return;
    lastPushed.current = { tone, title, children };
    push({ tone, title, content: children });
  }, [children, push, title, tone]);
  return null;
}

export function AdminEmptyState({ title, detail, action, className }: { title: string; detail: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cx("grid min-h-52 place-items-center px-6 py-12 text-center", className)}>
      <div className="max-w-sm">
        <h3 className="text-sm font-semibold text-[#001e33]">{title}</h3>
        <p className="mt-1.5 text-xs leading-5 text-[#68777a]">{detail}</p>
        {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}

export function AdminErrorState({ title, detail, retry, className }: { title?: string; detail: string; retry?: () => void; className?: string }) {
  const { copy } = useAdminLocale();
  return <AdminEmptyState className={className} title={title ?? copy("This section could not be loaded", "ไม่สามารถโหลดส่วนนี้ได้")} detail={detail} action={retry ? <AdminButton variant="secondary" onClick={retry}>{copy("Try again", "ลองอีกครั้ง")}</AdminButton> : undefined} />;
}

export function AdminSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  const { copy } = useAdminLocale();
  return (
    <div aria-label={copy("Loading", "กำลังโหลด")} className={cx("divide-y divide-[#ece7df] motion-safe:animate-pulse", className)}>
      {Array.from({ length: rows }, (_, index) => <div key={index} className="h-24 bg-[#f4f1eb]" />)}
    </div>
  );
}

type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";
const badgeStyles: Record<BadgeTone, string> = {
  neutral: "border-[#d6d0c5] bg-[#f8f6f1] text-[#5f6b6d]",
  info: "border-[#b7d2d7] bg-[#f1f7f8] text-[#164e58]",
  success: "border-[#b7d4c8] bg-[#f1f8f5] text-[#276553]",
  warning: "border-[#e1bea9] bg-[#fff8f1] text-[#8b4d35]",
  danger: "border-[#deb4aa] bg-[#fff5f2] text-[#923d32]",
};

export function AdminStatusBadge({ children, tone = "neutral", className }: { children: ReactNode; tone?: BadgeTone; className?: string }) {
  return <span className={cx("inline-flex min-h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-[10px] font-semibold uppercase tracking-[.08em]", badgeStyles[tone], className)}><span className="size-1.5 rounded-full bg-current" />{children}</span>;
}

export function AdminPageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[.16em] text-[#0f6474]">{eyebrow}</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold leading-none tracking-[-.02em] text-[#001e33] sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68777a]">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function AdminTideLine({ items, className }: { items: Array<{ label: string; value: ReactNode; tone?: "attention" | "context" | "healthy"; onClick?: () => void }>; className?: string }) {
  const { copy } = useAdminLocale();
  return (
    <div aria-label={copy("Operational summary", "สรุปการดำเนินงาน")} className={cx("grid overflow-hidden rounded-2xl border border-[#e0e2de] bg-white sm:grid-cols-3", className)}>
      {items.map((item) => {
        const tone = item.tone ?? "context";
        const dot = tone === "attention" ? "bg-[#c66f4e]" : tone === "healthy" ? "bg-[#2e6b59]" : "bg-[#0f6474]";
        const content = <><span aria-hidden="true" className={cx("size-2 shrink-0 rounded-full", dot)} /><span className="font-price text-xl font-semibold tabular-nums text-[#001e33]">{item.value}</span><span className="text-xs leading-4 text-[#68777a]">{item.label}</span></>;
        const classes = cx("flex min-h-16 items-center gap-3 border-b border-b-[#e8e2d8] px-4 text-left last:border-b-0 sm:border-b-0 sm:border-r sm:border-r-[#e8e2d8] sm:last:border-r-0", item.onClick && "transition hover:bg-[#f8faf9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c66f4e]");
        return item.onClick ? <button key={item.label} type="button" onClick={item.onClick} className={classes}>{content}</button> : <div key={item.label} className={classes}>{content}</div>;
      })}
    </div>
  );
}

export function AdminTabs<T extends string>({ items, value, onChange, label }: { items: Array<{ id: T; label: string; detail?: string }>; value: T; onChange: (value: T) => void; label: string }) {
  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + items.length) % items.length;
    onChange(items[nextIndex].id);
    document.getElementById(`${label}-tab-${items[nextIndex].id}`)?.focus();
  }
  return (
    <div role="tablist" aria-label={label} className="hide-scrollbar mx-4 mt-4 flex gap-1 overflow-x-auto rounded-xl bg-[#edf2f0] p-1 sm:mx-6">
      {items.map((item, index) => <button key={item.id} id={`${label}-tab-${item.id}`} type="button" role="tab" aria-selected={value === item.id} aria-controls={`${label}-panel-${item.id}`} tabIndex={value === item.id ? 0 : -1} onKeyDown={(event) => onKeyDown(event, index)} onClick={() => onChange(item.id)} className={cx("min-h-10 shrink-0 rounded-lg px-3.5 text-left text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c66f4e]", value === item.id ? "bg-white text-[#001e33] shadow-sm" : "text-[#68777a] hover:bg-white/60 hover:text-[#001e33]")}>{item.label}</button>)}
    </div>
  );
}

const DialogContext = createContext<{ close: () => void }>({ close: () => undefined });
export function useAdminDialog() { return useContext(DialogContext); }

export function AdminDialog({ open, onClose, title, description, children, size = "md", closeOnBackdrop = true }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; size?: "sm" | "md" | "lg" | "sheet"; closeOnBackdrop?: boolean }) {
  const { copy } = useAdminLocale();
  const panel = useRef<HTMLDivElement>(null);
  const previous = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    previous.current = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => panel.current?.focus(), 0);
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !panel.current) return;
      const focusable = Array.from(panel.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", onKey);
      previous.current?.focus();
    };
  }, [onClose, open]);
  if (!open) return null;
  const widths = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl", sheet: "max-w-5xl" };
  return (
    <DialogContext.Provider value={{ close: onClose }}>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#001326]/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => { if (closeOnBackdrop && event.target === event.currentTarget) onClose(); }}>
        <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="admin-dialog-title" aria-describedby={description ? "admin-dialog-description" : undefined} className={cx("flex max-h-[96vh] w-full flex-col overflow-hidden rounded-t-3xl bg-[#f5f7f4] shadow-2xl outline-none sm:max-h-[calc(100vh-3rem)] sm:rounded-3xl", widths[size])}>
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#e0e4df] bg-white px-4 py-4 sm:px-6 sm:py-5">
            <div className="min-w-0"><h2 id="admin-dialog-title" className="break-words font-serif text-xl font-semibold leading-tight text-[#001e33] [overflow-wrap:anywhere] sm:text-2xl">{title}</h2>{description ? <p id="admin-dialog-description" className="mt-1 break-words text-xs leading-5 text-[#68777a] [overflow-wrap:anywhere]">{description}</p> : null}</div>
            <AdminButton variant="quiet" aria-label={copy("Close dialog", "ปิดหน้าต่าง")} className="size-10 min-h-10 shrink-0 px-0 hover:bg-[#e2ebe7]" style={{ backgroundColor: "#edf2f0", borderRadius: "9999px" }} onClick={onClose}><X size={19} strokeWidth={2.2} /></AdminButton>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>
    </DialogContext.Provider>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel, tone = "destructive", busy = false }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; description: string; confirmLabel: string; tone?: "destructive" | "primary"; busy?: boolean }) {
  const { copy } = useAdminLocale();
  return (
    <AdminDialog open={open} onClose={onClose} title={title} description={description} size="sm" closeOnBackdrop={!busy}>
      <div className="flex justify-end gap-2 p-4 sm:p-5"><AdminButton variant="secondary" onClick={onClose} disabled={busy}>{copy("Cancel", "ยกเลิก")}</AdminButton><AdminButton variant={tone} onClick={onConfirm} busy={busy} busyLabel={copy("Working…", "กำลังดำเนินการ…")}>{confirmLabel}</AdminButton></div>
    </AdminDialog>
  );
}

export function AdminSegmented<T extends string>({ items, value, onChange, label }: { items: Array<{ value: T; label: string; count?: number }>; value: T; onChange: (value: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex flex-wrap rounded-xl border border-[#d5d8d4] bg-white p-1">
      {items.map((item) => <button key={item.value} type="button" aria-pressed={value === item.value} onClick={() => onChange(item.value)} className={cx("min-h-8 rounded-lg px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c66f4e]", value === item.value ? "bg-[#001e33] text-white" : "text-[#68777a] hover:bg-[#edf2f0] hover:text-[#001e33]")}>{item.label}{item.count !== undefined ? <span className="ml-1.5 opacity-70">{item.count}</span> : null}</button>)}
    </div>
  );
}
