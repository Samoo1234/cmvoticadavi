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
  Alert,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { categoriasDespesasService } from '../services/despesasService';
import type { CategoriaDespesa } from '../services/despesasService';
import { useAuth } from '../contexts/AuthContext';

const CategoriasDespesas: React.FC = () => {
  const [categorias, setCategorias] = useState<CategoriaDespesa[]>([]);
  const [form, setForm] = useState<Partial<CategoriaDespesa>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoriaToDelete, setCategoriaToDelete] = useState<number | null>(null);
  const [alert, setAlert] = useState<{ 
    open: boolean; 
    message: string; 
    severity: 'success' | 'error' | 'info' | 'warning' 
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  const { hasPermission } = useAuth();
  
  // Verificar permissões do usuário
  const canCreate = hasPermission('categorias-despesas', 'criar');
  const canEdit = hasPermission('categorias-despesas', 'editar');
  const canDelete = hasPermission('categorias-despesas', 'excluir');

  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        setLoading(true);
        const data = await categoriasDespesasService.getAll();
        setCategorias(data);
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        setAlert({
          open: true,
          message: 'Erro ao carregar categorias. Por favor, tente novamente.',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchCategorias();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddOrEdit = async () => {
    // Verificar permissões antes de executar a ação
    if (editId && !canEdit) {
      setAlert({
        open: true,
        message: 'Você não tem permissão para editar categorias de despesas.',
        severity: 'error'
      });
      return;
    }
    
    if (!editId && !canCreate) {
      setAlert({
        open: true,
        message: 'Você não tem permissão para criar categorias de despesas.',
        severity: 'error'
      });
      return;
    }

    // Validar campos obrigatórios
    if (!form.nome || !form.tipo) {
      setAlert({
        open: true,
        message: 'Por favor, preencha todos os campos obrigatórios: Nome e Tipo.',
        severity: 'warning'
      });
      return;
    }
    
    try {
      setLoading(true);
      
      const dadosCompletos = {
        nome: form.nome.trim(),
        tipo: form.tipo as 'fixa' | 'diversa'
      };
      
      if (editId) {
        // Atualizar categoria existente
        const updated = await categoriasDespesasService.update(editId, dadosCompletos);
        
        if (updated) {
          setCategorias(categorias.map(c => c.id === editId ? updated : c));
          setAlert({
            open: true,
            message: 'Categoria atualizada com sucesso!',
            severity: 'success'
          });
        } else {
          throw new Error('Não foi possível atualizar a categoria');
        }
        setEditId(null);
      } else {
        // Criar nova categoria
        const created = await categoriasDespesasService.create(dadosCompletos);
        
        if (created) {
          setCategorias([...categorias, created]);
          setAlert({
            open: true,
            message: 'Categoria adicionada com sucesso!',
            severity: 'success'
          });
        } else {
          throw new Error('Não foi possível criar a categoria');
        }
      }
      
      // Limpar formulário após operação bem-sucedida
      setForm({});
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      setAlert({
        open: true,
        message: `Erro ao salvar categoria: ${error instanceof Error ? error.message : 'Erro desconhecido'}. Verifique se o banco de dados está configurado corretamente.`,
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
        message: 'Você não tem permissão para editar categorias de despesas.',
        severity: 'error'
      });
      return;
    }

    const categoria = categorias.find(c => c.id === id);
    if (categoria) {
      setForm(categoria);
      setEditId(id);
    }
  };

  const handleDeleteClick = (id: number) => {
    setCategoriaToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!categoriaToDelete) return;
    
    // Verificar permissão antes de executar a ação
    if (!canDelete) {
      setAlert({
        open: true,
        message: 'Você não tem permissão para excluir categorias de despesas.',
        severity: 'error'
      });
      return;
    }

    try {
      setLoading(true);
      
      // Tentar exclusão inteligente
      const resultado = await categoriasDespesasService.removerVinculacoesEExcluir(categoriaToDelete);
      
      if (resultado.success) {
        // Exclusão bem-sucedida
        setCategorias(categorias.filter(c => c.id !== categoriaToDelete));
        if (editId === categoriaToDelete) {
          setForm({});
          setEditId(null);
        }
        setAlert({
          open: true,
          message: resultado.message,
          severity: 'success'
        });
      } else {
        // Há despesas vinculadas - perguntar ao usuário
        const confirmarDesvinculacao = window.confirm(
          `${resultado.message}\n\nClique OK para desvincular as despesas e excluir a categoria, ou Cancelar para manter a categoria.`
        );
        
        if (confirmarDesvinculacao) {
          // Forçar exclusão com desvinculação
          const resultadoForcado = await categoriasDespesasService.forcarExclusaoComDesvinculacao(categoriaToDelete);
          
          if (resultadoForcado.success) {
            setCategorias(categorias.filter(c => c.id !== categoriaToDelete));
            if (editId === categoriaToDelete) {
              setForm({});
              setEditId(null);
            }
            setAlert({
              open: true,
              message: resultadoForcado.message,
              severity: 'success'
            });
          } else {
            setAlert({
              open: true,
              message: resultadoForcado.message,
              severity: 'error'
            });
          }
        }
      }
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      setAlert({
        open: true,
        message: 'Erro inesperado ao excluir categoria. Tente novamente.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setCategoriaToDelete(null);
    }
  };

  const handleCancel = () => {
    setForm({});
    setEditId(null);
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'fixa':
        return 'primary';
      case 'diversa':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'fixa':
        return 'Fixa';
      case 'diversa':
        return 'Diversa';
      default:
        return tipo;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Gerenciar Categorias de Despesas
      </Typography>
      
      {/* Mensagem informativa para usuários apenas com permissão de visualização */}
      {!canCreate && !canEdit && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Você tem apenas permissão de visualização para categorias de despesas. Não é possível criar, editar ou excluir registros.
        </Alert>
      )}
      
      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 3 }}>
          {/* Formulário */}
          <Box sx={{ flex: 1, maxWidth: { lg: '400px' } }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AddIcon />
                  {editId ? 'Editar Categoria' : 'Nova Categoria'}
                </Typography>
                
                <Stack spacing={3}>
                  <TextField
                    label="Nome da Categoria"
                    name="nome"
                    value={form.nome || ''}
                    onChange={handleChange}
                    fullWidth
                    required
                    placeholder="Ex: Alimentação, Transporte, Energia Elétrica..."
                  />
                  
                  <FormControl fullWidth required>
                    <InputLabel>Tipo</InputLabel>
                    <Select
                      name="tipo"
                      value={form.tipo || ''}
                      label="Tipo"
                      onChange={(e) => setForm(prev => ({ ...prev, tipo: e.target.value as 'fixa' | 'diversa' }))}
                    >
                      <MenuItem value="fixa">Fixa</MenuItem>
                      <MenuItem value="diversa">Diversa</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <Stack direction="row" spacing={2}>
                    {((editId && canEdit) || (!editId && canCreate)) && (
                      <Button
                        variant="contained"
                        onClick={handleAddOrEdit}
                        fullWidth
                        disabled={loading}
                      >
                        {editId ? 'Atualizar' : 'Adicionar'}
                      </Button>
                    )}
                    
                    {editId && (
                      <Button
                        variant="outlined"
                        onClick={handleCancel}
                        fullWidth
                      >
                        Cancelar
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Box>

          {/* Lista de Categorias */}
          <Box sx={{ flex: 2 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Categorias Cadastradas ({categorias.length})
                </Typography>
                
                {categorias.length === 0 ? (
                  <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
                    Nenhuma categoria cadastrada. Adicione a primeira categoria usando o formulário ao lado.
                  </Typography>
                ) : (
                  <List>
                    {categorias.map((categoria) => (
                      <ListItem
                        key={categoria.id}
                        sx={{
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          mb: 1,
                          backgroundColor: editId === categoria.id ? 'action.selected' : 'background.paper'
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle1" component="span">
                                {categoria.nome}
                              </Typography>
                              <Chip
                                label={getTipoLabel(categoria.tipo)}
                                color={getTipoColor(categoria.tipo) as any}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={
                            <Typography variant="caption" color="textSecondary">
                              Criada em: {categoria.created_at ? new Date(categoria.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                            </Typography>
                          }
                        />
                        <ListItemSecondaryAction>
                          {canEdit && (
                            <IconButton
                              edge="end"
                              aria-label="editar"
                              onClick={() => handleEdit(categoria.id)}
                              color="primary"
                              sx={{ mr: 1 }}
                            >
                              <EditIcon />
                            </IconButton>
                          )}
                          {canDelete && (
                            <IconButton
                              edge="end"
                              aria-label="excluir"
                              onClick={() => handleDeleteClick(categoria.id)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
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

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza de que deseja excluir esta categoria? Esta ação não pode ser desfeita.
            <br /><br />
            <strong>Atenção:</strong> Se existirem despesas vinculadas a esta categoria, a exclusão falhará.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para mensagens */}
      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={() => setAlert({ ...alert, open: false })}
      >
        <Alert 
          onClose={() => setAlert({ ...alert, open: false })} 
          severity={alert.severity}
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CategoriasDespesas; 