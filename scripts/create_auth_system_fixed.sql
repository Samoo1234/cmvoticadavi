-- Sistema de Autenticação e Permissões CMV Ótica - VERSÃO CORRIGIDA
-- Execute este script no Supabase SQL Editor

-- 1. Tabela de funcionalidades do sistema
CREATE TABLE IF NOT EXISTS funcionalidades (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  rota VARCHAR(100) UNIQUE NOT NULL,
  icone VARCHAR(50),
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Tabela de usuários (ajustar se necessário)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usuarios' AND column_name='senha_hash') THEN
    ALTER TABLE usuarios ADD COLUMN senha_hash TEXT;
  END IF;
END $$;

-- 3. Tabela de permissões
CREATE TABLE IF NOT EXISTS permissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  funcionalidade_id INTEGER NOT NULL REFERENCES funcionalidades(id) ON DELETE CASCADE,
  pode_ver BOOLEAN DEFAULT false,
  pode_criar BOOLEAN DEFAULT false,
  pode_editar BOOLEAN DEFAULT false,
  pode_excluir BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(usuario_id, funcionalidade_id)
);

-- 4. Limpar funcionalidades existentes e inserir novas
DELETE FROM funcionalidades;

-- 5. Inserir as funcionalidades do sistema
INSERT INTO funcionalidades (nome, descricao, rota, icone, ordem) VALUES
('Dashboard', 'Visão geral do sistema', 'dashboard', 'dashboard', 1),
('Filiais', 'Gerenciamento de filiais', 'filiais', 'store', 2),
('Tipos de Fornecedores', 'Categorias de fornecedores', 'tipos-fornecedores', 'category', 3),
('Fornecedores', 'Cadastro de fornecedores', 'fornecedores', 'business', 4),
('Títulos', 'Gerenciamento de títulos', 'titulos', 'receipt', 5),
('Extrato de Títulos', 'Relatório de títulos', 'extrato-titulos', 'assignment', 6),
('Categorias de Despesas', 'Tipos de despesas', 'categorias-despesas', 'label', 7),
('Despesas Fixas', 'Despesas mensais fixas', 'despesas-fixas', 'payments', 8),
('Despesas Diversas', 'Despesas eventuais', 'despesas-diversas', 'payments', 9),
('Extrato de Despesas', 'Relatório de despesas', 'extrato-despesas', 'description', 10),
('Custo de OS', 'Custos de ordens de serviço', 'custo-os', 'monetization_on', 11),
('Relatório de OS', 'Relatórios de OS', 'relatorio-os', 'bar_chart', 12);

-- 6. Índices para performance
CREATE INDEX IF NOT EXISTS idx_permissoes_usuario ON permissoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_permissoes_funcionalidade ON permissoes(funcionalidade_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_ativo ON usuarios(ativo);

-- 7. Verificar resultado
SELECT 'Sistema criado com sucesso!' as resultado;
SELECT COUNT(*) as total_funcionalidades FROM funcionalidades; 