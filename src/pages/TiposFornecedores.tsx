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
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { tiposFornecedoresService, type TipoFornecedor } from '../services/tiposFornecedoresService';
import { useAuth } from '../contexts/AuthContext';

const TiposFornecedores: React.FC = () => {
  const [tipos, setTipos] = useState<TipoFornecedor[]>([]);
  const [form, setForm] = useState<{ nome: string }>({ nome: '' });
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false,
    message: '',
    severity: 'info'
  });

  const { hasPermission } = useAuth();
  
  // Verificar permissões do usuário
  const canCreate = hasPermission('tipos-fornecedores', 'criar');
  const canEdit = hasPermission('tipos-fornecedores', 'editar');
  const canDelete = hasPermission('tipos-fornecedores', 'excluir');

  useEffect(() => {
    const fetchTipos = async () => {
      try {
        setLoading(true);
        const data = await tiposFornecedoresService.getAll();
        setTipos(data);
      } catch (error) {
        console.error('Erro ao carregar tipos:', error);
        setAlert({
          open: true,
          message: 'Erro ao carregar tipos de fornecedores. Por favor, tente novamente.',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTipos();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ nome: e.target.value });
  };

  const handleAddOrEdit = async () => {
    // Verificar permissões antes de executar a ação
    if (editId && !canEdit) {
      setAlert({
        open: true,
        message: 'Você não tem permissão para editar tipos de fornecedores.',
        severity: 'error'
      });
      return;
    }
    
    if (!editId && !canCreate) {
      setAlert({
        open: true,
        message: 'Você não tem permissão para criar tipos de fornecedores.',
        severity: 'error'
      });
      return;
    }

    if (!form.nome.trim()) {
      setAlert({
        open: true,
        message: 'Por favor, preencha o nome do tipo.',
        severity: 'warning'
      });
      return;
    }

    try {
      setLoading(true);
      
      if (editId) {
        const updated = await tiposFornecedoresService.update(editId, { nome: form.nome.trim(), descricao: '' });
        if (updated) {
          setTipos(tipos.map(t => t.id === editId ? updated : t));
          setAlert({
            open: true,
            message: 'Tipo de fornecedor atualizado com sucesso!',
            severity: 'success'
          });
        }
        setEditId(null);
      } else {
        const created = await tiposFornecedoresService.create({ nome: form.nome.trim(), descricao: '' });
        if (created) {
          setTipos([...tipos, created]);
          setAlert({
            open: true,
            message: 'Tipo de fornecedor adicionado com sucesso!',
            severity: 'success'
          });
        }
      }
      
      setForm({ nome: '' });
    } catch (error) {
      console.error('Erro ao salvar tipo:', error);
      setAlert({
        open: true,
        message: 'Erro ao salvar tipo de fornecedor. Por favor, tente novamente.',
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
        message: 'Você não tem permissão para editar tipos de fornecedores.',
        severity: 'error'
      });
      return;
    }

    const tipo = tipos.find(t => t.id === id);
    if (tipo) {
      setForm({ nome: tipo.nome });
      setEditId(id);
    }
  };

  const handleDelete = async (id: number) => {
    // Verificar permissão antes de executar a ação
    if (!canDelete) {
      setAlert({
        open: true,
        message: 'Você não tem permissão para excluir tipos de fornecedores.',
        severity: 'error'
      });
      return;
    }

    if (!window.confirm('Tem certeza que deseja excluir este tipo de fornecedor?')) {
      return;
    }

    try {
      setLoading(true);
      const success = await tiposFornecedoresService.delete(id);
      
      if (success) {
        setTipos(tipos.filter(t => t.id !== id));
        if (editId === id) {
          setForm({ nome: '' });
          setEditId(null);
        }
        setAlert({
          open: true,
          message: 'Tipo de fornecedor excluído com sucesso!',
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Erro ao excluir tipo:', error);
      setAlert({
        open: true,
        message: 'Erro ao excluir tipo de fornecedor. Verifique se não há fornecedores usando este tipo.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setForm({ nome: '' });
    setEditId(null);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom color="primary">
        {(canCreate || canEdit) ? 'Cadastro de Tipos de Fornecedores' : 'Consulta de Tipos de Fornecedores'}
      </Typography>
      
      {/* Mensagem informativa para usuários apenas com permissão de visualização */}
      {!canCreate && !canEdit && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Você tem apenas permissão de visualização para tipos de fornecedores. Não é possível criar, editar ou excluir registros.
        </Alert>
      )}
      
      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}
      
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: (canCreate || canEdit) ? '1fr 1fr' : '1fr' }, gap: 3 }}>
        {/* Só mostra o formulário se tem permissão para criar ou editar */}
        {(canCreate || canEdit) && (
          <Box>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {editId ? 'Editar Tipo' : 'Novo Tipo'}
                </Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  <TextField
                    label="Nome do Tipo"
                    name="nome"
                    value={form.nome}
                    onChange={handleChange}
                    fullWidth
                    required
                    placeholder="Ex: Laboratório, Distribuidora, etc."
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
                      Você não tem permissão para criar tipos de fornecedores. Apenas visualização permitida.
                    </Alert>
                  )}
                  
                  {!canEdit && editId && (
                    <Alert severity="info">
                      Você não tem permissão para editar tipos de fornecedores. Apenas visualização permitida.
                    </Alert>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}
        
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tipos Cadastrados
              </Typography>
              <List>
                {tipos.map(tipo => (
                  <ListItem key={tipo.id} divider>
                    <ListItemText primary={tipo.nome} />
                    <ListItemSecondaryAction>
                      {/* Só mostra botões se tem permissão */}
                      {canEdit && (
                        <IconButton edge="end" aria-label="edit" onClick={() => handleEdit(tipo.id)}>
                          <EditIcon />
                        </IconButton>
                      )}
                      {canDelete && (
                        <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(tipo.id)}>
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Box>
      </Box>
      
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
    </Box>
  );
};

export default TiposFornecedores; 