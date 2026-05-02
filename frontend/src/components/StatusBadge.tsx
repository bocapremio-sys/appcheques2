import type { ChequeStatus } from '../types/cheque'

interface StatusConfig {
  label: string
  style: React.CSSProperties
  dotStyle: React.CSSProperties
  pulse: boolean
}

const STATUS_CONFIG: Record<ChequeStatus, StatusConfig> = {
  em_custodia: {
    label: 'Em Custódia',
    style: {
      backgroundColor: 'rgba(59,130,246,0.12)',
      color: '#60A5FA',
      border: '1px solid rgba(59,130,246,0.25)',
    },
    dotStyle: { backgroundColor: '#3B82F6' },
    pulse: true,
  },
  compensado: {
    label: 'Compensado',
    style: {
      backgroundColor: 'rgba(16,185,129,0.12)',
      color: '#34D399',
      border: '1px solid rgba(16,185,129,0.25)',
    },
    dotStyle: { backgroundColor: '#10B981' },
    pulse: false,
  },
  devolvido: {
    label: 'Devolvido',
    style: {
      backgroundColor: 'rgba(239,68,68,0.12)',
      color: '#F87171',
      border: '1px solid rgba(239,68,68,0.25)',
    },
    dotStyle: { backgroundColor: '#EF4444' },
    pulse: false,
  },
  recuperado: {
    label: 'Recuperado',
    style: {
      backgroundColor: 'rgba(245,158,11,0.12)',
      color: '#FCD34D',
      border: '1px solid rgba(245,158,11,0.25)',
    },
    dotStyle: { backgroundColor: '#F59E0B' },
    pulse: false,
  },
  cancelado: {
    label: 'Cancelado',
    style: {
      backgroundColor: 'rgba(100,116,139,0.12)',
      color: '#64748B',
      border: '1px solid rgba(100,116,139,0.20)',
    },
    dotStyle: { backgroundColor: '#64748B' },
    pulse: false,
  },
}

interface StatusBadgeProps {
  status: ChequeStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
      style={config.style}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.pulse ? 'animate-pulse' : ''}`}
        style={config.dotStyle}
      />
      {config.label}
    </span>
  )
}
