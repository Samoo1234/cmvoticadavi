-- Script simples para criar apenas a tabela ordens_servico
CREATE TABLE public.ordens_servico (
    id SERIAL PRIMARY KEY,
    numero TEXT NOT NULL,
    cliente TEXT NOT NULL,
    filial_id INTEGER NOT NULL,
    data_abertura TEXT NOT NULL,
    data_entrega TEXT,
    status TEXT NOT NULL DEFAULT 'aberta',
    valor_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    observacao TEXT
);

-- Habilitar RLS
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;

-- Política simples para permitir acesso
CREATE POLICY "Enable all access for authenticated users" ON public.ordens_servico
    FOR ALL USING (auth.role() = 'authenticated');

-- Inserir alguns dados de teste
INSERT INTO public.ordens_servico (numero, cliente, filial_id, data_abertura, status, valor_total) VALUES
('OS-001', 'Cliente Teste 1', 1, '2025-07-25', 'aberta', 1500.00),
('OS-002', 'Cliente Teste 2', 1, '2025-07-24', 'em_andamento', 2300.50),
('OS-003', 'Cliente Teste 3', 1, '2025-07-23', 'concluida', 800.00);
