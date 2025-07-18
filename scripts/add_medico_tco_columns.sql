-- Script para adicionar as colunas medico_id e numero_tco na tabela custos_os
-- Execute este script no SQL Editor do Supabase

BEGIN;

-- Adicionar coluna medico_id (referência para a tabela medicos)
ALTER TABLE custos_os 
ADD COLUMN IF NOT EXISTS medico_id BIGINT REFERENCES medicos(id);

-- Adicionar coluna numero_tco (campo de texto para o número TCO)
ALTER TABLE custos_os 
ADD COLUMN IF NOT EXISTS numero_tco VARCHAR(50);

-- Adicionar comentários às novas colunas
COMMENT ON COLUMN custos_os.medico_id IS 'Referência ao médico responsável pela OS';
COMMENT ON COLUMN custos_os.numero_tco IS 'Número do TCO (Termo de Consentimento do Oftalmologista)';

-- Criar índice para melhorar performance nas consultas por médico
CREATE INDEX IF NOT EXISTS idx_custos_os_medico_id ON custos_os(medico_id);

-- Criar índice para consultas por número TCO
CREATE INDEX IF NOT EXISTS idx_custos_os_numero_tco ON custos_os(numero_tco);

COMMIT;

-- Verificar se as colunas foram adicionadas corretamente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'custos_os' 
AND column_name IN ('medico_id', 'numero_tco')
ORDER BY column_name;