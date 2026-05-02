import { useState, useEffect, useRef } from 'react'
import { Bell, AlertCircle, Clock, CheckCircle2 } from 'lucide-react'
import type { Notificacao, TipoNotificacao } from '../hooks/useNotificacoes'
import type { Cheque } from '../types/cheque'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface PainelNotificacoesProps {
  notificacoes: Notificacao[]
  onFechar: () => void
  onVerCheque: (cheque: Cheque) => void
}

interface BotaoNotificacoesProps {
  notificacoes: Notificacao[]
  onVerCheque: (cheque: Cheque) => void
}

// ---------------------------------------------------------------------------
// Helpers visuais
// ---------------------------------------------------------------------------

const CORES_TIPO: Record<TipoNotificacao, string> = {
  vencido: '#EF4444',
  vence_hoje: '#F97316',
  vence_amanha: '#EAB308',
  vence_em_breve: '#3B82F6',
}

function IconeNotificacao({ tipo }: { tipo: TipoNotificacao }) {
  const cor = CORES_TIPO[tipo]
  const tamanho = 16

  if (tipo === 'vencido') {
    return <AlertCircle size={tamanho} color={cor} style={{ flexShrink: 0 }} />
  }

  if (tipo === 'vence_hoje' || tipo === 'vence_amanha') {
    return <Clock size={tamanho} color={cor} style={{ flexShrink: 0 }} />
  }

  return <Bell size={tamanho} color={cor} style={{ flexShrink: 0 }} />
}

const TIPOS_URGENTES = new Set<TipoNotificacao>(['vencido', 'vence_hoje', 'vence_amanha'])

function contarUrgentes(notificacoes: Notificacao[]): number {
  return notificacoes.filter((n) => TIPOS_URGENTES.has(n.tipo)).length
}

// ---------------------------------------------------------------------------
// PainelNotificacoes
// ---------------------------------------------------------------------------

export function PainelNotificacoes({ notificacoes, onFechar, onVerCheque }: PainelNotificacoesProps) {
  function handleItemClick(notificacao: Notificacao) {
    onVerCheque(notificacao.cheque)
    onFechar()
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        width: 360,
        maxHeight: 480,
        background: '#0D1117',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.48)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        animation: 'painelFadeIn 150ms ease forwards',
        overflow: 'hidden',
      }}
    >
      {/* Keyframes injetados inline uma vez */}
      <style>{`
        @keyframes painelFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}
      >
        <span style={{ color: '#F0F6FC', fontWeight: 600, fontSize: 14 }}>Notificacoes</span>
        {notificacoes.length > 0 && (
          <span
            style={{
              background: '#EF4444',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 20,
              padding: '1px 7px',
              lineHeight: '18px',
            }}
          >
            {notificacoes.length}
          </span>
        )}
      </div>

      {/* Lista / Estado vazio */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {notificacoes.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '40px 24px',
              color: 'rgba(240,246,252,0.4)',
              fontSize: 13,
            }}
          >
            <CheckCircle2 size={28} color="#22C55E" />
            <span>Nenhum vencimento pendente</span>
          </div>
        ) : (
          notificacoes.map((notificacao) => (
            <button
              key={notificacao.id}
              onClick={() => handleItemClick(notificacao)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 120ms',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background =
                  'rgba(255,255,255,0.04)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              }}
            >
              <div style={{ marginTop: 2 }}>
                <IconeNotificacao tipo={notificacao.tipo} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 2,
                  }}
                >
                  <span
                    style={{
                      color: '#F0F6FC',
                      fontSize: 13,
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: 180,
                    }}
                  >
                    {notificacao.cheque.emitente}
                  </span>
                  <span style={{ color: 'rgba(240,246,252,0.35)', fontSize: 11 }}>
                    #{notificacao.cheque.numero}
                  </span>
                </div>

                <span
                  style={{
                    color: CORES_TIPO[notificacao.tipo],
                    fontSize: 12,
                  }}
                >
                  {notificacao.mensagem}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// BotaoNotificacoes
// ---------------------------------------------------------------------------

export function BotaoNotificacoes({ notificacoes, onVerCheque }: BotaoNotificacoesProps) {
  const [aberto, setAberto] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const urgentes = contarUrgentes(notificacoes)

  useEffect(() => {
    if (!aberto) return

    function handleClickFora(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setAberto(false)
      }
    }

    document.addEventListener('mousedown', handleClickFora)
    return () => document.removeEventListener('mousedown', handleClickFora)
  }, [aberto])

  return (
    <div ref={wrapperRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setAberto((prev) => !prev)}
        title="Notificacoes de vencimento"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          background: aberto ? 'rgba(255,255,255,0.08)' : 'transparent',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 8,
          cursor: 'pointer',
          transition: 'background 120ms',
          color: '#F0F6FC',
        }}
        onMouseEnter={(e) => {
          if (!aberto)
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'
        }}
        onMouseLeave={(e) => {
          if (!aberto)
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
        }}
      >
        <Bell size={18} />

        {urgentes > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 16,
              height: 16,
              padding: '0 4px',
              background: '#EF4444',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              border: '1.5px solid #0D1117',
            }}
          >
            {urgentes > 99 ? '99+' : urgentes}
          </span>
        )}
      </button>

      {aberto && (
        <PainelNotificacoes
          notificacoes={notificacoes}
          onFechar={() => setAberto(false)}
          onVerCheque={onVerCheque}
        />
      )}
    </div>
  )
}
