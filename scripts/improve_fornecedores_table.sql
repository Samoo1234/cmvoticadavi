-- Script para melhorar a tabela fornecedores
-- Adicionar campo 'ativo' para implementar soft delete

-- Verificar se a coluna 'ativo' já existe
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'fornecedores' AND column_name = 'ativo') THEN
        -- Adicionar coluna ativo
        ALTER TABLE fornecedores ADD COLUMN ativo BOOLEAN NOT NULL DEFAULT true;
        
        -- Criar índice para melhor performance
        CREATE INDEX IF NOT EXISTS idx_fornecedores_ativo ON fornecedores(ativo);
        
        -- Comentário explicativo
        COMMENT ON COLUMN fornecedores.ativo IS 'Indica se o fornecedor está ativo no sistema';
        
        RAISE NOTICE 'Coluna ativo adicionada à tabela fornecedores';
    ELSE
        RAISE NOTICE 'Coluna ativo já existe na tabela fornecedores';
    END IF;
END $$;

-- Verificar resultado
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'fornecedores' 
ORDER BY ordinal_position; 