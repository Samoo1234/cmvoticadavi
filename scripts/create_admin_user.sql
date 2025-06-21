-- ============================================
-- CRIAR PRIMEIRO USUÁRIO ADMINISTRADOR
-- ============================================

-- ATENÇÃO: Execute este script APÓS criar as tabelas (create_auth_system.sql)

-- 1. Inserir usuário admin diretamente (temporário para primeiro acesso)
-- SUBSTITUA 'seu-email@admin.com' pelo email que você quer usar como admin
-- SUBSTITUA 'uuid-do-auth-user' pelo UUID real do usuário criado no auth

INSERT INTO usuarios (
  auth_user_id,
  nome,
  email,
  is_admin,
  ativo
) VALUES (
  'SUBSTITUA-PELO-UUID-DO-AUTH-USER', -- UUID do auth.users
  'Administrador do Sistema',
  'admin@cmvotica.com.br', -- SUBSTITUA pelo seu email
  TRUE,
  TRUE
) ON CONFLICT (email) DO NOTHING;

-- 2. Dar todas as permissões ao admin (opcional, admin já tem acesso total)
-- Descomente as linhas abaixo se quiser registrar as permissões explicitamente

/*
INSERT INTO permissoes (usuario_id, funcionalidade_id, pode_ver, pode_criar, pode_editar, pode_excluir)
SELECT 
  u.id as usuario_id,
  f.id as funcionalidade_id,
  TRUE as pode_ver,
  TRUE as pode_criar,
  TRUE as pode_editar,
  TRUE as pode_excluir
FROM usuarios u
CROSS JOIN funcionalidades f
WHERE u.email = 'admin@cmvotica.com.br'
ON CONFLICT (usuario_id, funcionalidade_id) DO NOTHING;
*/

-- ============================================
-- INSTRUÇÕES:
-- 1. Primeiro, crie um usuário no Supabase Auth Dashboard
-- 2. Copie o UUID dele (auth.users.id)
-- 3. Substitua 'SUBSTITUA-PELO-UUID-DO-AUTH-USER' acima
-- 4. Execute este script
-- ============================================ 