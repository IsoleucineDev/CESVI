import type { ReactNode } from "react"

export type IconName =
  | "arrow"
  | "car"
  | "chevron"
  | "clock"
  | "close"
  | "dashboard"
  | "delete"
  | "dog"
  | "download"
  | "layers"
  | "map"
  | "message"
  | "minus"
  | "more"
  | "motorcycle"
  | "pause"
  | "person"
  | "play"
  | "plus"
  | "redo"
  | "rock"
  | "search"
  | "send"
  | "settings"
  | "sheep"
  | "sign"
  | "sparkle"
  | "tire"
  | "tree"
  | "truck"
  | "undo"
  | "warning"

export const iconPaths: Record<IconName, ReactNode> = {
  arrow: <path d="m9 18 6-6-6-6" />,
  car: (
    <>
      <path d="m5 17-1 2v1h2l1-2h10l1 2h2v-1l-1-2" />
      <path d="M3 13h18v4H3zM5 13l2-6h10l2 6M7 15h.01M17 15h.01" />
    </>
  ),
  chevron: <path d="m8 10 4 4 4-4" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  close: <path d="m7 7 10 10M17 7 7 17" />,
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  delete: <path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" />,
  dog: (
    <>
      <path d="M7 9 4 5v7l2 2v5h4v-4h4v4h4v-6l2-2V5l-4 4H7Z" />
      <path d="M9 6.5 12 4l3 2.5M9 11h.01M15 11h.01M11 13h2" />
    </>
  ),
  download: <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16" />,
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
    </>
  ),
  map: (
    <>
      <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" />
      <path d="M9 3v15M15 6v15" />
    </>
  ),
  message: (
    <>
      <path d="M4 5h16v12H8l-4 4V5Z" />
      <path d="M8 9h8M8 13h5" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  motorcycle: (
    <>
      <circle cx="6" cy="16" r="3" />
      <circle cx="18" cy="16" r="3" />
      <path d="m6 16 4-7 4 7h4l-3-6h3M9 9h4" />
    </>
  ),
  pause: <path d="M9 7v10M15 7v10" />,
  person: (
    <>
      <circle cx="12" cy="5" r="2.5" />
      <path d="M12 8v7M8 12l4-3 4 3M9 21l3-6 3 6" />
    </>
  ),
  play: <path d="m9 7 9 5-9 5V7Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  redo: <path d="M20 8h-7a6 6 0 0 0-6 6v2m13-8-3-3m3 3-3 3" />,
  rock: <path d="m4 18 2-8 5-5 6 2 3 7-3 5H7l-3-1Zm4-7 4 2 4-4M12 13l-2 6" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  send: <path d="m3 4 18 8-18 8 3-8-3-8Zm3 8h15" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1A7 7 0 0 0 15 6l-.3-2.6h-4L10.4 6A7 7 0 0 0 8.8 7L6.5 6l-2 3.4 2 1.5a7 7 0 0 0 0 2L4.5 14l2 3.5 2.3-1A7 7 0 0 0 10.4 18l.3 2.5h4L15 18a7 7 0 0 0 1.6-1l2.3 1 2-3.5-2-1.5a7 7 0 0 0 .1-1Z" />
    </>
  ),
  sheep: (
    <>
      <path d="M7.2 8.4a3 3 0 0 1 5.1-2 3.2 3.2 0 0 1 5 2.6 3 3 0 0 1-.8 5.8H8a3.3 3.3 0 0 1-.8-6.4Z" />
      <path d="M17 10.5h2.3a2 2 0 0 1 0 4H17M8 15v4M15 15v4M18.8 10.5l1.2-1.3M20.5 12h.01" />
    </>
  ),
  sign: <path d="M12 22V9M7 3h10l2 3-2 3H7L5 6l2-3Z" />,
  sparkle: (
    <path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Zm6 12 .7 2.3L21 18l-2.3.7L18 21l-.7-2.3L15 18l2.3-.7L18 15Z" />
  ),
  tire: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="m8 5 2 3M14 5l-1 3M18 8l-3 2M19 14l-4-1M15 19l-2-4M9 19l1-4M5 15l4-2M5 9l4 1" />
    </>
  ),
  tree: (
    <>
      <path d="M12 3 7.5 9h2L6 14h4v6h4v-6h4l-3.5-5h2L12 3Z" />
      <path d="M9 21h6" />
    </>
  ),
  truck: (
    <>
      <path d="M3 7h11v10H3zM14 11h4l3 3v3h-7z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </>
  ),
  undo: <path d="M4 8h7a6 6 0 0 1 6 6v2M4 8l3-3M4 8l3 3" />,
  warning: (
    <>
      <path d="M12 3 2.5 20h19L12 3Z" />
      <path d="M12 9v5M12 17h.01" />
    </>
  ),
}
