-- Script seguro para atualizar títulos com tipo do fornecedor
-- Execute este script no SQL Editor do Supabase

BEGIN;

-- Primeiro, verificar se as tabelas e colunas necessárias existem
DO $$
BEGIN
    -- Verificar se a coluna tipo existe na tabela titulos
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'titulos' AND column_name = 'tipo'
    ) THEN
        RAISE EXCEPTION 'Coluna "tipo" não existe na tabela titulos. Execute primeiro o script add_tipo_to_titulos.sql';
    END IF;
    
    -- Verificar se a coluna tipo existe na tabela fornecedores
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'fornecedores' AND column_name = 'tipo'
    ) THEN
        RAISE EXCEPTION 'Coluna "tipo" não existe na tabela fornecedores. Execute primeiro o script add_tipo_to_fornecedores.sql';
    END IF;
    
    RAISE NOTICE 'Todas as colunas necessárias existem. Prosseguindo com a atualização...';
END
$$;

-- Atualizar títulos que não têm tipo definido
UPDATE titulos 
SET tipo = f.tipo
FROM fornecedores f 
WHERE titulos.fornecedor_id = f.id
  AND (titulos.tipo IS NULL OR titulos.tipo = '');

-- Mostrar resultado da atualização
SELECT 
    COUNT(*) as total_titulos,
    COUNT(CASE WHEN tipo IS NOT NULL AND tipo != '' THEN 1 END) as titulos_com_tipo,
    COUNT(CASE WHEN tipo IS NULL OR tipo = '' THEN 1 END) as titulos_sem_tipo
FROM titulos;

-- Mostrar alguns exemplos (apenas se existirem as colunas)
SELECT 
    t.numero,
    f.nome as fornecedor,
    t.tipo,
    t.valor
FROM titulos t
JOIN fornecedores f ON t.fornecedor_id = f.id
WHERE t.tipo IS NOT NULL AND t.tipo != ''
LIMIT 5;

COMMIT;

SELECT 'Atualização concluída com sucesso!' as resultado;