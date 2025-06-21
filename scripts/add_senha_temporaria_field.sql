-- Script para adicionar campo senha_temporaria na tabela usuarios
-- Execute no SQL Editor do Supabase

-- Adicionar coluna senha_temporaria se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'usuarios' 
    AND column_name = 'senha_temporaria'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN senha_temporaria BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Verificar se foi adicionado
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'usuarios' 
AND column_name = 'senha_temporaria'; 