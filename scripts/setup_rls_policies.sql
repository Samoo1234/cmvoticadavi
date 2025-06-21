-- Script para configurar políticas RLS permissivas
-- Execute no SQL Editor do Supabase

-- Políticas para tabela filiais
DROP POLICY IF EXISTS "Permitir leitura filiais" ON filiais;
DROP POLICY IF EXISTS "Permitir escrita filiais" ON filiais;

CREATE POLICY "Permitir leitura filiais" ON filiais FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Permitir escrita filiais" ON filiais FOR ALL TO anon, authenticated USING (true);

-- Políticas para tabela custos_os
DROP POLICY IF EXISTS "Permitir leitura custos_os" ON custos_os;
DROP POLICY IF EXISTS "Permitir escrita custos_os" ON custos_os;

CREATE POLICY "Permitir leitura custos_os" ON custos_os FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Permitir escrita custos_os" ON custos_os FOR ALL TO anon, authenticated USING (true);

-- Políticas para tabela despesas
DROP POLICY IF EXISTS "Permitir leitura despesas" ON despesas;  
DROP POLICY IF EXISTS "Permitir escrita despesas" ON despesas;

CREATE POLICY "Permitir leitura despesas" ON despesas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Permitir escrita despesas" ON despesas FOR ALL TO anon, authenticated USING (true);

-- Políticas para tabela categorias_despesas
DROP POLICY IF EXISTS "Permitir leitura categorias_despesas" ON categorias_despesas;
DROP POLICY IF EXISTS "Permitir escrita categorias_despesas" ON categorias_despesas;

CREATE POLICY "Permitir leitura categorias_despesas" ON categorias_despesas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Permitir escrita categorias_despesas" ON categorias_despesas FOR ALL TO anon, authenticated USING (true);

-- Verificar políticas criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('custos_os', 'filiais', 'despesas', 'categorias_despesas'); 