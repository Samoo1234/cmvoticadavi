-- Criar tabela ordens_servico
CREATE TABLE IF NOT EXISTS public.ordens_servico (
    id SERIAL PRIMARY KEY,
    numero TEXT NOT NULL UNIQUE,
    cliente TEXT NOT NULL,
    filial_id INTEGER NOT NULL,
    data_abertura TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_entrega TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_andamento', 'concluida', 'entregue', 'cancelada')),
    valor_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela itens_os (para os itens das ordens de serviço)
CREATE TABLE IF NOT EXISTS public.itens_os (
    id SERIAL PRIMARY KEY,
    os_id INTEGER NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 1,
    valor_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
    valor_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    fornecedor_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_os ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS (permitir acesso para usuários autenticados)
CREATE POLICY "Permitir acesso total para usuários autenticados" ON public.ordens_servico
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir acesso total para usuários autenticados" ON public.itens_os
    FOR ALL USING (auth.role() = 'authenticated');

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_ordens_servico_status ON public.ordens_servico(status);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_filial ON public.ordens_servico(filial_id);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_data_abertura ON public.ordens_servico(data_abertura);
CREATE INDEX IF NOT EXISTS idx_itens_os_os_id ON public.itens_os(os_id);

-- Inserir alguns dados de exemplo (opcional)
INSERT INTO public.ordens_servico (numero, cliente, filial_id, status, valor_total, observacao) VALUES
('OS-001', 'Cliente Exemplo 1', 1, 'aberta', 1500.00, 'Ordem de serviço de exemplo'),
('OS-002', 'Cliente Exemplo 2', 1, 'em_andamento', 2300.50, 'Serviço em andamento'),
('OS-003', 'Cliente Exemplo 3', 1, 'concluida', 800.00, 'Serviço concluído')
ON CONFLICT (numero) DO NOTHING;
