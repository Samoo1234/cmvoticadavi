import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, TextField, Button, IconButton, List, ListItem, ListItemText, ListItemSecondaryAction, MenuItem, CircularProgress, Snackbar, Alert } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { fornecedoresService, tiposFornecedoresService } from '../services';
import type { Fornecedor } from '../services/fornecedoresService';
import { useAuth } from '../contexts/AuthContext';

const Fornecedores: React.FC = () => {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [tiposFornecedores, setTiposFornecedores] = useState<string[]>([]);

  const [form, setForm] = useState<Partial<Fornecedor>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false,
    message: '',
    severity: 'info'
  });

  const { hasPermission } = useAuth();
  
  // Verificar permissões do usuário
  const canCreate = hasPermission('fornecedores', 'criar');
  const canEdit = hasPermission('fornecedores', 'editar');
  const canDelete = hasPermission('fornecedores', 'excluir');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Carregar fornecedores
        const fornecedoresData = await fornecedoresService.getAll();
        setFornecedores(fornecedoresData);
        
        // Carregar tipos de fornecedores
        const tiposData = await tiposFornecedoresService.getAll();
        if (tiposData && tiposData.length > 0) {
          setTiposFornecedores(tiposData.map(tipo => tipo.nome));
        } else {
          setTiposFornecedores([]);
        }

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
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddOrEdit = async () => {
    // Verificar permissões antes de executar a ação
    if (editId && !canEdit) {
      setAlert({
        open: true,
        message: 'Você não tem permissão para editar fornecedores.',
        severity: 'error'
      });
      return;
    }
    
    if (!editId && !canCreate) {
      setAlert({
        open: true,
        message: 'Você não tem permissão para criar fornecedores.',
        severity: 'error'
      });
      return;
    }

    // Validar campos obrigatórios
    if (!form.nome || !form.cnpj || !form.tipo) {
      setAlert({
        open: true,
        message: 'Por favor, preencha todos os campos obrigatórios: Nome, CNPJ e Tipo.',
        severity: 'warning'
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Garantir que todos os campos esperados existam
      const dadosCompletos = {
        nome: form.nome?.trim(),
        cnpj: form.cnpj?.trim(),
        tipo: form.tipo,
        endereco: form.endereco || '',
        filiais: form.filiais || ''
      };
      
      if (editId) {
        // Atualizar fornecedor existente
        const updated = await fornecedoresService.update(editId, dadosCompletos);
        
        if (updated) {
          setFornecedores(fornecedores.map(f => f.id === editId ? updated : f));
          setAlert({
            open: true,
            message: 'Fornecedor atualizado com sucesso!',
            severity: 'success'
          });
        } else {
          throw new Error('Não foi possível atualizar o fornecedor');
        }
        setEditId(null);
      } else {
        // Criar novo fornecedor
        const created = await fornecedoresService.create(dadosCompletos as Omit<Fornecedor, 'id'>);
        
        if (created) {
          setFornecedores([...fornecedores, created]);
          setAlert({
            open: true,
            message: 'Fornecedor adicionado com sucesso!',
            severity: 'success'
          });
        } else {
          throw new Error('Não foi possível criar o fornecedor');
        }
      }
      
      // Limpar formulário após operação bem-sucedida
      setForm({});
    } catch (error) {
      console.error('Erro ao salvar fornecedor:', error);
      setAlert({
        open: true,
        message: 'Erro ao salvar fornecedor. Por favor, tente novamente.',
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
        message: 'Você não tem permissão para editar fornecedores.',
        severity: 'error'
      });
      return;
    }

    const fornecedor = fornecedores.find(f => f.id === id);
    if (fornecedor) {
      setForm(fornecedor);
      setEditId(id);
    }
  };

  const handleDelete = async (id: number) => {
    // Verificar permissão antes de executar a ação
    if (!canDelete) {
      setAlert({
        open: true,
        message: 'Você não tem permissão para excluir fornecedores.',
        severity: 'error'
      });
      return;
    }

    try {
      setLoading(true);
      const success = await fornecedoresService.delete(id);
      
      if (success) {
        setFornecedores(fornecedores.filter(f => f.id !== id));
        if (editId === id) {
          setForm({});
          setEditId(null);
        }
        setAlert({
          open: true,
          message: 'Fornecedor excluído com sucesso!',
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Erro ao excluir fornecedor:', error);
      setAlert({
        open: true,
        message: 'Erro ao excluir fornecedor. Por favor, tente novamente.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom color="primary">
        {(canCreate || canEdit) ? 'Cadastro de Fornecedores' : 'Consulta de Fornecedores'}
      </Typography>
      
      {/* Mensagem informativa para usuários apenas com permissão de visualização */}
      {!canCreate && !canEdit && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Você tem apenas permissão de visualização para fornecedores. Não é possível criar, editar ou excluir registros.
        </Alert>
      )}
      
      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: (canCreate || canEdit) ? '1fr 1fr' : '1fr' }, gap: 3 }}>
          {/* Só mostra o formulário se tem permissão para criar ou editar */}
          {(canCreate || canEdit) && (
            <Box>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {editId ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={2}>
                    <TextField
                      label="Nome"
                      name="nome"
                      value={form.nome || ''}
                      onChange={handleChange}
                      fullWidth
                      required
                    />
                    <TextField
                      label="CNPJ"
                      name="cnpj"
                      value={form.cnpj || ''}
                      onChange={handleChange}
                      fullWidth
                      required
                    />
                    <TextField
                      select
                      label="Tipo"
                      name="tipo"
                      value={form.tipo || ''}
                      onChange={handleChange}
                      fullWidth
                      required
                    >
                      {tiposFornecedores.map((tipo) => (
                        <MenuItem key={tipo} value={tipo}>
                          {tipo}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="Endereço"
                      name="endereco"
                      value={form.endereco || ''}
                      onChange={handleChange}
                      fullWidth
                    />
                    <TextField
                      label="Filiais Atendidas"
                      name="filiais"
                      value={form.filiais || ''}
                      onChange={handleChange}
                      fullWidth
                      placeholder="Ex: Matriz, Filial 1, Filial 2"
                    />
                    
                    {/* Só mostra o botão se tem permissão */}
                    {((editId && canEdit) || (!editId && canCreate)) && (
                      <Button variant="contained" color="primary" onClick={handleAddOrEdit}>
                        {editId ? 'Salvar' : 'Adicionar'}
                      </Button>
                    )}
                    
                    {/* Mensagem explicativa se não tem permissão */}
                    {!canCreate && !editId && (
                      <Alert severity="info">
                        Você não tem permissão para criar fornecedores. Apenas visualização permitida.
                      </Alert>
                    )}
                    
                    {!canEdit && editId && (
                      <Alert severity="info">
                        Você não tem permissão para editar fornecedores. Apenas visualização permitida.
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
                  Fornecedores Cadastrados
                </Typography>
                <List>
                  {fornecedores.map(fornecedor => (
                    <ListItem key={fornecedor.id} divider>
                      <ListItemText
                        primary={`${fornecedor.nome} (${fornecedor.tipo})`}
                        secondary={`CNPJ: ${fornecedor.cnpj} | Endereço: ${fornecedor.endereco} | Filiais: ${fornecedor.filiais}`}
                      />
                      <ListItemSecondaryAction>
                        {/* Só mostra botões se tem permissão */}
                        {canEdit && (
                          <IconButton edge="end" aria-label="edit" onClick={() => handleEdit(fornecedor.id)}>
                            <EditIcon />
                          </IconButton>
                        )}
                        {canDelete && (
                          <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(fornecedor.id)}>
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
    </Box>
  );
};

export default Fornecedores;