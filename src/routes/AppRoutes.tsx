import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { CircularProgress, Box, Alert, Paper } from '@mui/material';
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
import Medicos from '../pages/Medicos';
import { useAuth } from '../contexts/AuthContext';

// Componente para proteger rotas que precisam de permissão específica
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  requiredRole?: 'admin' | 'user';
  requiredPermission?: string;
  requiredAction?: 'ver' | 'criar' | 'editar' | 'excluir';
}> = ({ children, requiredRole, requiredPermission, requiredAction = 'ver' }) => {
  const { user, isAdmin, hasPermission } = useAuth();

  // Verificar se precisa ser admin
  if (requiredRole === 'admin' && !isAdmin) {
    return (
      <Box p={3}>
        <Paper sx={{ p: 3 }}>
          <Alert severity="error">
            <strong>Acesso Negado</strong>
            <br />
            Você não tem permissão para acessar esta página. Esta funcionalidade é restrita apenas para administradores.
          </Alert>
        </Paper>
      </Box>
    );
  }

  // Verificar permissão específica
  if (requiredPermission && !hasPermission(requiredPermission, requiredAction)) {
    return (
      <Box p={3}>
        <Paper sx={{ p: 3 }}>
          <Alert severity="error">
            <strong>Acesso Negado</strong>
            <br />
            Você não tem permissão para acessar esta funcionalidade.
          </Alert>
        </Paper>
      </Box>
    );
  }

  return <>{children}</>;
};

// Componente interno que gerencia a navegação após login
const AppContent: React.FC = () => {
  const { user, loading, isAdmin, hasPermission } = useAuth();
  const navigate = useNavigate();

  // Redirecionar para dashboard após login se estiver em página não autorizada
  useEffect(() => {
    if (user && !loading) {
      const currentPath = window.location.pathname;
      console.log(`🔍 Verificando acesso: usuário ${user.email} em ${currentPath} (admin: ${isAdmin})`);
      
      // Se está tentando acessar gerenciar-usuarios sem ser admin
      if (currentPath === '/gerenciar-usuarios' && !isAdmin) {
        console.log('🔄 Redirecionando usuário não-admin do gerenciar-usuarios para dashboard');
        navigate('/', { replace: true });
        return;
      }
      
      // Se está em uma rota que não tem permissão para ver
      const rotaPermissao = currentPath.replace('/', '');
      if (rotaPermissao && rotaPermissao !== '' && rotaPermissao !== 'dashboard') {
        if (!hasPermission(rotaPermissao, 'ver') && !isAdmin) {
          console.log(`🔄 Redirecionando usuário sem permissão de ${currentPath} para dashboard`);
          navigate('/', { replace: true });
          return;
        }
      }
      
      // Se nenhum redirecionamento foi necessário
      console.log(`✅ Usuário tem acesso à rota ${currentPath}`);
    }
  }, [user, loading, isAdmin, hasPermission, navigate]);

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
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  // Se está logado, mostra o sistema completo
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        
        {/* Rotas com controle de permissão */}
        <Route 
          path="/medicos" 
          element={
            <ProtectedRoute requiredPermission="medicos">
              <Medicos />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/tipos-fornecedores" 
          element={
            <ProtectedRoute requiredPermission="tipos-fornecedores">
              <TiposFornecedores />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/fornecedores" 
          element={
            <ProtectedRoute requiredPermission="fornecedores">
              <Fornecedores />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/titulos" 
          element={
            <ProtectedRoute requiredPermission="titulos">
              <Titulos />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/extrato-titulos" 
          element={
            <ProtectedRoute requiredPermission="extrato-titulos">
              <EmissaoTitulos />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/emissao-titulos" 
          element={
            <ProtectedRoute requiredPermission="extrato-titulos">
              <EmissaoTitulos />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/custo-os" 
          element={
            <ProtectedRoute requiredPermission="custo-os">
              <CustoOS />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/relatorio-os" 
          element={
            <ProtectedRoute requiredPermission="relatorio-os">
              <RelatorioOS />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/filiais" 
          element={
            <ProtectedRoute requiredPermission="filiais">
              <Filiais />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/despesas-fixas" 
          element={
            <ProtectedRoute requiredPermission="despesas-fixas">
              <DespesasFixas />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/despesas-diversas" 
          element={
            <ProtectedRoute requiredPermission="despesas-diversas">
              <DespesasDiversas />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/extrato-despesas" 
          element={
            <ProtectedRoute requiredPermission="extrato-despesas">
              <ExtratoDespesas />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/categorias-despesas" 
          element={
            <ProtectedRoute requiredPermission="categorias-despesas">
              <CategoriasDespesas />
            </ProtectedRoute>
          } 
        />
        
        {/* Rota restrita para admins */}
        <Route 
          path="/gerenciar-usuarios" 
          element={
            <ProtectedRoute requiredRole="admin">
              <GerenciarUsuarios />
            </ProtectedRoute>
          } 
        />
        
        {/* Rota padrão - redireciona para dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default AppRoutes;
