'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Clock3, Flame, TrendingUp } from 'lucide-react'

export type FeedSort = 'recent' | 'hot' | 'top'

const OPTIONS: { value: FeedSort; label: string; description: string; icon: typeof Clock3 }[] = [
  { value: 'recent', label: 'Recentes', description: 'Novidades em ordem cronológica', icon: Clock3 },
  { value: 'hot', label: 'Em alta', description: 'Engajamento com peso de recência', icon: Flame },
  { value: 'top', label: 'Mais votados', description: 'Maior pontuação e conversa', icon: TrendingUp },
]

export default function FeedSortMenu({
  value,
  onChange,
}: {
  value: FeedSort
  onChange: (value: FeedSort) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const current = OPTIONS.find((option) => option.value === value) || OPTIONS[0]
  const Icon = current.icon

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div className="vtx-sort-menu" ref={rootRef}>
      <button
        className={`vtx-sort-trigger ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((state) => !state)}
        aria-expanded={open}
      >
        <Icon size={15} />
        <span>{current.label}</span>
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="vtx-sort-dropdown">
          {OPTIONS.map((option) => {
            const OptionIcon = option.icon
            const active = option.value === value
            return (
              <button
                key={option.value}
                className={active ? 'is-active' : ''}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
              >
                <span className="vtx-sort-option-icon"><OptionIcon size={16} /></span>
                <span className="vtx-sort-option-copy">
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
                {active && <Check size={15} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
