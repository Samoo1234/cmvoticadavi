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
  ListItemSecondaryAction,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { tiposFornecedoresService, type TipoFornecedor } from '../services/tiposFornecedoresService';

const TiposFornecedores: React.FC = () => {
  const [tipos, setTipos] = useState<TipoFornecedor[]>([]);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState<{open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning'}>({ 
    open: false, 
    message: '', 
    severity: 'info' 
  });

  // Carrega os tipos de fornecedores do Supabase
  useEffect(() => {
    const loadTipos = async () => {
      try {
        setIsLoading(true);
        const data = await tiposFornecedoresService.getAll();
        setTipos(data);
      } catch (error) {
        console.error('Erro ao carregar tipos de fornecedores:', error);
        showAlert('Erro ao carregar tipos de fornecedores', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadTipos();
  }, []);

  const showAlert = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setAlert({ open: true, message, severity });
  };

  const handleCloseAlert = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setAlert({ ...alert, open: false });
  };

  const handleAddOrEdit = async () => {
    if (nome.trim() === '') {
      showAlert('Por favor, preencha o nome do tipo', 'warning');
      return;
    }

    try {
      setIsLoading(true);
      
      if (editId) {
        // Atualizar tipo existente
        const updated = await tiposFornecedoresService.update(editId, { nome, descricao });
        if (updated) {
          setTipos(tipos.map(t => t.id === editId ? updated : t));
          showAlert('Tipo de fornecedor atualizado com sucesso!', 'success');
        }
        setEditId(null);
      } else {
        // Criar novo tipo
        const created = await tiposFornecedoresService.create({ nome, descricao });
        if (created) {
          setTipos([...tipos, created]);
          showAlert('Tipo de fornecedor adicionado com sucesso!', 'success');
        }
      }
      
      // Limpar formulário
      setNome('');
      setDescricao('');
    } catch (error) {
      console.error('Erro ao salvar tipo de fornecedor:', error);
      showAlert('Erro ao salvar tipo de fornecedor. Por favor, tente novamente.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (id: number) => {
    const tipo = tipos.find(t => t.id === id);
    if (tipo) {
      setNome(tipo.nome);
      setDescricao(tipo.descricao || '');
      setEditId(id);
      // Rolar para o topo do formulário
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este tipo de fornecedor?')) {
      return;
    }

    try {
      setIsLoading(true);
      const success = await tiposFornecedoresService.delete(id);
      
      if (success) {
        setTipos(tipos.filter(t => t.id !== id));
        if (editId === id) {
          setNome('');
          setDescricao('');
          setEditId(null);
        }
        showAlert('Tipo de fornecedor excluído com sucesso!', 'success');
      }
    } catch (error) {
      console.error('Erro ao excluir tipo de fornecedor:', error);
      showAlert('Erro ao excluir tipo de fornecedor. Verifique se não existem fornecedores vinculados a este tipo.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setNome('');
    setDescricao('');
    setEditId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <Typography variant="h4" gutterBottom color="primary">
        Cadastro de Tipos de Fornecedores
      </Typography>
      
      {/* Loading Overlay */}
      {isLoading && (
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
      
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {editId ? 'Editar Tipo' : 'Novo Tipo'}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Nome do Tipo"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  fullWidth
                  disabled={isLoading}
                />
                <TextField
                  label="Descrição"
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  fullWidth
                  multiline
                  rows={3}
                  disabled={isLoading}
                />
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  {editId && (
                    <Button 
                      variant="outlined" 
                      onClick={handleCancel}
                      disabled={isLoading}
                    >
                      Cancelar
                    </Button>
                  )}
                  <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={handleAddOrEdit}
                    disabled={isLoading || !nome.trim()}
                  >
                    {editId ? 'Salvar Alterações' : 'Adicionar Tipo'}
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
        
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tipos Cadastrados
              </Typography>
              {tipos.length === 0 ? (
                <Typography variant="body1" color="textSecondary" align="center" sx={{ py: 4 }}>
                  Nenhum tipo de fornecedor cadastrado.
                </Typography>
              ) : (
                <List>
                  {tipos.map(tipo => (
                    <ListItem 
                      key={tipo.id} 
                      divider
                      sx={{
                        '&:hover': {
                          backgroundColor: 'action.hover',
                          cursor: 'pointer'
                        },
                        transition: 'background-color 0.2s',
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1">{tipo.nome}</Typography>
                        {tipo.descricao && (
                          <Typography variant="body2" color="textSecondary">
                            {tipo.descricao}
                          </Typography>
                        )}
                      </Box>
                      <ListItemSecondaryAction>
                        <IconButton 
                          edge="end" 
                          aria-label="editar" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(tipo.id);
                          }}
                          disabled={isLoading}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          edge="end" 
                          aria-label="excluir"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(tipo.id);
                          }}
                          disabled={isLoading}
                          sx={{ color: 'error.main' }}
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
      
      {/* Snackbar para feedback */}
      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
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

export default TiposFornecedores; 