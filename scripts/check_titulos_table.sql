-- Script para verificar a estrutura da tabela titulos
-- Execute este script no SQL Editor do Supabase

-- Verificar se a tabela titulos existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'titulos'
) AS table_exists;

-- Verificar a estrutura da tabela titulos (se existir)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'titulos'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar se a coluna 'tipo' existe especificamente
SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'titulos'
    AND column_name = 'tipo'
) AS tipo_column_exists;