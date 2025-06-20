# Sistema CMV Ótica

Sistema de Controle de Custos, Fornecedores e Relatórios para Óticas

## Stack Utilizada
- **Frontend:** React.js (Vite)
- **UI:** Material UI (MUI)
- **Backend:** Supabase (PostgreSQL gerenciado, autenticação, API)
- **Roteamento:** React Router DOM
- **Tema:** Azul escuro e branco (cores padrão do cliente)

## Estrutura de Pastas
```
cmv-otica/
│
├── public/
├── src/
│   ├── assets/           # Imagens, logos, ícones
│   ├── components/       # Componentes reutilizáveis (Menu, AppBar, Tabela, etc)
│   ├── pages/            # Páginas principais do sistema
│   ├── services/         # Integração com Supabase e outros serviços
│   ├── routes/           # Definição das rotas do sistema
│   ├── hooks/            # Custom hooks
│   ├── utils/            # Funções utilitárias
│   ├── App.tsx
│   └── main.tsx
├── .env                  # Variáveis de ambiente (Supabase)
├── package.json
└── README.md
```

## Instalação e Execução
```bash
npm install
npm run dev
```

## Configuração do Supabase
1. Crie uma conta em https://supabase.com/
2. Crie um novo projeto e obtenha a URL e a anon key.
3. Crie um arquivo `.env` na raiz do projeto:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=suachaveanon
```

## Visão Geral
Sistema para controle de custos, fornecedores, títulos a pagar e relatórios financeiros, voltado para óticas. Permite o cadastro e gerenciamento de fornecedores, tipos de fornecedores, títulos, custos de ordens de serviço (OS) e geração de relatórios detalhados.

---

## Fluxo de Navegação

### 1. Tela Inicial / Dashboard
- Acesso rápido aos principais módulos:
  - Cadastro de Tipos de Fornecedores
  - Cadastro de Fornecedores
  - Cadastro de Títulos
  - Emissão de Títulos
  - Custo de OS
  - Relatórios
- Resumo rápido (opcional):
  - Total de vendas
  - Quantidade de OS abertas
  - Avisos de títulos a vencer

### 2. Cadastro de Tipos de Fornecedores
- Listagem dos tipos cadastrados (Lentes, Armações, Insumos, Diversos)
- Adicionar, editar e excluir tipos

### 3. Cadastro de Fornecedores
- Listagem de fornecedores com busca e filtros por tipo e filial
- Cadastro com campos: Nome, CNPJ, Endereço, Tipo, Filiais
- Editar e excluir fornecedores

### 4. Cadastro de Títulos
- Listagem de títulos cadastrados
- Cadastro com campos: Filial, Fornecedor, Data de Vencimento, Valor, Observações
- Editar, salvar e excluir títulos

### 5. Emissão de Títulos
- Filtros: Tipo, Fornecedor, Filial, Data de Vencimento, Data de Pagamento, Data Inicial/Final
- Listagem dos títulos filtrados
- Ações: Pagar, Editar, Excluir
- Gerar relatório (visualização na tela, opção de impressão)

### 6. Custo de OS
- Listagem das OS cadastradas
- Cadastro com campos: Filial, Data da OS, Valor de Venda, Custo das Lentes, Custo da Armação, Custo do Marketing, Outros Custos
- Editar, salvar e excluir OS

### 7. Relatório de OS
- Filtros: Filial, Data Inicial, Data Final
- Listagem das OS filtradas
- Exibição de totais e indicadores:
  - Valor total das vendas
  - Custo total das lentes
  - Custo total das armações
  - Custo total do marketing
  - Custo total "outros"
  - Margem bruta
  - Total de OS (quantidade)
  - Total de armações (quantidade)
  - Margem média por OS
- Opção de imprimir relatório

### 8. Navegação Geral
- Menu lateral ou superior para acesso rápido a cada módulo
- Botão de retorno à tela inicial/dashboard em todas as telas
- Opção de logout

---

## Detalhamento das Telas

### Tela Inicial / Dashboard
- Menu de navegação
- Resumo rápido de vendas, OS e títulos
- Botões de acesso rápido para cada módulo

### Cadastro de Tipos de Fornecedores
- Lista dos tipos cadastrados
- Botão para adicionar novo tipo
- Editar e excluir tipos existentes

### Cadastro de Fornecedores
- Lista de fornecedores com filtros
- Botão para adicionar novo fornecedor
- Formulário: Nome, CNPJ, Endereço, Tipo, Filiais
- Editar e excluir fornecedores

### Cadastro de Títulos
- Lista de títulos cadastrados
- Botão para adicionar novo título
- Formulário: Filial, Fornecedor, Data de Vencimento, Valor, Observações
- Salvar/Editar e Excluir títulos

### Emissão de Títulos
- Filtros avançados
- Lista de títulos filtrados
- Ações: Pagar, Editar, Excluir
- Gerar relatório (visualização e impressão)

### Custo de OS
- Lista de OS cadastradas
- Botão para adicionar nova OS
- Formulário: Filial, Data da OS, Valor de Venda, Custo das Lentes, Custo da Armação, Custo do Marketing, Outros Custos
- Salvar/Editar e Excluir OS

### Relatório de OS
- Filtros por filial e datas
- Lista das OS filtradas
- Totais e indicadores:
  - Valor total das vendas
  - Custo total das lentes
  - Custo total das armações
  - Custo total do marketing
  - Custo total "outros"
  - Margem bruta
  - Total de OS (quantidade)
  - Total de armações (quantidade)
  - Margem média por OS
- Imprimir relatório

### Navegação Geral
- Menu lateral ou superior
- Retorno ao dashboard
- Logout

---

## Cálculos e Indicadores
- **Margem Bruta:** Valor total das vendas - soma dos custos
- **Margem Média por OS:** Margem Bruta / Total de OS
- **Totais:** Quantidade de OS, quantidade de armações, valores totais de cada custo

---

## Boas Práticas e Segurança
- Uso de variáveis de ambiente para chaves sensíveis
- Validação de formulários no frontend
- Autenticação de usuários via Supabase
- Layout responsivo (Material UI)
- Separação de responsabilidades (componentes, serviços, hooks)

## Observações
- O sistema é focado em controle financeiro e operacional de óticas
- Permite edição, exclusão e salvamento em todas as telas
- Relatórios podem ser impressos
- Cálculos de margem e totais são destacados
