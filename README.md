# CMV Ótica

Sistema de Controle de Custos, Fornecedores e Relatórios para Óticas

## Stack Utilizada
- **Frontend:** React.js (Vite)
- **UI:** Material UI (MUI)
- **Backend:** Supabase (PostgreSQL gerenciado, autenticação, API)
- **Roteamento:** React Router DOM
- **Tema:** Azul escuro e branco (cores padrão do cliente)

## Estrutura de Pastas Sugerida
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

## Boas Práticas e Segurança
- Uso de variáveis de ambiente para chaves sensíveis
- Validação de formulários no frontend
- Autenticação de usuários via Supabase
- Layout responsivo (Material UI)
- Separação de responsabilidades (componentes, serviços, hooks)

## Telas e Funcionalidades
- Dashboard (resumo de vendas, OS, títulos)
- Cadastro de Tipos de Fornecedores
- Cadastro de Fornecedores
- Cadastro de Títulos
- Emissão de Títulos
- Custo de OS
- Relatório de OS

## Tema Visual
- **Cores principais:** Azul escuro e branco
- Layout moderno, profissional e responsivo
- Navegação lateral (Drawer) e AppBar no topo

## Próximos Passos
1. Implementação do layout base (menu lateral, AppBar, responsividade)
2. Criação das páginas principais
3. Integração com Supabase para autenticação e dados
4. Validação e feedback visual nos formulários
5. Documentação contínua

---

Para dúvidas ou sugestões, entre em contato com o time de desenvolvimento.

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
