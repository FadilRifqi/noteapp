interface IconProps {
  size?: number;
}

function base(props: IconProps) {
  return {
    width: props.size ?? 16,
    height: props.size ?? 16,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  );
}

export function PinIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6.2 2.8h3.6l-.5 3.1 2 1.7v1.2H4.7V7.6l2-1.7-.5-3.1Z" />
      <path d="M8 8.8v4.4" />
    </svg>
  );
}

export function PaletteIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 2.5a5.5 5.5 0 1 0 0 11c.9 0 1.4-.6 1.4-1.3 0-.4-.2-.7-.4-1-.2-.2-.3-.5-.3-.8 0-.7.6-1.3 1.3-1.3h.9c1 0 1.8-.8 1.8-1.8C12.7 4.4 10.6 2.5 8 2.5Z" />
      <circle cx="5.6" cy="6.1" r="0.55" fill="currentColor" stroke="none" />
      <circle cx="8" cy="5" r="0.55" fill="currentColor" stroke="none" />
      <circle cx="10.4" cy="6.1" r="0.55" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function MinusIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3.5 8h9" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4.2 4.2l7.6 7.6M11.8 4.2l-7.6 7.6" />
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 4.5h10M6.4 4.5V3.2c0-.4.3-.7.7-.7h1.8c.4 0 .7.3.7.7v1.3" />
      <path d="M4.6 4.5l.5 8c0 .5.4.8.9.8h4c.5 0 .9-.3.9-.8l.5-8" />
      <path d="M6.8 7v4M9.2 7v4" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="7" cy="7" r="3.6" />
      <path d="M9.7 9.7l3.1 3.1" />
    </svg>
  );
}
