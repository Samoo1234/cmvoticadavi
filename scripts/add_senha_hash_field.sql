-- Adicionar campo senha_hash na tabela usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS senha_hash text;

-- Atualizar usuários existentes com uma senha padrão (admin123)
UPDATE usuarios 
SET senha_hash = 'admin123' 
WHERE senha_hash IS NULL; 