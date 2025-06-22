import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, FormControl, InputLabel, Select,
  IconButton, Tooltip, Alert, Snackbar, InputAdornment
} from '@mui/material';
import {
  Add as AddIcon, Payment as PaymentIcon, Pending as PendingIcon, Edit as EditIcon, Delete as DeleteIcon,
  Clear as ClearIcon, Search as SearchIcon, PictureAsPdf as PictureAsPdfIcon
} from '@mui/icons-material';
import { despesasDiversasService, type DespesaDiversaCompleta } from '../services/despesasDiversasService';
import { filiaisService } from '../services/filiaisService';
import { despesasService } from '../services/despesasService';
import { RelatoriosPDFService } from '../services/relatoriosPDFService';
import { useAuth } from '../contexts/AuthContext';

interface Filial {
  id: number;
  nome: string;
}

interface CategoriaType {
  id: number;
  nome: string;
}

export default function DespesasDiversas() {
  const { hasPermission } = useAuth();
  
  // Verificar permissões do usuário
  const canCreate = hasPermission('despesas-diversas', 'criar');
  const canEdit = hasPermission('despesas-diversas', 'editar');
  const canDelete = hasPermission('despesas-diversas', 'excluir');

  const [despesas, setDespesas] = useState<DespesaDiversaCompleta[]>([]);
  const [despesasFiltradas, setDespesasFiltradas] = useState<DespesaDiversaCompleta[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [categorias, setCategorias] = useState<CategoriaType[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [payingDespesa, setPayingDespesa] = useState<DespesaDiversaCompleta | null>(null);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // Filtros
  const [filtros, setFiltros] = useState({
    status: 'todos',
    busca: ''
  });

  const [formData, setFormData] = useState({
    filial_id: '',
    categoria_id: '',
    nome: '',
    valor: '',
    data_despesa: new Date().toISOString().split('T')[0],
    observacao: ''
  });

  const [paymentData, setPaymentData] = useState({
    data_pagamento: new Date().toISOString().split('T')[0],
    forma_pagamento: ''
  });

  useEffect(() => {
    loadDespesas();
    loadFiliais();
    loadCategorias();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [despesas, filtros]);

  const loadDespesas = async () => {
    setLoading(true);
    try {
      const data = await despesasDiversasService.getAllCompletas();
      setDespesas(data);
    } catch (error) {
      console.error('Erro ao carregar despesas diversas:', error);
      showAlert('Erro ao carregar despesas diversas', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadFiliais = async () => {
    try {
      const data = await filiaisService.getAll();
      setFiliais(data);
    } catch (error) {
      console.error('Erro ao carregar filiais:', error);
    }
  };

  const loadCategorias = async () => {
    try {
      // Buscar apenas categorias para despesas diversas (variáveis)
      const data = await despesasService.getCategoriasDiversas();
      setCategorias(data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const aplicarFiltros = () => {
    let filtered = [...despesas];

    // Filtro por status
    if (filtros.status !== 'todos') {
      filtered = filtered.filter(d => d.status === filtros.status);
    }

    // Filtro por busca
    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      filtered = filtered.filter(d => 
        d.nome.toLowerCase().includes(busca) ||
        d.filial_nome.toLowerCase().includes(busca) ||
        (d.categoria_nome && d.categoria_nome.toLowerCase().includes(busca)) ||
        (d.observacao && d.observacao.toLowerCase().includes(busca))
      );
    }

    setDespesasFiltradas(filtered);
  };

  const showAlert = (message: string, severity: 'success' | 'error') => {
    setAlert({ show: true, message, severity });
  };

  const formatValor = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const handleOpenDialog = (despesa?: DespesaDiversaCompleta) => {
    // Verificar permissão antes de abrir o diálogo
    if (despesa && !canEdit) {
      showAlert('Você não tem permissão para editar despesas diversas.', 'error');
      return;
    }
    
    if (!despesa && !canCreate) {
      showAlert('Você não tem permissão para criar despesas diversas.', 'error');
      return;
    }

    if (despesa) {
      setEditingId(despesa.id);
      setFormData({
        filial_id: despesa.filial_id.toString(),
        categoria_id: despesa.categoria_id?.toString() || '',
        nome: despesa.nome,
        valor: despesa.valor.toString(),
        data_despesa: despesa.data_despesa,
        observacao: despesa.observacao || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        filial_id: '',
        categoria_id: '',
        nome: '',
        valor: '',
        data_despesa: new Date().toISOString().split('T')[0],
        observacao: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingId(null);
  };

  const handleOpenPaymentDialog = (despesa: DespesaDiversaCompleta) => {
    setPayingDespesa(despesa);
    setPaymentData({
      data_pagamento: new Date().toISOString().split('T')[0],
      forma_pagamento: ''
    });
    setOpenPaymentDialog(true);
  };

  const handleClosePaymentDialog = () => {
    setOpenPaymentDialog(false);
    setPayingDespesa(null);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.nome.trim()) {
        showAlert('Nome é obrigatório', 'error');
        return;
      }

      if (!formData.valor || parseFloat(formData.valor) <= 0) {
        showAlert('Valor deve ser maior que zero', 'error');
        return;
      }

      if (!formData.filial_id) {
        showAlert('Filial é obrigatória', 'error');
        return;
      }

      const despesaData = {
        filial_id: parseInt(formData.filial_id),
        categoria_id: formData.categoria_id ? parseInt(formData.categoria_id) : undefined,
        nome: formData.nome.trim(),
        valor: parseFloat(formData.valor),
        data_despesa: formData.data_despesa,
        observacao: formData.observacao.trim() || undefined,
        status: 'pendente' as const
      };

      if (editingId) {
        await despesasDiversasService.update(editingId, despesaData);
        showAlert('Despesa diversa atualizada com sucesso!', 'success');
      } else {
        await despesasDiversasService.create(despesaData);
        showAlert('Despesa diversa criada com sucesso!', 'success');
      }

      handleCloseDialog();
      loadDespesas();
    } catch (error) {
      console.error('Erro ao salvar despesa diversa:', error);
      showAlert('Erro ao salvar despesa diversa', 'error');
    }
  };

  const handlePayment = async () => {
    if (!payingDespesa) return;

    try {
      await despesasDiversasService.marcarComoPago(
        payingDespesa.id,
        paymentData.data_pagamento,
        paymentData.forma_pagamento || undefined
      );
      
      showAlert('Despesa marcada como paga!', 'success');
      handleClosePaymentDialog();
      loadDespesas();
    } catch (error) {
      console.error('Erro ao marcar como pago:', error);
      showAlert('Erro ao marcar como pago', 'error');
    }
  };

  const handleMarkAsPending = async (id: number) => {
    try {
      await despesasDiversasService.marcarComoPendente(id);
      showAlert('Despesa marcada como pendente!', 'success');
      loadDespesas();
    } catch (error) {
      console.error('Erro ao marcar como pendente:', error);
      showAlert('Erro ao marcar como pendente', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    // Verificar permissão antes de executar a ação
    if (!canDelete) {
      showAlert('Você não tem permissão para excluir despesas diversas.', 'error');
      return;
    }

    if (confirm('Tem certeza que deseja excluir esta despesa?')) {
      try {
        await despesasDiversasService.delete(id);
        showAlert('Despesa excluída com sucesso!', 'success');
        loadDespesas();
      } catch (error) {
        console.error('Erro ao excluir despesa:', error);
        showAlert('Erro ao excluir despesa', 'error');
      }
    }
  };

  const clearFilters = () => {
    setFiltros({
      status: 'todos',
      busca: ''
    });
  };

  const getTotalDespesas = () => {
    return despesasFiltradas.reduce((sum, d) => sum + d.valor, 0);
  };

  const getTotalPagas = () => {
    return despesasFiltradas.filter(d => d.status === 'pago').reduce((sum, d) => sum + d.valor, 0);
  };

  const getTotalPendentes = () => {
    return despesasFiltradas.filter(d => d.status === 'pendente').reduce((sum, d) => sum + d.valor, 0);
  };

  const handleGerarPDF = () => {
    try {
      const relatorioService = new RelatoriosPDFService();
      
      // Determinar período baseado nas despesas filtradas
      const datasOrdenadas = despesasFiltradas
        .map(d => d.data_despesa)
        .sort();
      
      const periodo = datasOrdenadas.length > 0 ? {
        inicio: datasOrdenadas[0],
        fim: datasOrdenadas[datasOrdenadas.length - 1]
      } : undefined;
      
      const doc = relatorioService.gerarRelatorioDespesasDiversas(despesasFiltradas, periodo);
      
      const nomeArquivo = `relatorio-despesas-diversas-${new Date().toISOString().slice(0, 10)}.pdf`;
      relatorioService.salvar(nomeArquivo);
      
      showAlert('Relatório PDF gerado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      showAlert('Erro ao gerar relatório PDF', 'error');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" color="primary">
          {(canCreate || canEdit) ? 'Cadastro de Despesas Diversas' : 'Consulta de Despesas Diversas'}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<PictureAsPdfIcon />}
            onClick={handleGerarPDF}
            disabled={despesasFiltradas.length === 0}
          >
            Gerar PDF
          </Button>
          
          {canCreate && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Nova Despesa
            </Button>
          )}
        </Box>
      </Box>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filtros
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filtros.status}
                onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
                label="Status"
              >
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="pendente">Pendentes</MenuItem>
                <MenuItem value="pago">Pagas</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Buscar"
              size="small"
              value={filtros.busca}
              onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={clearFilters}
              size="small"
            >
              Limpar
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Resumo */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total de Despesas
            </Typography>
            <Typography variant="h5">
              {formatValor(getTotalDespesas())}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total Pago
            </Typography>
            <Typography variant="h5" color="success.main">
              {formatValor(getTotalPagas())}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total Pendente
            </Typography>
            <Typography variant="h5" color="warning.main">
              {formatValor(getTotalPendentes())}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Quantidade
            </Typography>
            <Typography variant="h5">
              {despesasFiltradas.length}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell>Nome</TableCell>
                  <TableCell>Filial</TableCell>
                  <TableCell>Categoria</TableCell>
                  <TableCell>Valor</TableCell>
                  <TableCell>Data Despesa</TableCell>
                  <TableCell>Data Pagamento</TableCell>
                  <TableCell>Forma Pagamento</TableCell>
                  <TableCell>Observação</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : despesasFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      Nenhuma despesa encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  despesasFiltradas.map((despesa) => (
                    <TableRow key={despesa.id}>
                      <TableCell>
                        <Chip
                          label={despesa.status}
                          color={despesa.status === 'pago' ? 'success' : 'warning'}
                          size="small"
                          icon={despesa.status === 'pago' ? <PaymentIcon /> : <PendingIcon />}
                        />
                      </TableCell>
                      <TableCell>{despesa.nome}</TableCell>
                      <TableCell>{despesa.filial_nome}</TableCell>
                      <TableCell>{despesa.categoria_nome || 'Sem categoria'}</TableCell>
                      <TableCell>{formatValor(despesa.valor)}</TableCell>
                      <TableCell>{formatDate(despesa.data_despesa)}</TableCell>
                      <TableCell>
                        {despesa.data_pagamento ? formatDate(despesa.data_pagamento) : '-'}
                      </TableCell>
                      <TableCell>{despesa.forma_pagamento || '-'}</TableCell>
                      <TableCell>{despesa.observacao || '-'}</TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {canEdit && (
                            <Tooltip title="Editar">
                              <IconButton
                                onClick={() => handleOpenDialog(despesa)}
                                size="small"
                                color="primary"
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          {despesa.status === 'pendente' ? (
                            <Tooltip title="Marcar como Pago">
                              <IconButton
                                onClick={() => handleOpenPaymentDialog(despesa)}
                                size="small"
                                color="success"
                              >
                                <PaymentIcon />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Tooltip title="Marcar como Pendente">
                              <IconButton
                                onClick={() => handleMarkAsPending(despesa.id)}
                                size="small"
                                color="warning"
                              >
                                <PendingIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          {canDelete && (
                            <Tooltip title="Excluir">
                              <IconButton
                                onClick={() => handleDelete(despesa.id)}
                                size="small"
                                color="error"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Dialog - Nova/Editar Despesa */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingId ? 'Editar Despesa' : 'Nova Despesa'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Valor"
                type="number"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                fullWidth
                required
                InputProps={{
                  startAdornment: 'R$'
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>Filial</InputLabel>
                <Select
                  value={formData.filial_id}
                  onChange={(e) => setFormData({ ...formData, filial_id: e.target.value })}
                  label="Filial"
                >
                  {filiais.map((filial) => (
                    <MenuItem key={filial.id} value={filial.id.toString()}>
                      {filial.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Categoria</InputLabel>
                <Select
                  value={formData.categoria_id}
                  onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                  label="Categoria"
                >
                  <MenuItem value="">Sem categoria</MenuItem>
                  {categorias.map((categoria) => (
                    <MenuItem key={categoria.id} value={categoria.id.toString()}>
                      {categoria.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <TextField
              label="Data da Despesa"
              type="date"
              value={formData.data_despesa}
              onChange={(e) => setFormData({ ...formData, data_despesa: e.target.value })}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Observação"
              value={formData.observacao}
              onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingId ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog - Pagamento */}
      <Dialog open={openPaymentDialog} onClose={handleClosePaymentDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Marcar como Pago
        </DialogTitle>
        <DialogContent>
          {payingDespesa && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body1">
                <strong>Despesa:</strong> {payingDespesa.nome}
              </Typography>
              <Typography variant="body1">
                <strong>Valor:</strong> {formatValor(payingDespesa.valor)}
              </Typography>
            </Box>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Data do Pagamento"
              type="date"
              value={paymentData.data_pagamento}
              onChange={(e) => setPaymentData({ ...paymentData, data_pagamento: e.target.value })}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Forma de Pagamento"
              value={paymentData.forma_pagamento}
              onChange={(e) => setPaymentData({ ...paymentData, forma_pagamento: e.target.value })}
              fullWidth
              placeholder="Ex: Dinheiro, Cartão, PIX, etc."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePaymentDialog}>Cancelar</Button>
          <Button onClick={handlePayment} variant="contained" color="success">
            Marcar como Pago
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={alert.show}
        autoHideDuration={6000}
        onClose={() => setAlert({ ...alert, show: false })}
      >
        <Alert
          onClose={() => setAlert({ ...alert, show: false })}
          severity={alert.severity}
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 