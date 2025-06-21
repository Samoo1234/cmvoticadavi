-- Script para desabilitar RLS nas tabelas principais
-- Execute no SQL Editor do Supabase

-- Desabilitar RLS nas tabelas que estão com cadeado
ALTER TABLE custos_os DISABLE ROW LEVEL SECURITY;
ALTER TABLE filiais DISABLE ROW LEVEL SECURITY;
ALTER TABLE despesas DISABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_despesas DISABLE ROW LEVEL SECURITY;

-- Verificar status do RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('custos_os', 'filiais', 'despesas', 'categorias_despesas'); 