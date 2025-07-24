import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, FormControl, InputLabel, Select,
  IconButton, Tooltip, Alert, Snackbar, Switch, FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon, CheckCircle as CheckCircleIcon, Block as BlockIcon, Edit as EditIcon, Delete as DeleteIcon,
  CalendarToday as CalendarIcon, Refresh as RefreshIcon, PictureAsPdf as PictureAsPdfIcon
} from '@mui/icons-material';
import { despesasFixasService, type DespesaFixaCompleta } from '../services/despesasFixasService';
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

export default function DespesasFixas() {
  const { hasPermission } = useAuth();
  const [despesas, setDespesas] = useState<DespesaFixaCompleta[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [categorias, setCategorias] = useState<CategoriaType[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showInactivas, setShowInactivas] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'success' as 'success' | 'error' });

  const [formData, setFormData] = useState({
    filial_id: '',
    categoria_id: '',
    nome: '',
    valor: '',
    periodicidade: 'mensal' as 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual',
    dia_vencimento: '',
    observacao: ''
  });

  useEffect(() => {
    loadDespesas();
    loadFiliais();
    loadCategorias();
  }, []);

  const loadDespesas = async () => {
    setLoading(true);
    try {
      const data = await despesasFixasService.getAllCompletas();
      setDespesas(data);
    } catch (error) {
      console.error('Erro ao carregar despesas fixas:', error);
      showAlert('Erro ao carregar despesas fixas', 'error');
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
      // Buscar apenas categorias para despesas fixas
      const data = await despesasService.getCategoriasFixas();
      setCategorias(data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const showAlert = (message: string, severity: 'success' | 'error') => {
    setAlert({ show: true, message, severity });
  };

  const formatValor = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getPeriodicidadeLabel = (periodicidade: string) => {
    const labels = {
      mensal: 'Mensal',
      bimestral: 'Bimestral',
      trimestral: 'Trimestral',
      semestral: 'Semestral',
      anual: 'Anual'
    };
    return labels[periodicidade as keyof typeof labels] || periodicidade;
  };

  const arredondarDuasCasas = (valor: string | number) => {
    const num = typeof valor === 'string' ? parseFloat(valor.replace(',', '.')) : valor;
    if (isNaN(num)) return '';
    return (Math.round(num * 100) / 100).toFixed(2);
  };

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let valor = e.target.value.replace(',', '.');
    if (/^\d*(\.\d{0,2})?$/.test(valor)) setFormData({ ...formData, valor });
  };

  const handleOpenDialog = (despesa?: DespesaFixaCompleta) => {
    if (despesa) {
      setEditingId(despesa.id);
      setFormData({
        filial_id: despesa.filial_id.toString(),
        categoria_id: despesa.categoria_id?.toString() || '',
        nome: despesa.nome,
        valor: despesa.valor.toString(),
        periodicidade: despesa.periodicidade,
        dia_vencimento: despesa.dia_vencimento.toString(),
        observacao: despesa.observacao || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        filial_id: '',
        categoria_id: '',
        nome: '',
        valor: '',
        periodicidade: 'mensal',
        dia_vencimento: '',
        observacao: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingId(null);
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

      if (!formData.dia_vencimento || parseInt(formData.dia_vencimento) < 1 || parseInt(formData.dia_vencimento) > 31) {
        showAlert('Dia de vencimento deve estar entre 1 e 31', 'error');
        return;
      }

      const despesaData = {
        filial_id: parseInt(formData.filial_id),
        categoria_id: formData.categoria_id ? parseInt(formData.categoria_id) : undefined,
        nome: formData.nome.trim(),
        valor: parseFloat(arredondarDuasCasas(formData.valor)),
        periodicidade: formData.periodicidade,
        dia_vencimento: parseInt(formData.dia_vencimento),
        observacao: formData.observacao.trim() || undefined,
        status: 'ativo' as const
      };

      if (editingId) {
        await despesasFixasService.update(editingId, despesaData);
        showAlert('Despesa fixa atualizada com sucesso!', 'success');
      } else {
        await despesasFixasService.create(despesaData);
        showAlert('Despesa fixa criada com sucesso!', 'success');
      }

      handleCloseDialog();
      loadDespesas();
    } catch (error) {
      console.error('Erro ao salvar despesa fixa:', error);
      showAlert('Erro ao salvar despesa fixa', 'error');
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'ativo' ? 'inativo' : 'ativo';
      await despesasFixasService.update(id, { status: newStatus });
      showAlert(`Despesa fixa ${newStatus === 'ativo' ? 'ativada' : 'desativada'} com sucesso!`, 'success');
      loadDespesas();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      showAlert('Erro ao alterar status', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir esta despesa fixa?')) {
      try {
        await despesasFixasService.delete(id);
        showAlert('Despesa fixa excluída com sucesso!', 'success');
        loadDespesas();
      } catch (error) {
        console.error('Erro ao excluir despesa fixa:', error);
        showAlert('Erro ao excluir despesa fixa', 'error');
      }
    }
  };

  const handleGenerateVencimentos = async () => {
    try {
      // Para cada despesa ativa, gerar vencimentos dos próximos 3 meses
      const despesasAtivas = despesas.filter(d => d.status === 'ativo');
      let totalGerados = 0;
      
      for (const despesa of despesasAtivas) {
        const result = await despesasFixasService.gerarProximosVencimentos(despesa.id, 3);
        if (result) totalGerados += result.length;
      }
      
      if (totalGerados > 0) {
        showAlert(`${totalGerados} vencimentos gerados com sucesso!`, 'success');
      } else {
        showAlert('Nenhum vencimento gerado (podem já existir)', 'success');
      }
    } catch (error) {
      console.error('Erro ao gerar vencimentos:', error);
      showAlert('Erro ao gerar vencimentos', 'error');
    }
  };

  const handleGerarPDF = () => {
    try {
      const relatorioService = new RelatoriosPDFService();
      const doc = relatorioService.gerarRelatorioDespesasFixas(despesasFiltradas);
      
      const nomeArquivo = `relatorio-despesas-fixas-${new Date().toISOString().slice(0, 10)}.pdf`;
      relatorioService.salvar(nomeArquivo);
      
      showAlert('Relatório PDF gerado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      showAlert('Erro ao gerar relatório PDF', 'error');
    }
  };

  const despesasFiltradas = despesas.filter(despesa => 
    showInactivas ? true : despesa.status === 'ativo'
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Despesas Fixas
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PictureAsPdfIcon />}
            onClick={handleGerarPDF}
            color="primary"
          >
            Gerar PDF
          </Button>
          <Button
            variant="contained"
            startIcon={<CalendarIcon />}
            onClick={handleGenerateVencimentos}
            color="secondary"
          >
            Gerar Vencimentos
          </Button>
          {hasPermission('despesas-fixas', 'criar') && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Nova Despesa Fixa
            </Button>
          )}
        </Box>
      </Box>

      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={showInactivas}
              onChange={(e) => setShowInactivas(e.target.checked)}
            />
          }
          label="Mostrar despesas inativas"
        />
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadDespesas}
          size="small"
        >
          Atualizar
        </Button>
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
                  <TableCell>Periodicidade</TableCell>
                  <TableCell>Dia Vencimento</TableCell>
                  <TableCell>Observação</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : despesasFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      Nenhuma despesa fixa encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  despesasFiltradas.map((despesa) => (
                    <TableRow key={despesa.id}>
                      <TableCell>
                        <Chip
                          label={despesa.status}
                          color={despesa.status === 'ativo' ? 'success' : 'default'}
                          size="small"
                          icon={despesa.status === 'ativo' ? <CheckCircleIcon /> : <BlockIcon />}
                        />
                      </TableCell>
                      <TableCell>{despesa.nome}</TableCell>
                      <TableCell>{despesa.filial_nome}</TableCell>
                      <TableCell>{despesa.categoria_nome || 'Sem categoria'}</TableCell>
                      <TableCell>{formatValor(despesa.valor)}</TableCell>
                      <TableCell>{getPeriodicidadeLabel(despesa.periodicidade)}</TableCell>
                      <TableCell>{despesa.dia_vencimento}</TableCell>
                      <TableCell>{despesa.observacao || '-'}</TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {hasPermission('despesas-fixas', 'editar') && (
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
                          {hasPermission('despesas-fixas', 'editar') && (
                            <Tooltip title={despesa.status === 'ativo' ? 'Desativar' : 'Ativar'}>
                              <IconButton
                                onClick={() => handleToggleStatus(despesa.id, despesa.status)}
                                size="small"
                                color={despesa.status === 'ativo' ? 'warning' : 'success'}
                              >
                                {despesa.status === 'ativo' ? <BlockIcon /> : <CheckCircleIcon />}
                              </IconButton>
                            </Tooltip>
                          )}
                          {hasPermission('despesas-fixas', 'excluir') && (
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

      {/* Dialog - Nova/Editar Despesa Fixa */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingId ? 'Editar Despesa Fixa' : 'Nova Despesa Fixa'}
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
                value={formData.valor === '0' ? '' : formData.valor}
                onChange={handleValorChange}
                fullWidth
                required
                inputProps={{ step: '0.01', min: '0' }}
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
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>Periodicidade</InputLabel>
                <Select
                  value={formData.periodicidade}
                  onChange={(e) => setFormData({ ...formData, periodicidade: e.target.value as any })}
                  label="Periodicidade"
                >
                  <MenuItem value="mensal">Mensal</MenuItem>
                  <MenuItem value="bimestral">Bimestral</MenuItem>
                  <MenuItem value="trimestral">Trimestral</MenuItem>
                  <MenuItem value="semestral">Semestral</MenuItem>
                  <MenuItem value="anual">Anual</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Dia de Vencimento"
                type="number"
                value={formData.dia_vencimento}
                onChange={(e) => setFormData({ ...formData, dia_vencimento: e.target.value })}
                fullWidth
                required
                inputProps={{ min: 1, max: 31 }}
                helperText="Dia do mês (1 a 31)"
              />
            </Box>
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