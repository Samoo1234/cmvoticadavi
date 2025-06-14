import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, TextField, Button, IconButton, List, ListItem, ListItemText, ListItemSecondaryAction, MenuItem, CircularProgress, Snackbar, Alert } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { fornecedoresService, tiposFornecedoresService } from '../services';
import type { Fornecedor } from '../services/fornecedoresService';

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
    const fornecedor = fornecedores.find(f => f.id === id);
    if (fornecedor) {
      setForm(fornecedor);
      setEditId(id);
    }
  };

  const handleDelete = async (id: number) => {
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
        Cadastro de Fornecedores
      </Typography>
      
      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          <Box sx={{ flex: 1 }}>
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
                    {tiposFornecedores.length > 0 ? (
                      tiposFornecedores.map(tipo => (
                        <MenuItem key={tipo} value={tipo}>{tipo}</MenuItem>
                      ))
                    ) : (
                      <MenuItem value="" disabled>Nenhum tipo cadastrado</MenuItem>
                    )}
                  </TextField>

                  <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={handleAddOrEdit}
                  >
                    {editId ? 'Salvar' : 'Adicionar'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Fornecedores Cadastrados
                </Typography>
                {fornecedores.length === 0 ? (
                  <Typography variant="body2" color="textSecondary" align="center" sx={{ my: 4 }}>
                    Nenhum fornecedor cadastrado
                  </Typography>
                ) : (
                  <List>
                    {fornecedores.map(fornecedor => (
                      <ListItem key={fornecedor.id} divider>
                        <ListItemText
                          primary={fornecedor.nome}
                          secondary={`CNPJ: ${fornecedor.cnpj} | Tipo: ${fornecedor.tipo}`}
                        />
                        <ListItemSecondaryAction>
                          <IconButton edge="end" aria-label="edit" onClick={() => handleEdit(fornecedor.id)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(fornecedor.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}
      
      <Snackbar 
        open={alert.open} 
        autoHideDuration={6000} 
        onClose={() => setAlert({...alert, open: false})}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setAlert({...alert, open: false})} 
          severity={alert.severity}
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Fornecedores;