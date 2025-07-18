-- Criar tabela de médicos
CREATE TABLE IF NOT EXISTS medicos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_medicos_updated_at BEFORE UPDATE ON medicos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir alguns médicos de exemplo
INSERT INTO medicos (nome) VALUES 
('Dr. João Silva'),
('Dra. Maria Santos'),
('Dr. Pedro Oliveira')
ON CONFLICT DO NOTHING;