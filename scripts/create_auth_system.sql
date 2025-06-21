-- Sistema de Autenticação e Permissões CMV Ótica
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

-- 2. Tabela de usuários (se não existir)
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  filial_id INTEGER REFERENCES filiais(id),
  is_admin BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  senha_temporaria BOOLEAN DEFAULT false,
  senha_hash TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

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

-- 4. Inserir as funcionalidades do sistema
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
('Relatório de OS', 'Relatórios de OS', 'relatorio-os', 'bar_chart', 12)
ON CONFLICT (rota) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  icone = EXCLUDED.icone,
  ordem = EXCLUDED.ordem;

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_permissoes_usuario ON permissoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_permissoes_funcionalidade ON permissoes(funcionalidade_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_ativo ON usuarios(ativo);

-- 6. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_usuarios_updated_at ON usuarios;
CREATE TRIGGER update_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Comentários das tabelas
COMMENT ON TABLE funcionalidades IS 'Funcionalidades disponíveis no sistema';
COMMENT ON TABLE usuarios IS 'Usuários do sistema';
COMMENT ON TABLE permissoes IS 'Permissões granulares por usuário e funcionalidade';

SELECT 'Sistema de autenticação criado com sucesso!' as resultado; 