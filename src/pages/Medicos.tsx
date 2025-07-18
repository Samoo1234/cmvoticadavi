import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, TextField, Button, IconButton, List, ListItem, ListItemText, ListItemSecondaryAction, CircularProgress, Snackbar, Alert } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { medicosService } from '../services';
import type { Medico } from '../services/medicosService';
import { useAuth } from '../contexts/AuthContext';

const Medicos: React.FC = () => {
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [form, setForm] = useState<Partial<Medico>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false,
    message: '',
    severity: 'info'
  });

  const { hasPermission } = useAuth();
  
  // Verificar permissões do usuário
  const canCreate = hasPermission('medicos', 'criar');
  const canEdit = hasPermission('medicos', 'editar');
  const canDelete = hasPermission('medicos', 'excluir');

  useEffect(() => {
    const fetchMedicos = async () => {
      try {
        setLoading(true);
        const data = await medicosService.getAll();
        setMedicos(data);
      } catch (error) {
        console.error('Erro ao carregar médicos:', error);
        setAlert({
          open: true,
          message: 'Erro ao carregar médicos. Por favor, tente novamente.',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchMedicos();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddOrEdit = async () => {
    if (editId && !canEdit) {
      setAlert({
        open: true,
        message: 'Você não tem permissão para editar médicos.',
        severity: 'error'
      });
      return;
    }
    
    if (!editId && !canCreate) {
      setAlert({
        open: true,
        message: 'Você não tem permissão para criar médicos.',
        severity: 'error'
      });
      return;
    }

    if (!form.nome || !form.nome.trim()) {
      setAlert({
        open: true,
        message: 'Por favor, preencha o nome do médico.',
        severity: 'warning'
      });
      return;
    }
    
    try {
      setLoading(true);
      
      if (editId) {
        const updated = await medicosService.update(editId, { nome: form.nome });
        
        if (updated) {
          setMedicos(medicos.map(m => m.id === editId ? updated : m));
          setAlert({
            open: true,
            message: 'Médico atualizado com sucesso!',
            severity: 'success'
          });
        }
        setEditId(null);
      } else {
        const created = await medicosService.create({ nome: form.nome });
        
        if (created) {
          setMedicos([...medicos, created]);
          setAlert({
            open: true,
            message: 'Médico adicionado com sucesso!',
            severity: 'success'
          });
        }
      }
      
      setForm({});
    } catch (error) {
      console.error('Erro ao salvar médico:', error);
      setAlert({
        open: true,
        message: 'Erro ao salvar médico. Por favor, tente novamente.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: number) => {
    if (!canEdit) {
      setAlert({
        open: true,
        message: 'Você não tem permissão para editar médicos.',
        severity: 'error'
      });
      return;
    }

    const medico = medicos.find(m => m.id === id);
    if (medico) {
      setForm(medico);
      setEditId(id);
    }
  };

  const handleDelete = async (id: number) => {
    if (!canDelete) {
      setAlert({
        open: true,
        message: 'Você não tem permissão para excluir médicos.',
        severity: 'error'
      });
      return;
    }

    try {
      setLoading(true);
      await medicosService.delete(id);
      setMedicos(medicos.filter(m => m.id !== id));
      if (editId === id) {
        setForm({});
        setEditId(null);
      }
      setAlert({
        open: true,
        message: 'Médico excluído com sucesso!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Erro ao excluir médico:', error);
      setAlert({
        open: true,
        message: 'Erro ao excluir médico. Por favor, tente novamente.',
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

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Médicos
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {editId ? 'Editar Médico' : 'Adicionar Médico'}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              name="nome"
              label="Nome do Médico"
              value={form.nome || ''}
              onChange={handleChange}
              variant="outlined"
              size="small"
              sx={{ minWidth: 300 }}
              disabled={Boolean(loading || (!canCreate && !editId) || (!canEdit && editId))}
            />
            
            <Button 
              variant="contained" 
              onClick={handleAddOrEdit}
              disabled={Boolean(loading || (!canCreate && !editId) || (!canEdit && editId))}
            >
              {editId ? 'Atualizar' : 'Adicionar'}
            </Button>
            
            {editId && (
              <Button 
                variant="outlined" 
                onClick={handleCancel}
                disabled={loading}
              >
                Cancelar
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Lista de Médicos
          </Typography>
          
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <List>
              {medicos.length === 0 ? (
                <ListItem>
                  <ListItemText primary="Nenhum médico cadastrado" />
                </ListItem>
              ) : (
                medicos.map((medico) => (
                  <ListItem key={medico.id} divider>
                    <ListItemText 
                      primary={medico.nome}
                    />
                    <ListItemSecondaryAction>
                      <IconButton 
                        edge="end" 
                        aria-label="edit" 
                        onClick={() => handleEdit(medico.id)}
                        disabled={!canEdit}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        edge="end" 
                        aria-label="delete" 
                        onClick={() => handleDelete(medico.id)}
                        disabled={!canDelete}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))
              )}
            </List>
          )}
        </CardContent>
      </Card>
      
      <Snackbar 
        open={alert.open} 
        autoHideDuration={6000} 
        onClose={() => setAlert({ ...alert, open: false })}
      >
        <Alert 
          onClose={() => setAlert({ ...alert, open: false })} 
          severity={alert.severity}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Medicos;