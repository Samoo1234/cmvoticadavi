import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import Layout from '../components/Layout';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import TiposFornecedores from '../pages/TiposFornecedores';
import Fornecedores from '../pages/Fornecedores';
import Titulos from '../pages/Titulos';
import EmissaoTitulos from '../pages/EmissaoTitulos';
import CustoOS from '../pages/CustoOS';
import RelatorioOS from '../pages/RelatorioOS';
import Filiais from '../pages/Filiais';
import DespesasFixas from '../pages/DespesasFixas';
import DespesasDiversas from '../pages/DespesasDiversas';
import ExtratoDespesas from '../pages/ExtratoDespesas';
import CategoriasDespesas from '../pages/CategoriasDespesas';
import GerenciarUsuarios from '../pages/GerenciarUsuarios';
import { useAuth } from '../contexts/AuthContext';

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  // Tela de loading enquanto verifica autenticação
  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        sx={{
          backgroundColor: 'primary.main'
        }}
      >
        <CircularProgress size={60} sx={{ color: 'white' }} />
      </Box>
    );
  }

  // Se não está logado, mostra tela de login
  if (!user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<Login />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // Se está logado, mostra o sistema completo
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tipos-fornecedores" element={<TiposFornecedores />} />
          <Route path="/fornecedores" element={<Fornecedores />} />
          <Route path="/titulos" element={<Titulos />} />
          <Route path="/extrato-titulos" element={<EmissaoTitulos />} />
          <Route path="/emissao-titulos" element={<EmissaoTitulos />} />
          <Route path="/custo-os" element={<CustoOS />} />
          <Route path="/relatorio-os" element={<RelatorioOS />} />
          <Route path="/filiais" element={<Filiais />} />
          <Route path="/despesas-fixas" element={<DespesasFixas />} />
          <Route path="/despesas-diversas" element={<DespesasDiversas />} />
          <Route path="/extrato-despesas" element={<ExtratoDespesas />} />
          <Route path="/categorias-despesas" element={<CategoriasDespesas />} />
          <Route path="/gerenciar-usuarios" element={<GerenciarUsuarios />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default AppRoutes;
