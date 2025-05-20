import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, CircularProgress } from '@mui/material';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { osService, titulosService } from '../services';

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    totalVendas: 0,
    osAbertas: 0,
    titulosVencer: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Buscar OSs abertas
        const osAbertas = await osService.getOSAbertas();
        
        // Buscar títulos pendentes
        const titulosPendentes = await titulosService.getTitulosPendentes();
        
        // Calcular total de vendas (soma dos valores das OSs concluídas)
        const todasOS = await osService.getAll();
        const totalVendas = todasOS
          .filter(os => os.status === 'concluida' || os.status === 'entregue')
          .reduce((total, os) => total + os.valor_total, 0);
        
        setDashboardData({
          totalVendas,
          osAbertas: osAbertas.length,
          titulosVencer: titulosPendentes.length
        });
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  const cards = [
    {
      title: 'Total de Vendas',
      value: `R$ ${dashboardData.totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: <MonetizationOnIcon fontSize="large" color="primary" />,
      color: '#e3f2fd',
    },
    {
      title: 'OS Abertas',
      value: dashboardData.osAbertas.toString(),
      icon: <AssignmentIcon fontSize="large" color="primary" />,
      color: '#f3e5f5',
    },
    {
      title: 'Títulos a Vencer',
      value: dashboardData.titulosVencer.toString(),
      icon: <ReceiptIcon fontSize="large" color="primary" />,
      color: '#e8f5e9',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom color="primary">
        Dashboard
      </Typography>
      
      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {cards.map((card) => (
            <Box key={card.title} sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 30%' } }}>
              <Card sx={{ backgroundColor: card.color }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {card.icon}
                    <Box>
                      <Typography variant="subtitle1" color="textSecondary">
                        {card.title}
                      </Typography>
                      <Typography variant="h5" color="primary">
                        {card.value}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default Dashboard;