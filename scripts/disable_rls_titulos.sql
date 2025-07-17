-- Script para desabilitar RLS na tabela titulos
-- Execute este script no SQL Editor do Supabase

-- Desabilitar RLS na tabela titulos
ALTER TABLE titulos DISABLE ROW LEVEL SECURITY;

-- Verificar se RLS foi desabilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'titulos';

-- Verificar se existem políticas RLS ativas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'titulos';