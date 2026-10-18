interface ToastProps {
  message: string;
  actionLabel: string;
  onAction: () => void;
}

export function Toast({ message, actionLabel, onAction }: ToastProps) {
  return (
    <div
      className="absolute inset-x-0 bottom-12 z-40 flex justify-center"
      role="status"
      aria-live="polite"
    >
      <div
        className="flex items-center gap-3 rounded-[10px] border px-3 py-1.5 text-[11.5px]"
        style={{
          background: "var(--bg-elev)",
          borderColor: "var(--line)",
          color: "var(--ink-dim)",
          boxShadow: "0 10px 28px rgba(0,0,0,0.3)",
        }}
      >
        <span>{message}</span>
        <button
          type="button"
          className="text-[11.5px] font-semibold"
          style={{ color: "var(--accent)" }}
          onClick={onAction}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
