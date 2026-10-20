import type { SVGProps } from 'react'

export type IconName =
  | 'home'
  | 'library'
  | 'review'
  | 'data'
  | 'settings'
  | 'plus'
  | 'search'
  | 'close'
  | 'arrow-right'
  | 'chevron-down'
  | 'calendar'
  | 'tag'
  | 'edit'
  | 'trash'
  | 'check'
  | 'alert'
  | 'download'
  | 'upload'
  | 'copy'
  | 'install'
  | 'wifi-off'
  | 'book'
  | 'eye'
  | 'refresh'
  | 'target'
  | 'clock'
  | 'spark'
  | 'list'
  | 'filter'
  | 'info'
  | 'external'
  | 'offline'

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName
  size?: number
}

export function Icon({ name, size = 20, strokeWidth = 1.8, ...rest }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
    ...rest,
  }

  switch (name) {
    case 'home':
      return (
        <svg {...common}>
          <path d="M3.5 10.5 12 3.5l8.5 7" />
          <path d="M5.5 9.5v10h13v-10" />
          <path d="M9.8 19.5v-5.3h4.4v5.3" />
        </svg>
      )
    case 'library':
      return (
        <svg {...common}>
          <path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h3.5v16H7a2.5 2.5 0 0 0-2.5 2V5.5Z" />
          <path d="M19.5 5.5A2.5 2.5 0 0 0 17 3h-3.5v16H17a2.5 2.5 0 0 1 2.5 2V5.5Z" />
        </svg>
      )
    case 'review':
      return (
        <svg {...common}>
          <path d="M20 11.2a8 8 0 1 1-2.3-5.6" />
          <path d="M20 4v5h-5" />
          <path d="M12 8v4.5l3 1.8" />
        </svg>
      )
    case 'data':
      return (
        <svg {...common}>
          <path d="M12 3v11" />
          <path d="m8 10 4 4 4-4" />
          <path d="M4 15.5v3A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-3" />
        </svg>
      )
    case 'settings':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 8.94 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.57 15 1.7 1.7 0 0 0 3 14H3v-4h.08A1.7 1.7 0 0 0 4.6 8.94a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.57 1.7 1.7 0 0 0 10 3h4v.08A1.7 1.7 0 0 0 15.06 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.43 9 1.7 1.7 0 0 0 21 10h.08v4H21a1.7 1.7 0 0 0-1.6 1Z" />
        </svg>
      )
    case 'plus':
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      )
    case 'search':
      return (
        <svg {...common}>
          <circle cx="10.8" cy="10.8" r="6.3" />
          <path d="m16 16 4.2 4.2" />
        </svg>
      )
    case 'close':
      return (
        <svg {...common}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      )
    case 'arrow-right':
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      )
    case 'chevron-down':
      return (
        <svg {...common}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      )
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
          <path d="M7.5 3v4M16.5 3v4M3.5 9.5h17" />
        </svg>
      )
    case 'tag':
      return (
        <svg {...common}>
          <path d="M20 13.2 13.2 20a2 2 0 0 1-2.8 0L3.5 13.3V3.5h9.8l6.7 6.7a2 2 0 0 1 0 3Z" />
          <circle cx="8.2" cy="8.2" r="1.3" />
        </svg>
      )
    case 'edit':
      return (
        <svg {...common}>
          <path d="M13.5 5.5 18.5 10.5" />
          <path d="M4 20l1-5L16.3 3.7a1.8 1.8 0 0 1 2.5 0l1.5 1.5a1.8 1.8 0 0 1 0 2.5L9 19 4 20Z" />
        </svg>
      )
    case 'trash':
      return (
        <svg {...common}>
          <path d="M4 7h16M9 7V4.5h6V7M6.5 7l.8 12.2A1.8 1.8 0 0 0 9.1 21h5.8a1.8 1.8 0 0 0 1.8-1.8L17.5 7" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      )
    case 'check':
      return (
        <svg {...common}>
          <path d="m5 12.5 4.5 4.5L19 7" />
        </svg>
      )
    case 'alert':
      return (
        <svg {...common}>
          <path d="M12 3.5 21 20H3L12 3.5Z" />
          <path d="M12 9v4.5M12 17h.01" />
        </svg>
      )
    case 'download':
      return (
        <svg {...common}>
          <path d="M12 3.5v11" />
          <path d="m7.5 10 4.5 4.5 4.5-4.5" />
          <path d="M4.5 19.5h15" />
        </svg>
      )
    case 'upload':
      return (
        <svg {...common}>
          <path d="M12 20.5v-11" />
          <path d="m7.5 14 4.5-4.5 4.5 4.5" />
          <path d="M4.5 4.5h15" />
        </svg>
      )
    case 'copy':
      return (
        <svg {...common}>
          <rect x="8.5" y="8.5" width="11" height="12" rx="2" />
          <path d="M15.5 8.5v-3a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2" />
        </svg>
      )
    case 'install':
      return (
        <svg {...common}>
          <rect x="6.5" y="2.5" width="11" height="19" rx="2.4" />
          <path d="M10 5h4M12 13v4M10 15l2 2 2-2" />
        </svg>
      )
    case 'wifi-off':
    case 'offline':
      return (
        <svg {...common}>
          <path d="M3 3l18 18" />
          <path d="M8.5 8.8A12.4 12.4 0 0 1 20.5 9.5M3.5 9.5a14.4 14.4 0 0 1 2.8-1.6" />
          <path d="M6.6 13.1a9.8 9.8 0 0 1 4.8-1.4M17.4 13.1a9.8 9.8 0 0 0-1.6-.9" />
          <path d="M9.6 16.6a4.5 4.5 0 0 1 5 0M12 20h.01" />
        </svg>
      )
    case 'book':
      return (
        <svg {...common}>
          <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18.5H6.5A2.5 2.5 0 0 0 4 23V4.5Z" />
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        </svg>
      )
    case 'eye':
      return (
        <svg {...common}>
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )
    case 'refresh':
      return (
        <svg {...common}>
          <path d="M20 7v5h-5" />
          <path d="M19.2 12a7.2 7.2 0 1 0-2 5" />
        </svg>
      )
    case 'target':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" />
        </svg>
      )
    case 'clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5.2l3.4 2" />
        </svg>
      )
    case 'spark':
      return (
        <svg {...common}>
          <path d="M12 2.8 13.7 9l6.2 1.7-6.2 1.7L12 18.6l-1.7-6.2L4.1 10.7 10.3 9 12 2.8Z" />
          <path d="M18.5 16.5 19.2 19l2.5.7-2.5.7-.7 2.5-.7-2.5-2.5-.7 2.5-.7.7-2.5Z" />
        </svg>
      )
    case 'list':
      return (
        <svg {...common}>
          <path d="M8.5 6h12M8.5 12h12M8.5 18h12" />
          <path d="M4 6h.01M4 12h.01M4 18h.01" />
        </svg>
      )
    case 'filter':
      return (
        <svg {...common}>
          <path d="M3.5 5.5h17l-6.5 7.4v5.3L10 21v-8.1L3.5 5.5Z" />
        </svg>
      )
    case 'info':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" />
        </svg>
      )
    case 'external':
      return (
        <svg {...common}>
          <path d="M14 4h6v6M20 4l-9 9" />
          <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
        </svg>
      )
    default:
      return null
  }
}
