import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemIcon, ListItemText, IconButton, Box } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
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
import { useNavigate } from 'react-router-dom';

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Filiais', icon: <StoreIcon />, path: '/filiais' },
  { text: 'Tipos de Fornecedores', icon: <CategoryIcon />, path: '/tipos-fornecedores' },
  { text: 'Fornecedores', icon: <BusinessIcon />, path: '/fornecedores' },
  { text: 'Títulos', icon: <ReceiptIcon />, path: '/titulos' },
  { text: 'Extrato de Títulos', icon: <AssignmentIcon />, path: '/extrato-titulos' },
  { text: 'Despesas Fixas', icon: <PaymentsIcon />, path: '/despesas-fixas' },
  { text: 'Despesas Diversas', icon: <PaymentsIcon />, path: '/despesas-diversas' },
  { text: 'Extrato Despesas', icon: <DescriptionIcon />, path: '/extrato-despesas' },
  { text: 'Custo de OS', icon: <MonetizationOnIcon />, path: '/custo-os' },
  { text: 'Relatório de OS', icon: <BarChartIcon />, path: '/relatorio-os' },
];

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleDrawerToggle = () => {
    setOpen(!open);
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
          <Typography variant="h6" noWrap component="div">
            CMV Ótica
          </Typography>
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
    </Box>
  );
};

export default Layout; 