-- Script para verificar a tabela tipos_fornecedores
-- Execute este script no SQL Editor do Supabase

-- Verificar se a tabela existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'tipos_fornecedores'
) as tabela_existe;

-- Se a tabela existir, mostrar sua estrutura
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'tipos_fornecedores'
ORDER BY ordinal_position;

-- Se a tabela existir, mostrar os dados
SELECT * FROM tipos_fornecedores LIMIT 10;

-- Contar quantos registros existem
SELECT COUNT(*) as total_registros FROM tipos_fornecedores;