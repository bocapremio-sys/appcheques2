-- ─── Criar usuário admin via Supabase Auth ────────────────────────────────────
--
-- NÃO execute este arquivo diretamente no SQL Editor.
-- Use a opção abaixo mais adequada para você:
--
-- OPÇÃO 1 (recomendado) — Dashboard do Supabase:
--   Authentication → Users → "Add user" → Invite
--   Preencha: email = admin@appboca.com, senha forte
--
-- OPÇÃO 2 — Service Role API (execute via curl ou Postman):
--   POST https://<SEU_PROJETO>.supabase.co/auth/v1/admin/users
--   Authorization: Bearer <SERVICE_ROLE_KEY>
--   Content-Type: application/json
--   {
--     "email": "admin@appboca.com",
--     "password": "<SENHA_FORTE>",
--     "email_confirm": true
--   }
--
-- OPÇÃO 3 — SQL direto (apenas se tiver acesso ao schema auth):
-- INSERT INTO auth.users (
--   id, email, encrypted_password, email_confirmed_at,
--   raw_app_meta_data, raw_user_meta_data, created_at, updated_at
-- ) VALUES (
--   gen_random_uuid(),
--   'admin@appboca.com',
--   crypt('<SENHA_FORTE>', gen_salt('bf')),
--   NOW(),
--   '{"provider":"email","providers":["email"]}',
--   '{"role":"admin"}',
--   NOW(),
--   NOW()
-- );
--
-- ─── Segurança adicional ──────────────────────────────────────────────────────
--
-- 1. No Dashboard Supabase, vá em Authentication → Settings:
--    - Desative "Enable email confirmations" se quiser login imediato
--    - Habilite "Enable leaked password protection"
--    - Desative "Enable sign ups" (apenas admins podem criar contas)
--
-- 2. Para desabilitar sign-up público via SQL:
--    (Esta configuração impede novos cadastros sem convite)

-- Verificar se as policies de RLS estão corretas
-- Apenas usuários autenticados acessam os dados:
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
