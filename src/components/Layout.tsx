import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemIcon, ListItemText, IconButton, Box, Button } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CategoryIcon from '@mui/icons-material/Category';
import BusinessIcon from '@mui/icons-material/Business';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AssignmentIcon from '@mui/icons-material/Assignment';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import BarChartIcon from '@mui/icons-material/BarChart';
import StoreIcon from '@mui/icons-material/Store';
import PaymentsIcon from '@mui/icons-material/Payments';
import DescriptionIcon from '@mui/icons-material/Description';
import LabelIcon from '@mui/icons-material/Label';
import PeopleIcon from '@mui/icons-material/People';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import TrocarSenhaModal from './TrocarSenhaModal';

const drawerWidth = 240;

const getMenuItems = (isAdmin: boolean, usuario: any, hasPermission: any) => {
  const allItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/', rota: 'dashboard' },
    { text: 'Filiais', icon: <StoreIcon />, path: '/filiais', rota: 'filiais' },
    { text: 'Médicos', icon: <LocalHospitalIcon />, path: '/medicos', rota: 'medicos' },
    { text: 'Tipos de Fornecedores', icon: <CategoryIcon />, path: '/tipos-fornecedores', rota: 'tipos-fornecedores' },
    { text: 'Fornecedores', icon: <BusinessIcon />, path: '/fornecedores', rota: 'fornecedores' },
    { text: 'Títulos', icon: <ReceiptIcon />, path: '/titulos', rota: 'titulos' },
    { text: 'Extrato de Títulos', icon: <AssignmentIcon />, path: '/extrato-titulos', rota: 'extrato-titulos' },
    { text: 'Categorias de Despesas', icon: <LabelIcon />, path: '/categorias-despesas', rota: 'categorias-despesas' },
    { text: 'Despesas Fixas', icon: <PaymentsIcon />, path: '/despesas-fixas', rota: 'despesas-fixas' },
    { text: 'Despesas Diversas', icon: <PaymentsIcon />, path: '/despesas-diversas', rota: 'despesas-diversas' },
    { text: 'Extrato Despesas', icon: <DescriptionIcon />, path: '/extrato-despesas', rota: 'extrato-despesas' },
    { text: 'Custo de OS', icon: <MonetizationOnIcon />, path: '/custo-os', rota: 'custo-os' },
    { text: 'Relatório de OS', icon: <BarChartIcon />, path: '/relatorio-os', rota: 'relatorio-os' },
  ];

  // Filtrar itens baseado nas permissões
  const visibleItems = allItems.filter(item => {
    // Dashboard sempre visível
    if (item.rota === 'dashboard') return true;
    
    // Verificar permissão de visualização
    const temPermissao = hasPermission(item.rota, 'ver');
    console.log(`🔍 Menu ${item.text} (${item.rota}): ${temPermissao ? '✅' : '❌'}`);
    return temPermissao;
  });

  // Adicionar item de administração apenas para admins REAIS
  if (isAdmin && usuario?.is_admin) {
    visibleItems.push({ text: 'Gerenciar Usuários', icon: <PeopleIcon />, path: '/gerenciar-usuarios', rota: 'gerenciar-usuarios' });
  }

  return visibleItems;
};

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user, signOut, isAdmin, temSenhaTemporaria, hasPermission } = useAuth();
  
  const menuItems = getMenuItems(isAdmin, user, hasPermission);

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }} color="primary">
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            CMV Ótica
          </Typography>
          
          {/* Informações do usuário e logout */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon />
            <Typography variant="body2" sx={{ mr: 2 }}>
              {user?.email}
            </Typography>
            <Button
              color="inherit"
              onClick={handleLogout}
              startIcon={<LogoutIcon />}
              sx={{ 
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Sair
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', backgroundColor: '#0D1B2A', color: '#FFF' },
          display: { xs: 'none', sm: 'block' },
        }}
        open
      >
        <Toolbar />
        <List>
          {menuItems.map((item) => (
            <ListItem 
              key={item.text}
              onClick={() => navigate(item.path)}
              sx={{ 
                cursor: 'pointer',
                '&:hover': { 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
                '&.MuiListItem-root': {
                  padding: '8px 16px',
                }
              }}
            >
              <ListItemIcon sx={{ color: '#FFF', minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </List>
      </Drawer>
      {/* Drawer para mobile */}
      <Drawer
        variant="temporary"
        open={open}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', backgroundColor: '#0D1B2A', color: '#FFF' },
        }}
      >
        <Toolbar />
        <List>
          {menuItems.map((item) => (
            <ListItem 
              key={item.text}
              onClick={() => { 
                navigate(item.path); 
                setOpen(false); 
              }}
              sx={{ 
                cursor: 'pointer',
                '&:hover': { 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
                '&.MuiListItem-root': {
                  padding: '8px 16px',
                }
              }}
            >
              <ListItemIcon sx={{ color: '#FFF', minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, backgroundColor: '#FFF', minHeight: '100vh' }}>
        <Toolbar />
        {children}
      </Box>
      
      {/* Modal para troca de senha temporária */}
      <TrocarSenhaModal open={temSenhaTemporaria} />
    </Box>
  );
};

export default Layout;