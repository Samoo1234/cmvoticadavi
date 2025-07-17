-- Script para verificar e corrigir a estrutura da tabela titulos
-- Garantindo que o campo tipo seja salvo corretamente

-- 1. Verificar a estrutura atual da tabela titulos
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'titulos' 
ORDER BY ordinal_position;

-- 2. Verificar se existem títulos com tipo null
SELECT COUNT(*) as total_titulos,
       COUNT(tipo) as titulos_com_tipo,
       COUNT(*) - COUNT(tipo) as titulos_sem_tipo
FROM titulos;

-- 3. Mostrar alguns exemplos de títulos sem tipo
SELECT t.id, t.numero, t.fornecedor_id, t.tipo, f.nome as fornecedor_nome, f.tipo as fornecedor_tipo
FROM titulos t
LEFT JOIN fornecedores f ON t.fornecedor_id = f.id
WHERE t.tipo IS NULL
LIMIT 10;

-- 4. Atualizar títulos existentes que não têm tipo definido
-- Pegar o tipo do fornecedor associado
UPDATE titulos 
SET tipo = (
    SELECT f.tipo 
    FROM fornecedores f 
    WHERE f.id = titulos.fornecedor_id
)
WHERE tipo IS NULL;

-- 5. Verificar o resultado da atualização
SELECT COUNT(*) as total_titulos,
       COUNT(tipo) as titulos_com_tipo,
       COUNT(*) - COUNT(tipo) as titulos_sem_tipo
FROM titulos;

-- 6. Mostrar alguns exemplos após a correção
SELECT t.id, t.numero, t.fornecedor_id, t.tipo, f.nome as fornecedor_nome, f.tipo as fornecedor_tipo
FROM titulos t
LEFT JOIN fornecedores f ON t.fornecedor_id = f.id
ORDER BY t.id DESC
LIMIT 10;