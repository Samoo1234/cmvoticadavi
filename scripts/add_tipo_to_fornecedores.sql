-- Script para adicionar o campo 'tipo' à tabela fornecedores
-- Execute este script no SQL Editor do Supabase

BEGIN;

-- Verificar se a tabela fornecedores existe
DO $$ 
BEGIN 
    -- Verificar se a coluna 'tipo' já existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'fornecedores' AND column_name = 'tipo') THEN
        -- Adicionar coluna tipo
        ALTER TABLE fornecedores ADD COLUMN tipo VARCHAR(255) NOT NULL DEFAULT 'Não especificado';
        
        -- Criar índice para melhor performance
        CREATE INDEX IF NOT EXISTS idx_fornecedores_tipo ON fornecedores(tipo);
        
        -- Comentário explicativo
        COMMENT ON COLUMN fornecedores.tipo IS 'Tipo/categoria do fornecedor';
        
        RAISE NOTICE 'Coluna tipo adicionada à tabela fornecedores';
    ELSE
        RAISE NOTICE 'Coluna tipo já existe na tabela fornecedores';
    END IF;
END $$;

-- Verificar resultado
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'fornecedores' 
ORDER BY ordinal_position;

COMMIT;