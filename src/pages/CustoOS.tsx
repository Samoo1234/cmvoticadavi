import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  TextField, 
  Button, 
  IconButton, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction, 
  MenuItem, 
  CircularProgress, 
  Snackbar, 
  Alert 
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { custoOSService, type CustoOS } from '../services/custoOSService';
import { filiaisService } from '../services/filiaisService';
import { formatDateToBrazilian } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';

interface Filial {
  id: number;
  nome: string;
}

const CustoOS: React.FC = () => {
  const [custosOS, setCustosOS] = useState<CustoOS[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [form, setForm] = useState<Partial<CustoOS>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false,
    message: '',
    severity: 'info'
  });

  const { hasPermission } = useAuth();
  
  // Verificar permissões do usuário
  const canCreate = hasPermission('custo-os', 'criar');
  const canEdit = hasPermission('custo-os', 'editar');
  const canDelete = hasPermission('custo-os', 'excluir');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [custosData, filiaisData] = await Promise.all([
          custoOSService.getAll(),
          filiaisService.getAll()
        ]);
        setCustosOS(custosData);
        setFiliais(filiaisData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setAlert({
          open: true,
          message: 'Erro ao carregar dados. Por favor, tente novamente.',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAddOrEdit = async () => {
    // Verificar permissões antes de executar a ação
    if (editId && !canEdit) {
      setAlert({
        open: true,
        message: 'Você não tem permissão para editar custos de OS.',
        severity: 'error'
      });
      return;
    }
    
    if (!editId && !canCreate) {
      setAlert({
        open: true,
        message: 'Você não tem permissão para criar custos de OS.',
        severity: 'error'
      });
      return;
    }

    if (!form.filial_id || !form.data || !form.valor_venda) {
      setAlert({
        open: true,
        message: 'Por favor, preencha todos os campos obrigatórios.',
        severity: 'warning'
      });
      return;
    }

    try {
      setLoading(true);
      
      if (editId) {
        const updated = await custoOSService.update(editId, form as Omit<CustoOS, 'id'>);
        if (updated) {
          setCustosOS(custosOS.map(c => c.id === editId ? updated : c));
          setAlert({
            open: true,
            message: 'Custo de OS atualizado com sucesso!',
            severity: 'success'
          });
        }
        setEditId(null);
      } else {
        const created = await custoOSService.create(form as Omit<CustoOS, 'id'>);
        if (created) {
          setCustosOS([...custosOS, created]);
          setAlert({
            open: true,
            message: 'Custo de OS adicionado com sucesso!',
            severity: 'success'
          });
        }
      }
      
      setForm({});
    } catch (error) {
      console.error('Erro ao salvar custo de OS:', error);
      setAlert({
        open: true,
        message: 'Erro ao salvar custo de OS. Por favor, tente novamente.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: number) => {
    // Verificar permissão antes de executar a ação
    if (!canEdit) {
      setAlert({
        open: true,
        message: 'Você não tem permissão para editar custos de OS.',
        severity: 'error'
      });
      return;
    }

    const custo = custosOS.find(c => c.id === id);
    if (custo) {
      setForm(custo);
      setEditId(id);
    }
  };

  const handleDelete = async (id: number) => {
    // Verificar permissão antes de executar a ação
    if (!canDelete) {
      setAlert({
        open: true,
        message: 'Você não tem permissão para excluir custos de OS.',
        severity: 'error'
      });
      return;
    }

    if (!window.confirm('Tem certeza que deseja excluir este custo de OS?')) {
      return;
    }

    try {
      setLoading(true);
      const success = await custoOSService.delete(id);
      
      if (success) {
        setCustosOS(custosOS.filter(c => c.id !== id));
        if (editId === id) {
          setForm({});
          setEditId(null);
        }
        setAlert({
          open: true,
          message: 'Custo de OS excluído com sucesso!',
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Erro ao excluir custo de OS:', error);
      setAlert({
        open: true,
        message: 'Erro ao excluir custo de OS. Por favor, tente novamente.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setForm({});
    setEditId(null);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getFilialNome = (filialId: number) => {
    const filial = filiais.find(f => f.id === filialId);
    return filial?.nome || 'Filial não encontrada';
  };

  return (
    <Box sx={{ position: 'relative' }}>
      {loading && (
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
      
      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={() => setAlert({ ...alert, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={() => setAlert({ ...alert, open: false })} severity={alert.severity}>
          {alert.message}
        </Alert>
      </Snackbar>
      <Typography variant="h4" gutterBottom color="primary">
        {(canCreate || canEdit) ? 'Cadastro de Custos de OS' : 'Consulta de Custos de OS'}
      </Typography>
      
      {/* Mensagem informativa para usuários apenas com permissão de visualização */}
      {!canCreate && !canEdit && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Você tem apenas permissão de visualização para custos de OS. Não é possível criar, editar ou excluir registros.
        </Alert>
      )}
      
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: (canCreate || canEdit) ? '1fr 1fr' : '1fr' }, gap: 3 }}>
        {/* Só mostra o formulário se tem permissão para criar ou editar */}
        {(canCreate || canEdit) && (
          <div style={{ gridColumn: 'span 6' }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {editId ? 'Editar Custo de OS' : 'Novo Custo de OS'}
                </Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  <TextField
                    label="Valor de Venda"
                    name="valor_venda"
                    type="number"
                    value={form.valor_venda || ''}
                    onChange={handleChange}
                    fullWidth
                    required
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                  
                  <TextField
                    select
                    label="Filial"
                    name="filial_id"
                    value={form.filial_id || ''}
                    onChange={handleChange}
                    fullWidth
                    required
                  >
                    {filiais.map((filial) => (
                      <MenuItem key={filial.id} value={filial.id}>
                        {filial.nome}
                      </MenuItem>
                    ))}
                  </TextField>
                  
                  <TextField
                    label="Custo das Lentes"
                    name="custo_lentes"
                    type="number"
                    value={form.custo_lentes || ''}
                    onChange={handleChange}
                    fullWidth
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                  
                  <TextField
                    label="Custo das Armações"
                    name="custo_armacoes"
                    type="number"
                    value={form.custo_armacoes || ''}
                    onChange={handleChange}
                    fullWidth
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                  
                  <TextField
                    label="Custo de Marketing"
                    name="custo_mkt"
                    type="number"
                    value={form.custo_mkt || ''}
                    onChange={handleChange}
                    fullWidth
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                  
                  <TextField
                    label="Outros Custos"
                    name="outros_custos"
                    type="number"
                    value={form.outros_custos || ''}
                    onChange={handleChange}
                    fullWidth
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                  
                  <TextField
                    label="Data"
                    name="data"
                    type="date"
                    value={form.data || ''}
                    onChange={handleChange}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                  

                  
                  <Box display="flex" gap={2}>
                    {/* Só mostra o botão se tem permissão */}
                    {((editId && canEdit) || (!editId && canCreate)) && (
                      <Button variant="contained" color="primary" onClick={handleAddOrEdit}>
                        {editId ? 'Salvar' : 'Adicionar'}
                      </Button>
                    )}
                    
                    {editId && (
                      <Button variant="outlined" onClick={handleCancel}>
                        Cancelar
                      </Button>
                    )}
                  </Box>
                  
                  {/* Mensagem explicativa se não tem permissão */}
                  {!canCreate && !editId && (
                    <Alert severity="info">
                      Você não tem permissão para criar custos de OS. Apenas visualização permitida.
                    </Alert>
                  )}
                  
                  {!canEdit && editId && (
                    <Alert severity="info">
                      Você não tem permissão para editar custos de OS. Apenas visualização permitida.
                    </Alert>
                  )}
                </Box>
              </CardContent>
            </Card>
          </div>
        )}
        
        <div style={{ gridColumn: 'span 6' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Custos de OS Cadastrados
              </Typography>
              <List>
                {custosOS.map(custo => (
                  <ListItem key={custo.id} divider>
                    <ListItemText 
                      primary={`${getFilialNome(custo.filial_id)} - ${new Date(custo.data).toLocaleDateString('pt-BR')}`}
                      secondary={`Venda: ${formatCurrency(custo.valor_venda)} | Lentes: ${formatCurrency(custo.custo_lentes)} | Armações: ${formatCurrency(custo.custo_armacoes)}`}
                    />
                    <ListItemSecondaryAction>
                      {/* Só mostra botões se tem permissão */}
                      {canEdit && (
                        <IconButton edge="end" aria-label="edit" onClick={() => handleEdit(custo.id)}>
                          <EditIcon />
                        </IconButton>
                      )}
                      {canDelete && (
                        <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(custo.id)}>
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </div>
      </Box>
    </Box>
  );
};

// Exportando o componente como um valor real, não apenas como um tipo
export default CustoOS as React.FC;