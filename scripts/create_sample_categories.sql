-- Script para criar categorias de exemplo separadas por tipo
-- Execute este script no Supabase SQL Editor

-- Categorias específicas para DESPESAS FIXAS
INSERT INTO categorias_despesas (nome, tipo) VALUES
('Aluguel', 'fixa'),
('Energia Elétrica', 'fixa'),
('Água', 'fixa'),
('Internet', 'fixa'),
('Telefone', 'fixa'),
('Seguro', 'fixa'),
('Software/Licenças', 'fixa'),
('Salários', 'fixa'),
('Plano de Saúde', 'fixa'),
('Financiamentos', 'fixa'),
('Mensalidades', 'fixa')
ON CONFLICT (nome) DO NOTHING;

-- Categorias específicas para DESPESAS DIVERSAS (variáveis)
INSERT INTO categorias_despesas (nome, tipo) VALUES
('Material de Escritório', 'variavel'),
('Combustível', 'variavel'),
('Manutenção', 'variavel'),
('Viagem/Hospedagem', 'variavel'),
('Alimentação', 'variavel'),
('Marketing', 'variavel'),
('Treinamentos', 'variavel'),
('Consultorias', 'variavel'),
('Equipamentos', 'variavel'),
('Despesas Bancárias', 'variavel'),
('Impostos Variáveis', 'variavel'),
('Frete/Entrega', 'variavel')
ON CONFLICT (nome) DO NOTHING;

-- Categorias que podem ser usadas em AMBOS os tipos
INSERT INTO categorias_despesas (nome, tipo) VALUES
('Impostos', 'ambos'),
('Taxas', 'ambos'),
('Serviços Terceirizados', 'ambos'),
('Contabilidade', 'ambos'),
('Jurídico', 'ambos')
ON CONFLICT (nome) DO NOTHING;

-- Verificar as categorias criadas
SELECT nome, tipo, created_at 
FROM categorias_despesas 
ORDER BY tipo, nome; 