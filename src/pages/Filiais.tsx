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
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { filiaisService } from '../services';
import type { Filial } from '../services/filiaisService';

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
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (filial: Filial) => {
    if (!filial.id) return; // Não edita se não há ID
    
    setForm({
      nome: filial.nome,
      endereco: filial.endereco,
      telefone: filial.telefone || '',
      ativa: filial.ativa
    });
    setEditId(filial.id);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta filial?')) {
      try {
        setLoading(true);
        await filiaisService.delete(id);
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
      } catch (error: any) {
        console.error('Erro ao excluir filial:', error);
        let errorMessage = 'Erro ao excluir filial. Por favor, tente novamente.';
        
        if (error.message) {
          if (error.message.includes('permission denied')) {
            errorMessage = 'Você não tem permissão para excluir esta filial.';
          } else if (error.message.includes('foreign key')) {
            errorMessage = 'Não é possível excluir esta filial pois ela possui registros vinculados.';
          }
        }
        
        setAlert({
          open: true,
          message: errorMessage,
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCancel = () => {
    setForm(initialFormState);
    setEditId(null);
  };

  const handleCloseAlert = () => {
    setAlert(prev => ({ ...prev, open: false }));
  };

  if (loading && filiais.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Cadastro de Filiais
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {editId ? 'Editar Filial' : 'Nova Filial'}
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
            <TextField
              label="Nome *"
              name="nome"
              value={form.nome}
              onChange={handleChange}
              fullWidth
              disabled={loading}
            />
            <TextField
              label="Endereço *"
              name="endereco"
              value={form.endereco}
              onChange={handleChange}
              fullWidth
              disabled={loading}
            />
            <TextField
              label="Telefone"
              name="telefone"
              value={form.telefone}
              onChange={handleChange}
              fullWidth
              disabled={loading}
            />
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Checkbox
                name="ativa"
                checked={form.ativa}
                onChange={handleChange}
                disabled={loading}
              />
              <Typography>Filial Ativa</Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              onClick={handleAddOrEdit} 
              variant="contained" 
              disabled={loading}
            >
              {loading ? <CircularProgress size={20} /> : (editId ? 'Atualizar' : 'Adicionar')}
            </Button>
            {editId && (
              <Button onClick={handleCancel} variant="outlined" disabled={loading}>
                Cancelar
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filiais Cadastradas
          </Typography>
          
          {filiais.length === 0 ? (
            <Typography color="text.secondary">
              Nenhuma filial cadastrada ainda.
            </Typography>
          ) : (
            <List>
              {filiais.map((filial) => (
                <ListItem key={filial.id} divider>
                  <ListItemText
                    primary={filial.nome}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {filial.endereco}
                        </Typography>
                        {filial.telefone && (
                          <Typography variant="body2" color="text.secondary">
                            Tel: {filial.telefone}
                          </Typography>
                        )}
                        <Typography 
                          variant="body2" 
                          color={filial.ativa ? 'success.main' : 'error.main'}
                        >
                          {filial.ativa ? 'Ativa' : 'Inativa'}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton 
                      onClick={() => handleEdit(filial)} 
                      disabled={loading}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      onClick={() => filial.id && handleDelete(filial.id)} 
                      disabled={loading || !filial.id}
                      size="small"
                      color="error"
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

      <Snackbar
        open={alert.open}
        autoHideDuration={alert.autoHideDuration || 6000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseAlert} 
          severity={alert.severity}
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Filiais; 