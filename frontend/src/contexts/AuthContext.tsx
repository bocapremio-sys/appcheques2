import { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, supabaseConfigurado } from '../services/supabase'

interface AuthContextValue {
  session: Session | null
  user: User | null
  isLoading: boolean
  modoMock: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const MOCK_USER_EMAIL = 'admin@appboca.com'
const MOCK_PASSWORD = 'admin123'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mockAutenticado, setMockAutenticado] = useState(false)

  const modoMock = !supabaseConfigurado

  useEffect(() => {
    if (modoMock) {
      setIsLoading(false)
      return
    }

    supabase!.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setIsLoading(false)
    })

    const { data: listener } = supabase!.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [modoMock])

  const signIn = async (email: string, password: string): Promise<string | null> => {
    if (modoMock) {
      if (email === MOCK_USER_EMAIL && password === MOCK_PASSWORD) {
        setMockAutenticado(true)
        return null
      }
      return 'E-mail ou senha incorretos.'
    }

    const { error } = await supabase!.auth.signInWithPassword({ email, password })
    return error ? traduzirErro(error.message) : null
  }

  const signOut = async () => {
    if (modoMock) {
      setMockAutenticado(false)
      return
    }
    await supabase!.auth.signOut()
  }

  const mockSession = mockAutenticado
    ? ({ user: { email: MOCK_USER_EMAIL } } as unknown as Session)
    : null

  return (
    <AuthContext.Provider
      value={{
        session: modoMock ? mockSession : session,
        user: modoMock ? (mockSession?.user ?? null) : (session?.user ?? null),
        isLoading,
        modoMock,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}

function traduzirErro(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (msg.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar.'
  if (msg.includes('too many requests')) return 'Muitas tentativas. Aguarde alguns minutos.'
  return 'Erro ao fazer login. Tente novamente.'
}
