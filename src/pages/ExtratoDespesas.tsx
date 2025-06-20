import React, { useState, useEffect } from 'react';
// Removemos as importações de jsPDF que estavam causando problemas
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  TextField, 
  Button, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Divider,
  Stack
} from '@mui/material';

import PrintIcon from '@mui/icons-material/Print';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PaymentIcon from '@mui/icons-material/Payment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { despesasService, categoriasDespesasService } from '../services/despesasService';
import type { Despesa, DespesaCompleta, CategoriaDespesa } from '../services/despesasService';
import { filiaisService } from '../services/filiaisService';
import { formatDateToBrazilian } from '../utils/dateUtils';

// Estilos CSS para impressão
const printStyles = `
  @media print {
    /* Ocultar elementos que não devem ser impressos */
    nav, header, footer, .MuiAppBar-root, .MuiDrawer-root, .no-print {
      display: none !important;
    }
    
    /* Garantir que o conteúdo do relatório ocupe toda a página */
    body, html {
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background-color: white !important;
    }
    
    /* Ajustar o conteúdo do relatório */
    .print-only {
      display: block !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    
    /* Remover sombras e bordas para economizar tinta */
    .MuiCard-root, .MuiPaper-root {
      box-shadow: none !important;
      border: 1px solid #ddd !important;
    }
    
    /* Ajustar o tamanho da fonte para impressão */
    body {
      font-size: 12pt !important;
    }
    
    /* Garantir que os totais sejam impressos corretamente */
    .totais {
      page-break-inside: avoid !important;
    }
  }
`;

const ExtratoDespesas: React.FC = () => {
  // Estados para filtros
  const [filtros, setFiltros] = useState({
    tipoDespesa: '',    // 'fixa', 'variavel' ou ''
    filial: '',         // ID da filial ou ''
    categoria: '',      // ID da categoria ou ''
    status: '',         // 'pendente', 'pago', 'ativo', 'inativo' ou ''
    dataInicial: '',
    dataFinal: ''
  });
  
  // Estados para dados
  const [despesas, setDespesas] = useState<DespesaCompleta[]>([]);
  const [filiais, setFiliais] = useState<{id: number, nome: string}[]>([]);
  const [categorias, setCategorias] = useState<CategoriaDespesa[]>([]);
  
  // Estado para carregamento
  const [carregando, setCarregando] = useState(false);
  
  // Estados para diálogos e ações
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDespesa, setSelectedDespesa] = useState<DespesaCompleta | null>(null);
  const [pagamentoDialogOpen, setPagamentoDialogOpen] = useState(false);
  
  // Efeito para carregar dados iniciais
  useEffect(() => {
    const carregarDadosIniciais = async () => {
      setCarregando(true);
      try {
        // Carregar filiais e categorias
        const [filiaisData, categoriasData] = await Promise.all([
          filiaisService.getAll(),
          categoriasDespesasService.getAll()
        ]);
        
        setFiliais(filiaisData);
        setCategorias(categoriasData);
        
        // Definir datas iniciais para o período atual (mês corrente)
        const hoje = new Date();
        const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        
        setFiltros({
          ...filtros,
          dataInicial: primeiroDiaMes.toISOString().slice(0, 10),
          dataFinal: ultimoDiaMes.toISOString().slice(0, 10)
        });
        
      } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error);
      } finally {
        setCarregando(false);
      }
    };
    
    carregarDadosIniciais();
  }, []);
  
  // Efeito para carregar despesas quando os filtros mudarem
  useEffect(() => {
    const buscarDespesas = async () => {
      if (!filtros.dataInicial || !filtros.dataFinal) return;
      
      setCarregando(true);
      try {
        // Buscar todas as despesas do período direto do Supabase
        let despesasFiltradas = await despesasService.getByPeriodoCompletas(
          filtros.dataInicial,
          filtros.dataFinal
        );
        
        // Aplicar filtros adicionais no front-end
        if (filtros.tipoDespesa) {
          despesasFiltradas = despesasFiltradas.filter(
            despesa => despesa.tipo_despesa === filtros.tipoDespesa
          );
        }
        
        if (filtros.filial) {
          despesasFiltradas = despesasFiltradas.filter(
            despesa => despesa.filial_id === parseInt(filtros.filial)
          );
        }
        
        if (filtros.categoria) {
          despesasFiltradas = despesasFiltradas.filter(
            despesa => despesa.categoria_id === parseInt(filtros.categoria)
          );
        }
        
        if (filtros.status) {
          despesasFiltradas = despesasFiltradas.filter(
            despesa => despesa.status === filtros.status
          );
        }
        
        console.log('Despesas filtradas:', despesasFiltradas);
        setDespesas(despesasFiltradas);
      } catch (error) {
        console.error("Erro ao buscar despesas:", error);
      } finally {
        setCarregando(false);
      }
    };
    
    buscarDespesas();
  }, [filtros]);
  
  // Função para atualizar filtros
  const handleFiltroChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | {target: {name: string, value: string}}) => {
    const { name, value } = e.target;
    setFiltros({
      ...filtros,
      [name]: value
    });
  };
  
  // Função para gerar e imprimir relatório em formato tabular
  const handleImprimir = () => {
    // Criar uma nova janela para o relatório
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('O navegador bloqueou a abertura da janela de impressão. Por favor, permita popups para este site.');
      return;
    }
    
    // Preparar os dados das despesas fixas e variáveis
    const despesasFixas = despesas.filter(d => d.tipo_despesa === 'fixa');
    const despesasVariaveis = despesas.filter(d => d.tipo_despesa === 'variavel');
    
    // Gerar HTML para o relatório
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório de Despesas</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
          }
          h1, h2 {
            text-align: center;
            margin-bottom: 10px;
          }
          h3 {
            margin-top: 20px;
            margin-bottom: 10px;
          }
          .periodo {
            text-align: center;
            margin-bottom: 20px;
            font-size: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            font-size: 12px;
          }
          th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .resumo {
            margin-top: 30px;
            border-top: 2px solid #333;
            padding-top: 10px;
          }
          .resumo-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          .total-geral {
            font-weight: bold;
            margin-top: 10px;
            padding-top: 5px;
            border-top: 1px solid #333;
          }
          .observacao {
            font-style: italic;
            font-size: 11px;
          }
          .valor {
            text-align: right;
          }
          .filtros {
            margin-bottom: 20px;
            font-size: 12px;
          }
          .print-button {
            display: block;
            margin: 20px auto;
            padding: 8px 16px;
            background-color: #4285f4;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          }
          @media print {
            .print-button {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <h1>Relatório de Despesas</h1>
        <div class="periodo">Período: ${formatDateToBrazilian(filtros.dataInicial)} a ${formatDateToBrazilian(filtros.dataFinal)}</div>
        
        <div class="filtros">
          <strong>Filtros Aplicados:</strong> 
          ${filtros.tipoDespesa ? `Tipo: ${filtros.tipoDespesa === 'fixa' ? 'Fixas' : 'Variáveis'}, ` : ''}
          ${filtros.filial ? `Filial: ${filiais.find(f => f.id === Number(filtros.filial))?.nome || filtros.filial}, ` : ''}
          ${filtros.categoria ? `Categoria: ${categorias.find(c => c.id === Number(filtros.categoria))?.nome || filtros.categoria}, ` : ''}
          ${filtros.status ? `Status: ${filtros.status}, ` : ''}
        </div>
        
        ${despesasFixas.length > 0 ? `
        <h3>Despesas Fixas</h3>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Filial</th>
              <th>Categoria</th>
              <th>Valor</th>
              <th>Vencimento</th>
              <th>Status</th>
              <th>Observações</th>
            </tr>
          </thead>
          <tbody>
            ${despesasFixas.map(d => `
              <tr>
                <td>${d.nome}</td>
                <td>${d.filial || 'Não especificado'}</td>
                <td>${d.categoria || 'Não categorizado'}</td>
                <td class="valor">R$ ${parseFloat(String(d.valor)).toFixed(2)}</td>
                <td>${d.data_vencimento ? formatDateToBrazilian(String(d.data_vencimento)) : (d.dia_vencimento ? `Dia ${d.dia_vencimento} de cada mês` : 'Não informado')}</td>
                <td>${d.status === 'pago' ? 'Pago' : (d.status === 'pendente' ? 'Pendente' : (d.status === 'ativo' ? 'Ativo' : 'Inativo'))}</td>
                <td>${d.observacao || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : ''}
        
        ${despesasVariaveis.length > 0 ? `
        <h3>Despesas Variáveis</h3>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Filial</th>
              <th>Categoria</th>
              <th>Valor</th>
              <th>Data</th>
              <th>Status</th>
              <th>Observações</th>
            </tr>
          </thead>
          <tbody>
            ${despesasVariaveis.map(d => `
              <tr>
                <td>${d.nome}</td>
                <td>${d.filial || 'Não especificado'}</td>
                <td>${d.categoria || 'Não categorizado'}</td>
                <td class="valor">R$ ${parseFloat(String(d.valor)).toFixed(2)}</td>
                <td>${formatDateToBrazilian(String(d.data_despesa))}</td>
                <td>${d.status === 'pago' ? 'Pago' : 'Pendente'}</td>
                <td>${d.observacao || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : ''}
        
        <div class="resumo">
          <h3>Resumo do Período</h3>
          <div class="resumo-item">
            <span>Total Despesas Fixas:</span>
            <span>R$ ${totalDespesasFixas.toFixed(2)}</span>
          </div>
          <div class="resumo-item">
            <span>Total Despesas Variáveis:</span>
            <span>R$ ${totalDespesasVariaveis.toFixed(2)}</span>
          </div>
          <div class="resumo-item total-geral">
            <span>Total Geral:</span>
            <span>R$ ${(totalDespesasFixas + totalDespesasVariaveis).toFixed(2)}</span>
          </div>
        </div>
        
        <button class="print-button" onclick="window.print()">Imprimir</button>
      </body>
      </html>
    `;
    
    // Escrever o HTML na nova janela
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Focar na nova janela
    printWindow.focus();
  };
  
  // Removemos a função de exportação de PDF que utilizava jsPDF
  
  // Funções para ações nas despesas
  const handlePagamento = (despesa: DespesaCompleta) => {
    setSelectedDespesa(despesa);
    setPagamentoDialogOpen(true);
  };
  
  const handleEditar = (despesa: DespesaCompleta) => {
    // Redirecionar para página de edição
    window.location.href = `/despesas?id=${despesa.id}`;
  };
  
  const handleDelete = (despesa: DespesaCompleta) => {
    setSelectedDespesa(despesa);
    setDeleteDialogOpen(true);
  };
  
  const confirmarDelete = async () => {
    if (!selectedDespesa) return;
    
    try {
      setCarregando(true);
      const sucesso = await despesasService.delete(selectedDespesa.id);
      
      if (sucesso) {
        // Remover a despesa da lista local
        setDespesas(prev => prev.filter(d => d.id !== selectedDespesa.id));
        setDeleteDialogOpen(false);
        setSelectedDespesa(null);
      } else {
        console.error('Erro ao excluir despesa');
      }
    } catch (error) {
      console.error('Erro ao excluir despesa:', error);
    } finally {
      setCarregando(false);
    }
  };
  
  const confirmarPagamento = async () => {
    if (!selectedDespesa) return;
    
    try {
      setCarregando(true);
      const dataPagamento = new Date().toISOString().slice(0, 10);
      const despesaAtualizada = await despesasService.marcarComoPago(selectedDespesa.id, dataPagamento);
      
      if (despesaAtualizada) {
        // Atualizar a despesa na lista local
        setDespesas(prev => prev.map(d => d.id === selectedDespesa.id ? {...d, status: 'pago', data_pagamento: dataPagamento} : d));
        setPagamentoDialogOpen(false);
        setSelectedDespesa(null);
      } else {
        console.error('Erro ao marcar despesa como paga');
      }
    } catch (error) {
      console.error('Erro ao marcar despesa como paga:', error);
    } finally {
      setCarregando(false);
    }
  };
  
  // Calcular totais para o relatório
  const totalDespesasFixas = despesas
    .filter(d => d.tipo_despesa === 'fixa')
    .reduce((sum, d) => sum + parseFloat(String(d.valor)), 0);
    
  const totalDespesasVariaveis = despesas
    .filter(d => d.tipo_despesa === 'variavel')
    .reduce((sum, d) => sum + parseFloat(String(d.valor)), 0);
    
  const totalGeral = totalDespesasFixas + totalDespesasVariaveis;

  return (
    <Box sx={{ maxWidth: '100%', margin: '0 auto', p: 2 }}>
      {/* Diálogo de confirmação para exclusão */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirmar exclusão</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja excluir a despesa <strong>{selectedDespesa?.nome}</strong>?
            Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
            Cancelar
          </Button>
          <Button onClick={confirmarDelete} color="error" variant="contained">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo de confirmação para pagamento */}
      <Dialog
        open={pagamentoDialogOpen}
        onClose={() => setPagamentoDialogOpen(false)}
      >
        <DialogTitle>Confirmar pagamento</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Confirmar pagamento da despesa <strong>{selectedDespesa?.nome}</strong> no valor de <strong>R$ {selectedDespesa ? parseFloat(String(selectedDespesa.valor)).toFixed(2) : '0.00'}</strong>?
            A data de pagamento será registrada como hoje.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPagamentoDialogOpen(false)} color="primary">
            Cancelar
          </Button>
          <Button onClick={confirmarPagamento} color="primary" variant="contained">
            Confirmar Pagamento
          </Button>
        </DialogActions>
      </Dialog>
      <Typography variant="h4" gutterBottom color="primary">
        Extrato de Despesas
      </Typography>
      
      <Card sx={{ mb: 3 }} className="no-print">
        <CardContent>
          <Typography variant="h6" gutterBottom>Filtros</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flex: '1 1 200px', minWidth: '150px' }}>
              <FormControl fullWidth>
                <InputLabel id="tipo-despesa-label">Tipo de Despesa</InputLabel>
                <Select
                  labelId="tipo-despesa-label"
                  name="tipoDespesa"
                  value={filtros.tipoDespesa}
                  label="Tipo de Despesa"
                  onChange={(e) => handleFiltroChange({target: {name: 'tipoDespesa', value: e.target.value as string}})}
                >
                  <MenuItem value="">Todas</MenuItem>
                  <MenuItem value="fixa">Fixas</MenuItem>
                  <MenuItem value="variavel">Variáveis</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ flex: '1 1 200px', minWidth: '150px' }}>
              <FormControl fullWidth>
                <InputLabel id="filial-label">Filial</InputLabel>
                <Select
                  labelId="filial-label"
                  name="filial"
                  value={filtros.filial}
                  label="Filial"
                  onChange={(e) => handleFiltroChange({target: {name: 'filial', value: e.target.value as string}})}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {filiais.map(filial => (
                    <MenuItem key={filial.id} value={filial.id}>{filial.nome}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ flex: '1 1 200px', minWidth: '150px' }}>
              <FormControl fullWidth>
                <InputLabel id="categoria-label">Categoria</InputLabel>
                <Select
                  labelId="categoria-label"
                  name="categoria"
                  value={filtros.categoria}
                  label="Categoria"
                  onChange={(e) => handleFiltroChange({target: {name: 'categoria', value: e.target.value as string}})}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {categorias.map(categoria => (
                    <MenuItem key={categoria.id} value={categoria.id}>{categoria.nome}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ flex: '1 1 200px', minWidth: '150px' }}>
              <FormControl fullWidth>
                <InputLabel id="status-label">Status</InputLabel>
                <Select
                  labelId="status-label"
                  name="status"
                  value={filtros.status}
                  label="Status"
                  onChange={(e) => handleFiltroChange({target: {name: 'status', value: e.target.value as string}})}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="pendente">Pendente</MenuItem>
                  <MenuItem value="pago">Pago</MenuItem>
                  <MenuItem value="ativo">Ativo</MenuItem>
                  <MenuItem value="inativo">Inativo</MenuItem>
                </Select>
              </FormControl>
            </Box>
            
            <Box sx={{ flex: '1 1 200px', minWidth: '150px' }}>
              <TextField 
                label="Data Inicial" 
                type="date" 
                name="dataInicial"
                value={filtros.dataInicial} 
                onChange={handleFiltroChange}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Box>
            
            <Box sx={{ flex: '1 1 200px', minWidth: '150px' }}>
              <TextField 
                label="Data Final" 
                type="date" 
                name="dataFinal"
                value={filtros.dataFinal} 
                onChange={handleFiltroChange}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Box>
            
            <Box sx={{ flex: '1 1 200px', display: 'flex', alignItems: 'center' }}>
              <Button 
                variant="contained" 
                color="primary"
                startIcon={<PrintIcon />} 
                onClick={handleImprimir}
              >
                Gerar Relatório
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
      
      <Card className="print-only">
        <CardContent>
          <Box className="no-print">
            <Typography variant="h6" gutterBottom>Despesas do Período</Typography>
          </Box>
          
          <Box className="print-only" sx={{ mb: 3 }}>
            <Typography variant="h5" align="center" gutterBottom>Relatório de Despesas</Typography>
            <Typography variant="body1" align="center" gutterBottom>
              Período: {filtros.dataInicial ? formatDateToBrazilian(filtros.dataInicial) : ''} a {filtros.dataFinal ? formatDateToBrazilian(filtros.dataFinal) : ''}
            </Typography>
          </Box>
          
          {carregando ? (
            <Box display="flex" justifyContent="center" my={3}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {despesas.length === 0 ? (
                <Typography color="textSecondary" align="center">
                  Nenhuma despesa encontrada para o período selecionado.
                </Typography>
              ) : (
                <>
                  <Typography variant="subtitle1" sx={{ mt: 2, fontWeight: 'bold' }}>
                    Despesas Fixas
                  </Typography>
                  <List>
                    {despesas
                      .filter(d => d.tipo_despesa === 'fixa')
                      .map(despesa => (
                        <ListItem key={despesa.id} divider>
                          <ListItemText
                            primary={`${despesa.nome} - ${despesa.filial || 'Não especificado'}`}
                            secondary={
                              <>
                                <div>{`Categoria: ${despesa.categoria || 'Não categorizado'} | Valor: R$ ${parseFloat(String(despesa.valor)).toFixed(2)} | Vencimento: ${despesa.data_vencimento ? formatDateToBrazilian(String(despesa.data_vencimento)) : (despesa.dia_vencimento ? `Dia ${despesa.dia_vencimento} de cada mês` : 'Não informado')}`}</div>
                                {despesa.observacao && <div><strong>Obs:</strong> {despesa.observacao}</div>}
                              </>
                            }
                          />
                          <ListItemSecondaryAction>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Tooltip title={despesa.status === 'pago' || despesa.status === 'inativo' ? 'Já pago/inativo' : 'Marcar como pago'}>
                                <span>
                                  <IconButton 
                                    edge="end" 
                                    color={despesa.status === 'pago' ? 'success' : 'default'}
                                    onClick={() => handlePagamento(despesa)}
                                    disabled={despesa.status === 'pago' || despesa.status === 'inativo'}
                                  >
                                    {despesa.status === 'pago' ? <CheckCircleIcon /> : <PaymentIcon />}
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title="Editar">
                                <IconButton edge="end" color="primary" onClick={() => handleEditar(despesa)}>
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Excluir">
                                <IconButton edge="end" color="error" onClick={() => handleDelete(despesa)}>
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                  </List>
                  
                  <Typography variant="subtitle1" sx={{ mt: 3, fontWeight: 'bold' }}>
                    Despesas Variáveis
                  </Typography>
                  <List>
                    {despesas
                      .filter(d => d.tipo_despesa === 'variavel')
                      .map(despesa => (
                        <ListItem key={despesa.id} divider>
                          <ListItemText
                            primary={`${despesa.nome} - ${despesa.filial || 'Não especificado'}`}
                            secondary={
                              <>
                                <div>{`Categoria: ${despesa.categoria || 'Não categorizado'} | Valor: R$ ${parseFloat(String(despesa.valor)).toFixed(2)} | Data: ${formatDateToBrazilian(String(despesa.data_despesa))}`}</div>
                                {despesa.observacao && <div><strong>Obs:</strong> {despesa.observacao}</div>}
                              </>
                            }
                          />
                          <ListItemSecondaryAction>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Tooltip title={despesa.status === 'pago' ? 'Já pago' : 'Marcar como pago'}>
                                <span>
                                  <IconButton 
                                    edge="end" 
                                    color={despesa.status === 'pago' ? 'success' : 'default'}
                                    onClick={() => handlePagamento(despesa)}
                                    disabled={despesa.status === 'pago'}
                                  >
                                    {despesa.status === 'pago' ? <CheckCircleIcon /> : <PaymentIcon />}
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title="Editar">
                                <IconButton edge="end" color="primary" onClick={() => handleEditar(despesa)}>
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Excluir">
                                <IconButton edge="end" color="error" onClick={() => handleDelete(despesa)}>
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                  </List>
                  
                  <Divider sx={{ my: 3 }} />
                  
                  <Box className="totais" sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      Resumo do Período
                    </Typography>
                    <Stack spacing={1} sx={{ mt: 1 }}>
                      <Box display="flex" justifyContent="space-between">
                        <Typography>Total Despesas Fixas:</Typography>
                        <Typography fontWeight="bold">R$ {totalDespesasFixas.toFixed(2)}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography>Total Despesas Variáveis:</Typography>
                        <Typography fontWeight="bold">R$ {totalDespesasVariaveis.toFixed(2)}</Typography>
                      </Box>
                      <Divider />
                      <Box display="flex" justifyContent="space-between">
                        <Typography fontWeight="bold">Total Geral:</Typography>
                        <Typography fontWeight="bold">R$ {totalGeral.toFixed(2)}</Typography>
                      </Box>
                    </Stack>
                  </Box>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ExtratoDespesas;
