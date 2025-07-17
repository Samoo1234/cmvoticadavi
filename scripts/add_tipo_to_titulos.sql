-- Script para adicionar o campo 'tipo' à tabela titulos
-- Execute este script no SQL Editor do Supabase

BEGIN;

-- Verificar se a tabela titulos existe
DO $$ 
BEGIN 
    -- Verificar se a coluna 'tipo' já existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'titulos' AND column_name = 'tipo') THEN
        -- Adicionar coluna tipo
        ALTER TABLE titulos ADD COLUMN tipo VARCHAR(255);
        
        -- Criar índice para melhor performance
        CREATE INDEX IF NOT EXISTS idx_titulos_tipo ON titulos(tipo);
        
        RAISE NOTICE 'Coluna tipo adicionada à tabela titulos com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna tipo já existe na tabela titulos.';
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Tabela titulos não existe. Certifique-se de que ela foi criada primeiro.';
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao adicionar coluna tipo: %', SQLERRM;
END
$$;

COMMIT;

-- Verificar se a coluna foi adicionada
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'titulos' AND column_name = 'tipo';