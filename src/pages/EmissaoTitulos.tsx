import React, { useState, useEffect } from 'react';
import { formatDateToBrazilian } from '../utils/dateUtils';
import { Box, Typography, Card, CardContent, Grid, TextField, Button, IconButton, List, ListItem, ListItemText, ListItemSecondaryAction, MenuItem, Stack, CircularProgress, Snackbar, Alert } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PaymentIcon from '@mui/icons-material/Payment';
import PrintIcon from '@mui/icons-material/Print';
import { filiaisService } from '../services/filiaisService';
import { fornecedoresService } from '../services/fornecedoresService';
import { tiposFornecedoresService } from '../services/tiposFornecedoresService';
import { titulosService } from '../services/titulosService';

interface Titulo {
  id: number;
  tipo: string;
  fornecedor: string;
  filial: string;
  vencimento: string;
  pagamento: string;
  valor: string;
  status: string;
  numero?: string;
  data_emissao?: string;
  observacao?: string;
}

interface TituloCompleto extends Titulo {
  fornecedor_id?: number;
  filial_id?: number;
  tipo_id?: number;
  data_pagamento?: string;
}

const EmissaoTitulos: React.FC = () => {
  const [titulos, setTitulos] = useState<TituloCompleto[]>([]);
  const [titulosFiltrados, setTitulosFiltrados] = useState<TituloCompleto[]>([]);
  const [filtros, setFiltros] = useState({ tipo: '', fornecedor: '', filial: '', vencimento: '', pagamento: '', dataInicial: '', dataFinal: '' });
  const [tipos, setTipos] = useState<{ id: number, nome: string }[]>([]);
  const [fornecedores, setFornecedores] = useState<{ id: number, nome: string }[]>([]);
  const [filiais, setFiliais] = useState<{ id: number, nome: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'info' });
  

  // Carregar dados iniciais
  useEffect(() => {
    const carregarDados = async () => {
      setIsLoading(true);
      try {
        // Carregar dados dos dropdowns e títulos
        const [dadosTipos, dadosFornecedores, dadosFiliais, dadosTitulos] = await Promise.all([
          tiposFornecedoresService.getAll(),
          fornecedoresService.getAll(),
          filiaisService.getAll(),
          titulosService.getAll()
        ]);

        // Mapear tipos para o formato {id, nome}
        const tiposFormatados = dadosTipos.map(t => ({
          id: t.id,
          nome: t.nome
        }));
        setTipos(tiposFormatados);

        // Mapear fornecedores para o formato {id, nome}
        const fornecedoresFormatados = dadosFornecedores.map(f => ({
          id: f.id,
          nome: f.nome
        }));
        setFornecedores(fornecedoresFormatados);

        // Mapear filiais para o formato {id, nome}
        const filiaisFormatadas = dadosFiliais.map(f => ({
          id: f.id,
          nome: f.nome
        }));
        setFiliais(filiaisFormatadas);

        // Processar os títulos
        const titulosFormatados = dadosTitulos.map(titulo => {
          const fornecedor = fornecedoresFormatados.find(f => f.id === titulo.fornecedor_id);
          const filial = filiaisFormatadas.find(f => f.id === titulo.filial_id);
          const tipo = tiposFormatados.find(t => t.id === titulo.tipo_id);

          return {
            id: titulo.id,
            numero: titulo.numero,
            tipo: tipo?.nome || 'Não especificado',
            tipo_id: titulo.tipo_id,
            fornecedor: fornecedor?.nome || 'Não especificado',
            fornecedor_id: titulo.fornecedor_id,
            filial: filial?.nome || 'Não especificada',
            filial_id: titulo.filial_id,
            vencimento: titulo.data_vencimento,
            data_emissao: titulo.data_emissao,
            pagamento: titulo.data_pagamento || '',
            data_pagamento: titulo.data_pagamento,
            valor: titulo.valor.toString(),
            status: titulo.status,
            observacao: titulo.observacao || ''
          };
        });

        setTitulos(titulosFormatados);
        setTitulosFiltrados(titulosFormatados);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setAlert({
          open: true,
          message: 'Erro ao carregar dados. Tente novamente.',
          severity: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    };

    carregarDados();
  }, []);

  const handleFiltroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novosFiltros = { ...filtros, [e.target.name]: e.target.value };
    setFiltros(novosFiltros);
    aplicarFiltros(novosFiltros);
  };

  const aplicarFiltros = (filtrosAtuais = filtros) => {
    let resultado = [...titulos];
    
    // Filtrar por tipo
    if (filtrosAtuais.tipo) {
      resultado = resultado.filter(titulo => titulo.tipo === filtrosAtuais.tipo);
    }
    
    // Filtrar por fornecedor
    if (filtrosAtuais.fornecedor) {
      resultado = resultado.filter(titulo => titulo.fornecedor === filtrosAtuais.fornecedor);
    }
    
    // Filtrar por filial
    if (filtrosAtuais.filial) {
      resultado = resultado.filter(titulo => titulo.filial === filtrosAtuais.filial);
    }
    
    // Filtrar por data de vencimento
    if (filtrosAtuais.vencimento) {
      resultado = resultado.filter(titulo => titulo.vencimento === filtrosAtuais.vencimento);
    }
    
    // Filtrar por data de pagamento
    if (filtrosAtuais.pagamento) {
      resultado = resultado.filter(titulo => titulo.pagamento === filtrosAtuais.pagamento);
    }
    
    // Filtrar por período (data inicial e final)
    if (filtrosAtuais.dataInicial && filtrosAtuais.dataFinal) {
      resultado = resultado.filter(titulo => {
        const dataVencimento = new Date(titulo.vencimento);
        const dataInicial = new Date(filtrosAtuais.dataInicial);
        const dataFinal = new Date(filtrosAtuais.dataFinal);
        return dataVencimento >= dataInicial && dataVencimento <= dataFinal;
      });
    } else if (filtrosAtuais.dataInicial) {
      resultado = resultado.filter(titulo => {
        const dataVencimento = new Date(titulo.vencimento);
        const dataInicial = new Date(filtrosAtuais.dataInicial);
        return dataVencimento >= dataInicial;
      });
    } else if (filtrosAtuais.dataFinal) {
      resultado = resultado.filter(titulo => {
        const dataVencimento = new Date(titulo.vencimento);
        const dataFinal = new Date(filtrosAtuais.dataFinal);
        return dataVencimento <= dataFinal;
      });
    }
    
    setTitulosFiltrados(resultado);
  };

  // Funções para ações
  const handlePagar = async (id: number) => {
    try {
      setIsLoading(true);
      const dataPagamento = new Date().toISOString();
      // Atualizando apenas o status para 'pago', já que data_pagamento não existe na interface Titulo
      const resultado = await titulosService.update(id, {
        status: 'pago'
      });
      
      if (resultado) {
        // Atualizar o estado local
        // Atualizar o estado local com a nova data de pagamento
        const dataFormatada = dataPagamento.slice(0, 10);
        setTitulos(titulos.map(t => t.id === id ? { 
          ...t, 
          status: 'pago', 
          pagamento: dataFormatada,
          data_pagamento: dataPagamento
        } : t));
        
        setTitulosFiltrados(titulosFiltrados.map(t => t.id === id ? { 
          ...t, 
          status: 'pago', 
          pagamento: dataFormatada,
          data_pagamento: dataPagamento
        } : t));
        
        setAlert({
          open: true,
          message: 'Título pago com sucesso!',
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Erro ao pagar título:', error);
      setAlert({
        open: true,
        message: 'Erro ao pagar título. Tente novamente.',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEdit = (id: number) => { 
    // Implementação futura
  };
  
  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este título?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      const sucesso = await titulosService.delete(id);
      
      if (sucesso) {
        setTitulos(titulos.filter(t => t.id !== id));
        setTitulosFiltrados(titulosFiltrados.filter(t => t.id !== id));
        
        setAlert({
          open: true,
          message: 'Título excluído com sucesso!',
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Erro ao excluir título:', error);
      setAlert({
        open: true,
        message: 'Erro ao excluir título. Tente novamente.',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRelatorio = () => {
    // Abrir uma nova janela para o relatório
    const janelaRelatorio = window.open('', '_blank', 'width=800,height=600');
    if (!janelaRelatorio) {
      setAlert({
        open: true,
        message: 'Por favor, permita pop-ups para imprimir o relatório.',
        severity: 'warning'
      });
      return;
    }
    
    // Escrever o conteúdo do relatório na nova janela
    janelaRelatorio.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório de Títulos</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1, h2 { text-align: center; color: #333; }
          .data { text-align: center; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .total-row td { font-weight: bold; background-color: #f9f9f9; }
          .resumo { margin-top: 30px; }
          .filtros { margin-bottom: 20px; }
          .filtro-item { display: inline-block; margin-right: 15px; margin-bottom: 5px; }
          @media print {
            button { display: none; }
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <h1>Relatório de Títulos</h1>
        <div class="data">Data de emissão: ${formatDateToBrazilian(new Date().toISOString())}</div>
        
        <div class="filtros">
          <h2>Filtros Aplicados</h2>
          ${filtros.tipo ? `<div class="filtro-item">Tipo: ${filtros.tipo}</div>` : ''}
          ${filtros.fornecedor ? `<div class="filtro-item">Fornecedor: ${filtros.fornecedor}</div>` : ''}
          ${filtros.filial ? `<div class="filtro-item">Filial: ${filtros.filial}</div>` : ''}
          ${filtros.vencimento ? `<div class="filtro-item">Vencimento: ${filtros.vencimento}</div>` : ''}
          ${filtros.pagamento ? `<div class="filtro-item">Pagamento: ${filtros.pagamento}</div>` : ''}
          ${filtros.dataInicial ? `<div class="filtro-item">Data Inicial: ${filtros.dataInicial}</div>` : ''}
          ${filtros.dataFinal ? `<div class="filtro-item">Data Final: ${filtros.dataFinal}</div>` : ''}
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Número</th>
              <th>Tipo</th>
              <th>Fornecedor</th>
              <th>Filial</th>
              <th>Emissão</th>
              <th>Vencimento</th>
              <th>Pagamento</th>
              <th style="text-align: right">Valor (R$)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${titulosFiltrados.map(titulo => `
              <tr>
                <td>${titulo.numero || '-'}</td>
                <td>${titulo.tipo}</td>
                <td>${titulo.fornecedor}</td>
                <td>${titulo.filial}</td>
                <td>${titulo.data_emissao ? formatDateToBrazilian(titulo.data_emissao) : '-'}</td>
                <td>${titulo.vencimento ? formatDateToBrazilian(titulo.vencimento) : '-'}</td>
                <td>${titulo.pagamento ? formatDateToBrazilian(titulo.pagamento) : '-'}</td>
                <td style="text-align: right">${parseFloat(titulo.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td>${titulo.status === 'pago' ? 'Pago' : titulo.status === 'pendente' ? 'Pendente' : titulo.status}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="7" style="text-align: right">Total:</td>
              <td style="text-align: right">
                ${titulosFiltrados
                  .reduce((acc, titulo) => acc + parseFloat(titulo.valor), 0)
                  .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
        
        <div class="resumo">
          <h2>Resumo</h2>
          <div>Total de títulos: ${titulosFiltrados.length}</div>
          <div>
            Títulos pagos: ${titulosFiltrados.filter(t => t.status === 'pago').length} 
            (R$ ${titulosFiltrados
              .filter(t => t.status === 'pago')
              .reduce((acc, titulo) => acc + parseFloat(titulo.valor), 0)
              .toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
          </div>
          <div>
            Títulos pendentes: ${titulosFiltrados.filter(t => t.status === 'pendente').length}
            (R$ ${titulosFiltrados
              .filter(t => t.status === 'pendente')
              .reduce((acc, titulo) => acc + parseFloat(titulo.valor), 0)
              .toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <button onclick="window.print()">Imprimir</button>
        </div>
      </body>
      </html>
    `);
    
    // Fechar o documento para finalizar o carregamento
    janelaRelatorio.document.close();
  };
  
  const handleCloseAlert = () => {
    setAlert({ ...alert, open: false });
  };

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Loading Overlay */}
      {isLoading && (
        <Box sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <CircularProgress color="primary" size={60} />
        </Box>
      )}
      
      {/* Snackbar para feedback */}
      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: '100%' }}>
          {alert.message}
        </Alert>
      </Snackbar>
      <Typography variant="h4" gutterBottom color="primary">
        Emissão de Títulos
      </Typography>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Filtros</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={2}>
              <TextField select label="Tipo" name="tipo" value={filtros.tipo} onChange={handleFiltroChange} fullWidth>
                <MenuItem value="">Todos</MenuItem>
                {tipos.length === 0 ? (
                  <MenuItem disabled>Carregando tipos...</MenuItem>
                ) : (
                  tipos.map(tipo => <MenuItem key={tipo.id} value={tipo.nome}>{tipo.nome}</MenuItem>)
                )}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField select label="Fornecedor" name="fornecedor" value={filtros.fornecedor} onChange={handleFiltroChange} fullWidth>
                <MenuItem value="">Todos</MenuItem>
                {fornecedores.length === 0 ? (
                  <MenuItem disabled>Carregando fornecedores...</MenuItem>
                ) : (
                  fornecedores.map(fornecedor => <MenuItem key={fornecedor.id} value={fornecedor.nome}>{fornecedor.nome}</MenuItem>)
                )}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField select label="Filial" name="filial" value={filtros.filial} onChange={handleFiltroChange} fullWidth>
                <MenuItem value="">Todas</MenuItem>
                {filiais.length === 0 ? (
                  <MenuItem disabled>Carregando filiais...</MenuItem>
                ) : (
                  filiais.map(filial => <MenuItem key={filial.id} value={filial.nome}>{filial.nome}</MenuItem>)
                )}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField label="Dt. Vencimento" name="vencimento" type="date" value={filtros.vencimento} onChange={handleFiltroChange} InputLabelProps={{ shrink: true }} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField label="Dt. Pagamento" name="pagamento" type="date" value={filtros.pagamento} onChange={handleFiltroChange} InputLabelProps={{ shrink: true }} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Stack direction="row" spacing={1}>
                <TextField label="Data Inicial" name="dataInicial" type="date" value={filtros.dataInicial} onChange={handleFiltroChange} InputLabelProps={{ shrink: true }} fullWidth />
                <TextField label="Data Final" name="dataFinal" type="date" value={filtros.dataFinal} onChange={handleFiltroChange} InputLabelProps={{ shrink: true }} fullWidth />
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Títulos Emitidos</Typography>
            <Button variant="outlined" startIcon={<PrintIcon />} onClick={handleRelatorio}>Relatório</Button>
          </Box>
          <List>
            {titulosFiltrados.length === 0 && (
              <Typography color="textSecondary">Nenhum título encontrado.</Typography>
            )}
            {titulosFiltrados.map(titulo => (
              <ListItem key={titulo.id} divider>
                <ListItemText
                  primary={`${titulo.numero || ''} | ${titulo.tipo} | ${titulo.fornecedor} | ${titulo.filial}`}
                  secondary={`Vencimento: ${titulo.vencimento} | Valor: R$ ${parseFloat(titulo.valor).toFixed(2)} | Status: ${titulo.status || 'Em aberto'} | Pagamento: ${titulo.pagamento || '-'}`}
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" aria-label="pagar" onClick={() => handlePagar(titulo.id)} disabled={titulo.status === 'pago'}>
                    <PaymentIcon />
                  </IconButton>
                  <IconButton edge="end" aria-label="edit" onClick={() => handleEdit(titulo.id)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(titulo.id)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};



export default EmissaoTitulos;
