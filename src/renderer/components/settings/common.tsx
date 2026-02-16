import type React from 'react'

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative', width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
        background: checked ? '#548C5A' : 'rgba(89,86,83,0.3)', transition: 'background 0.2s ease',
      }}
    >
      <span
        style={{
          position: 'absolute', top: 2, left: checked ? 18 : 2,
          width: 16, height: 16, borderRadius: '50%', background: '#9A9692',
          transition: 'left 0.2s ease',
        }}
      />
    </button>
  )
}

export function Select({
  value,
  options,
  labels,
  onChange,
}: {
  value: string
  options: string[]
  labels?: Record<string, string>
  onChange: (v: string) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: 'rgba(89,86,83,0.15)', border: '1px solid rgba(89,86,83,0.3)',
        borderRadius: 6, padding: '5px 8px', fontSize: 13, color: '#9A9692',
        outline: 'none', fontFamily: 'inherit', minWidth: 160,
      }}
    >
      {options.map((opt) => (
        <option key={opt} value={opt} style={{ background: '#0E0E0D' }}>
          {labels?.[opt] ?? opt}
        </option>
      ))}
    </select>
  )
}

export function NumberInput({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (v: number) => void
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const parsed = Number(e.target.value)
        if (!isNaN(parsed) && parsed >= (min ?? 0) && parsed <= (max ?? Infinity)) {
          onChange(parsed)
        }
      }}
      style={{
        background: 'rgba(89,86,83,0.15)', border: '1px solid rgba(89,86,83,0.3)',
        borderRadius: 6, padding: '5px 8px', fontSize: 13, color: '#9A9692',
        outline: 'none', fontFamily: 'inherit', width: 80,
      }}
    />
  )
}

export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
      <span style={{ fontSize: 13, color: '#9A9692' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{children}</div>
    </div>
  )
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, color: '#74747C', marginBottom: 8 }}>{title}</div>
      <div>{children}</div>
    </div>
  )
}
