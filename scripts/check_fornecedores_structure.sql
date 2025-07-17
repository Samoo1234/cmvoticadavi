-- Script para verificar a estrutura da tabela fornecedores
-- Execute este script no SQL Editor do Supabase

-- Verificar se a tabela fornecedores existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'fornecedores'
) as tabela_fornecedores_existe;

-- Mostrar a estrutura da tabela fornecedores
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'fornecedores'
ORDER BY ordinal_position;

-- Verificar se existe a coluna tipo na tabela fornecedores
SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'fornecedores' 
    AND column_name = 'tipo'
) as coluna_tipo_existe;

-- Mostrar alguns dados da tabela fornecedores
SELECT 
    id,
    nome,
    tipo,
    cnpj
FROM fornecedores 
LIMIT 10;

-- Contar fornecedores por tipo
SELECT 
    tipo,
    COUNT(*) as quantidade
FROM fornecedores 
GROUP BY tipo
ORDER BY quantidade DESC;

-- Verificar fornecedores com tipo NULL
SELECT COUNT(*) as fornecedores_sem_tipo
FROM fornecedores 
WHERE tipo IS NULL OR tipo = '';