-- Script para migrar dados da tabela despesas para as novas tabelas separadas
-- EXECUTAR APENAS APÓS criar as novas tabelas

BEGIN;

-- 1. Migrar despesas fixas
INSERT INTO despesas_fixas (
  filial_id,
  categoria_id,
  nome,
  valor,
  periodicidade,
  dia_vencimento,
  data_vencimento,
  status,
  observacao,
  comprovante_url,
  created_at,
  updated_at
)
SELECT 
  filial_id,
  categoria_id,
  nome,
  valor,
  COALESCE(periodicidade, 'mensal') as periodicidade,
  dia_vencimento,
  data_vencimento,
  CASE 
    WHEN status IN ('ativo', 'inativo') THEN status
    ELSE 'ativo'
  END as status,
  observacao,
  comprovante_url,
  created_at,
  updated_at
FROM despesas 
WHERE tipo_despesa = 'fixa'
AND dia_vencimento IS NOT NULL;

-- 2. Migrar despesas diversas
INSERT INTO despesas_diversas (
  filial_id,
  categoria_id,
  nome,
  valor,
  data_despesa,
  data_pagamento,
  forma_pagamento,
  status,
  observacao,
  comprovante_url,
  created_at,
  updated_at
)
SELECT 
  filial_id,
  categoria_id,
  nome,
  valor,
  COALESCE(data_despesa, created_at::date) as data_despesa,
  data_pagamento,
  forma_pagamento,
  CASE 
    WHEN status IN ('pendente', 'pago') THEN status
    WHEN data_pagamento IS NOT NULL THEN 'pago'
    ELSE 'pendente'
  END as status,
  observacao,
  comprovante_url,
  created_at,
  updated_at
FROM despesas 
WHERE tipo_despesa = 'variavel';

-- 3. Verificar migração
SELECT 
  'Migração concluída!' as status,
  (SELECT COUNT(*) FROM despesas WHERE tipo_despesa = 'fixa') as despesas_fixas_originais,
  (SELECT COUNT(*) FROM despesas_fixas) as despesas_fixas_migradas,
  (SELECT COUNT(*) FROM despesas WHERE tipo_despesa = 'variavel') as despesas_diversas_originais,
  (SELECT COUNT(*) FROM despesas_diversas) as despesas_diversas_migradas;

-- 4. Relatório de dados que podem ter problemas
SELECT 
  'Despesas fixas sem dia_vencimento (não migradas):' as alerta,
  COUNT(*) as quantidade
FROM despesas 
WHERE tipo_despesa = 'fixa' AND dia_vencimento IS NULL;

SELECT 
  'Despesas variáveis sem data_despesa (usaram created_at):' as alerta,
  COUNT(*) as quantidade
FROM despesas 
WHERE tipo_despesa = 'variavel' AND data_despesa IS NULL;

COMMIT;

-- IMPORTANTE: Após verificar que a migração está correta,
-- você pode renomear a tabela original para backup:
-- ALTER TABLE despesas RENAME TO despesas_backup_old; 