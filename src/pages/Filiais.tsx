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
  Checkbox, 
  CircularProgress
} from '@mui/material';
// Removendo importação não utilizada
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { filiaisService } from '../services';
import type { Filial } from '../services/filiaisService';

// Removendo o componente não utilizado

// Interface para o estado do alerta
interface AlertState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
  autoHideDuration?: number;
}

// Estado inicial do formulário
const initialFormState: Omit<Filial, 'id'> = {
  nome: '',
  endereco: '',
  telefone: '',
  responsavel: '',
  ativa: true
};

const Filiais: React.FC = () => {
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [form, setForm] = useState<Omit<Filial, 'id'>>(initialFormState);
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<AlertState>({ 
    open: false, 
    message: '', 
    severity: 'info' 
  });

  useEffect(() => {
    const fetchFiliais = async () => {
      try {
        setLoading(true);
        const data = await filiaisService.getAll();
        setFiliais(data);
      } catch (error) {
        console.error('Erro ao carregar filiais:', error);
        setAlert({
          open: true,
          message: 'Erro ao carregar filiais. Por favor, tente novamente.',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFiliais();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    // Trata campos booleanos corretamente
    if (type === 'checkbox') {
      setForm(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleAddOrEdit = async () => {
    // Validação dos campos obrigatórios
    if (!form.nome || !form.endereco) {
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
        // Atualizar filial existente
        const updated = await filiaisService.update(editId, form);
        if (updated) {
          setFiliais(filiais.map(f => f.id === editId ? updated : f));
          setAlert({
            open: true,
            message: 'Filial atualizada com sucesso!',
            severity: 'success'
          });
        }
        setEditId(null);
      } else {
        console.log('Tentando criar nova filial com dados:', form);
        
        // Garante que o campo ativa esteja definido
        const filialToCreate = {
          ...form,
          ativa: form.ativa !== undefined ? form.ativa : true
        };
        
        // Criar nova filial
        const created = await filiaisService.create(filialToCreate);
        
        if (created) {
          console.log('Filial criada com sucesso:', created);
          setFiliais([...filiais, created]);
          setAlert({
            open: true,
            message: 'Filial adicionada com sucesso!',
            severity: 'success'
          });
        }
      }
      
      // Reseta o formulário após o sucesso
      setForm(initialFormState);
    } catch (error: any) {
      console.error('Erro detalhado ao salvar filial:', error);
      
      // Mensagem de erro mais amigável
      let errorMessage = 'Erro ao salvar filial. Por favor, tente novamente.';
      
      if (error.message) {
        if (error.message.includes('duplicate key')) {
          errorMessage = 'Já existe uma filial com este nome. Por favor, escolha outro nome.';
        } else if (error.message.includes('permission denied')) {
          errorMessage = 'Você não tem permissão para realizar esta ação.';
        } else if (error.message.includes('network error')) {
          errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
        } else if (error.message.includes('Já existe uma filial matriz')) {
          errorMessage = error.message;
        } else if (error.message.includes('null value in column')) {
          errorMessage = 'Erro: Algum campo obrigatório não foi preenchido corretamente.';
        }
      }
      
      setAlert({
        open: true,
        message: errorMessage,
        severity: 'error',
        autoHideDuration: 10000 // 10 segundos
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: number) => {
    const filial = filiais.find(f => f.id === id);
    if (filial) {
      setForm({
        nome: filial.nome,
        endereco: filial.endereco,
        telefone: filial.telefone || '',
        responsavel: filial.responsavel || '',
        ativa: filial.ativa
      });
      setEditId(id);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setLoading(true);
      const success = await filiaisService.delete(id);
      
      if (success) {
        setFiliais(filiais.filter(f => f.id !== id));
        if (editId === id) {
          setForm(initialFormState);
          setEditId(null);
        }
        setAlert({
          open: true,
          message: 'Filial excluída com sucesso!',
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Erro ao excluir filial:', error);
      setAlert({
        open: true,
        message: 'Erro ao excluir filial. Por favor, tente novamente.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAtiva = async (id: number, currentStatus: boolean) => {
    try {
      const updated = await filiaisService.update(id, { ativa: !currentStatus });
      if (updated) {
        setFiliais(filiais.map(f => f.id === id ? { ...f, ativa: !currentStatus } : f));
        setAlert({
          open: true,
          message: `Filial ${!currentStatus ? 'ativada' : 'desativada'} com sucesso!`,
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Erro ao alterar status da filial:', error);
      setAlert({
        open: true,
        message: 'Erro ao alterar status da filial',
        severity: 'error'
      });
    }
  };



  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom color="primary" sx={{ mb: 4 }}>
        Cadastro de Filiais
      </Typography>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {/* Formulário */}
        <Box sx={{ flex: '1 1 400px', minWidth: '300px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {editId ? 'Editar Filial' : 'Nova Filial'}
              </Typography>
              
              <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Nome"
                  name="nome"
                  value={form.nome}
                  onChange={handleChange}
                  fullWidth
                  required
                  margin="normal"
                />
                
                <TextField
                  label="Endereço"
                  name="endereco"
                  value={form.endereco}
                  onChange={handleChange}
                  fullWidth
                  required
                  margin="normal"
                />
                
                <TextField
                  label="Telefone"
                  name="telefone"
                  value={form.telefone}
                  onChange={handleChange}
                  fullWidth
                  margin="normal"
                />
                
                <TextField
                  label="Responsável"
                  name="responsavel"
                  value={form.responsavel}
                  onChange={handleChange}
                  fullWidth
                  margin="normal"
                />
                
                <Box display="flex" alignItems="center" gap={1}>
                  <Checkbox
                    checked={form.ativa}
                    onChange={handleChange}
                    name="ativa"
                    color="primary"
                  />
                  <Typography variant="body2">Ativa</Typography>
                </Box>
                
                <Box display="flex" gap={2} mt={2}>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={handleAddOrEdit}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : null}
                  >
                    {editId ? 'Salvar' : 'Adicionar'}
                  </Button>
                  
                  {editId && (
                    <Button 
                      variant="outlined" 
                      color="secondary" 
                      onClick={() => {
                        setEditId(null);
                        setForm(initialFormState);
                      }}
                      disabled={loading}
                    >
                      Cancelar
                    </Button>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
        
        {/* Lista de Filiais */}
        <Box sx={{ flex: '1 1 400px', minWidth: '300px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Filiais Cadastradas
              </Typography>
              
              {loading ? (
                <Box display="flex" justifyContent="center" p={4}>
                  <CircularProgress />
                </Box>
              ) : filiais.length === 0 ? (
                <Typography variant="body1" color="textSecondary" align="center" sx={{ p: 2 }}>
                  Nenhuma filial cadastrada
                </Typography>
              ) : (
                <List>
                  {filiais.map(filial => (
                    <ListItem 
                      key={filial.id} 
                      divider
                      sx={{
                        backgroundColor: filial.ativa ? 'transparent' : 'action.hover',
                        opacity: filial.ativa ? 1 : 0.7,
                        transition: 'all 0.2s',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        }
                      }}
                    >
                      <ListItemText
                        primary={
                          <>
                            {filial.nome}

                            {!filial.ativa && (
                              <Typography 
                                component="span" 
                                variant="caption" 
                                color="text.secondary"
                                sx={{ ml: 1 }}
                              >
                                (Inativa)
                              </Typography>
                            )}
                          </>
                        }
                        secondary={
                          <>
                            <Typography component="span" display="block">
                              {filial.endereco}
                            </Typography>
                            {filial.telefone && (
                              <Typography component="span" display="block">
                                {filial.telefone}
                              </Typography>
                            )}
                            {filial.responsavel && (
                              <Typography component="span" display="block" color="text.secondary">
                                Responsável: {filial.responsavel}
                              </Typography>
                            )}
                          </>
                        }
                        primaryTypographyProps={{
                          fontWeight: 'medium',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        secondaryTypographyProps={{ component: 'div' }}
                      />
                      <ListItemSecondaryAction sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Checkbox
                          checked={filial.ativa}
                          onChange={() => filial.id && handleToggleAtiva(filial.id, filial.ativa)}
                          color="primary"
                          disabled={loading}
                          sx={{ cursor: 'pointer' }}
                        />
                        <IconButton 
                          edge="end" 
                          aria-label="editar"
                          onClick={() => filial.id && handleEdit(filial.id)}
                          disabled={loading}
                          sx={{ cursor: 'pointer' }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          edge="end" 
                          aria-label="excluir"
                          onClick={() => filial.id && handleDelete(filial.id)}
                          disabled={loading}
                          sx={{ cursor: 'pointer' }}
                        >
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
    </Box>
  );
};

export default Filiais; 