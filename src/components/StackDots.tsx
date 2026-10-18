interface StackDotsProps {
  count: number;
  index: number;
  onSelect: (index: number) => void;
}

const MAX_DOTS = 9;

export function StackDots({ count, index, onSelect }: StackDotsProps) {
  if (count <= 1) {
    return <div className="h-2" />;
  }

  const start = Math.max(0, Math.min(index - Math.floor(MAX_DOTS / 2), count - MAX_DOTS));
  const visible = Math.min(count, MAX_DOTS);

  return (
    <div className="flex h-2 items-center gap-1.5" role="tablist" aria-label="Notes">
      {Array.from({ length: visible }, (_, i) => {
        const noteIndex = start + i;
        return (
          <button
            key={noteIndex}
            type="button"
            role="tab"
            aria-selected={noteIndex === index}
            aria-label={`Note ${noteIndex + 1}`}
            className="dot"
            data-current={noteIndex === index}
            onClick={() => onSelect(noteIndex)}
          />
        );
      })}
    </div>
  );
}
