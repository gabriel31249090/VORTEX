'use client'

import { useState } from 'react'

export type ReportReason = 'spam' | 'sexual' | 'odio' | 'violencia' | 'assedio' | 'fake_news' | 'outro'

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam ou propaganda' },
  { value: 'sexual', label: 'Conteúdo sexual' },
  { value: 'odio', label: 'Discurso de ódio' },
  { value: 'violencia', label: 'Violência' },
  { value: 'assedio', label: 'Assédio ou bullying' },
  { value: 'fake_news', label: 'Informação falsa' },
  { value: 'outro', label: 'Outro motivo' },
]

export interface ReportModalProps {
  title?: string
  onClose: () => void
  onSubmit: (reason: ReportReason, details: string) => void | Promise<void>
}

export default function ReportModal({ title = 'Denunciar', onClose, onSubmit }: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!reason || submitting) return
    setSubmitting(true)
    await onSubmit(reason, details)
    setSubmitting(false)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 998,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 380, background: '#111118',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 24,
          fontFamily: "'Syne', sans-serif",
        }}
      >
        <h3 style={{ color: '#f0f0f8', fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{title}</h3>
        <p style={{ color: '#555577', fontSize: 13, marginBottom: 18 }}>Escolha o motivo da denúncia</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {REASONS.map(r => (
            <button
              key={r.value}
              onClick={() => setReason(r.value)}
              style={{
                textAlign: 'left', padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                background: reason === r.value ? 'rgba(255,68,102,0.12)' : '#18181f',
                border: `1px solid ${reason === r.value ? 'rgba(255,68,102,0.5)' : 'rgba(255,255,255,0.06)'}`,
                color: reason === r.value ? '#ff4466' : '#8888aa',
                fontSize: 13, fontFamily: "'Syne', sans-serif", fontWeight: 600,
                transition: 'all 0.15s',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        {reason === 'outro' && (
          <textarea
            value={details}
            onChange={e => setDetails(e.target.value)}
            placeholder="Descreva o motivo..."
            rows={3}
            style={{
              width: '100%', background: '#18181f', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: 12, color: '#f0f0f8', fontSize: 13,
              fontFamily: "'Syne', sans-serif", outline: 'none', resize: 'none',
              boxSizing: 'border-box', marginBottom: 16,
            }}
          />
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '11px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
              background: 'transparent', color: '#8888aa', cursor: 'pointer',
              fontSize: 14, fontFamily: "'Syne', sans-serif", fontWeight: 600,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reason || submitting}
            style={{
              flex: 1, padding: '11px', borderRadius: 12, border: 'none',
              background: '#ff4466', color: '#fff', cursor: reason ? 'pointer' : 'not-allowed',
              fontSize: 14, fontFamily: "'Syne', sans-serif", fontWeight: 700,
              opacity: !reason || submitting ? 0.5 : 1,
            }}
          >
            {submitting ? 'Enviando...' : 'Denunciar'}
          </button>
        </div>
      </div>
    </div>
  )
}
