-- Script para atualizar títulos existentes com o tipo do fornecedor
-- Execute este script no SQL Editor do Supabase após adicionar a coluna 'tipo'

BEGIN;

-- Atualizar títulos existentes com o tipo do fornecedor correspondente
UPDATE titulos 
SET tipo = fornecedores.tipo
FROM fornecedores 
WHERE titulos.fornecedor_id = fornecedores.id
  AND titulos.tipo IS NULL;

-- Verificar quantos registros foram atualizados
SELECT 
    COUNT(*) as total_titulos,
    COUNT(CASE WHEN tipo IS NOT NULL THEN 1 END) as titulos_com_tipo,
    COUNT(CASE WHEN tipo IS NULL THEN 1 END) as titulos_sem_tipo
FROM titulos;

-- Mostrar alguns exemplos dos títulos atualizados
SELECT 
    t.numero,
    f.nome as fornecedor,
    t.tipo,
    t.valor,
    t.data_vencimento
FROM titulos t
JOIN fornecedores f ON t.fornecedor_id = f.id
WHERE t.tipo IS NOT NULL
ORDER BY t.data_emissao DESC
LIMIT 10;

COMMIT;

-- Mensagem de sucesso
SELECT 'Títulos atualizados com sucesso! Verifique os resultados acima.' as resultado;