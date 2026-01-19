import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  IconButton,
  Alert,
  Snackbar,
  Chip,
  Card,
  CardContent,
  FormGroup,
  Checkbox,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Security as SecurityIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  VpnKey as VpnKeyIcon
} from '@mui/icons-material';
import {
  usuariosService,
  funcionalidadesService,
  permissoesService,
  type Usuario,
  type UsuarioCompleto,
  type Funcionalidade,
  type Permissao
} from '../services/usuariosService';
import { filiaisService, type Filial } from '../services/filiaisService';

const GerenciarUsuarios: React.FC = () => {
  const [usuarios, setUsuarios] = useState<UsuarioCompleto[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [funcionalidades, setFuncionalidades] = useState<Funcionalidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [permissoesDialogOpen, setPermissoesDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioCompleto | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<UsuarioCompleto | null>(null);
  const [novaSenhaTemporaria, setNovaSenhaTemporaria] = useState('Temp123!');
  const [tabelasExistem, setTabelasExistem] = useState(true);

  // Form state
  const [form, setForm] = useState({
    nome: '',
    email: '',
    filial_id: '',
    is_admin: false,
    ativo: true,
    senha_temporaria: 'Temp123!'
  });

  // Permissões state
  const [permissoes, setPermissoes] = useState<Record<number, {
    pode_ver: boolean;
    pode_criar: boolean;
    pode_editar: boolean;
    pode_excluir: boolean;
  }>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usuariosData, filiaisData, funcionalidadesData] = await Promise.all([
        usuariosService.getAll(),
        filiaisService.getAll(),
        funcionalidadesService.getAll()
      ]);

      setUsuarios(usuariosData);
      setFiliais(filiaisData);
      setFuncionalidades(funcionalidadesData);
    } catch (err: any) {
      // Verificar se é erro de tabela não existente
      if (err.message.includes('42P01') || err.message.includes('relation') || err.message.includes('table')) {
        setTabelasExistem(false);
        setError('');
      } else {
        setError('Erro ao carregar dados: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!form.nome || !form.email) {
        setError('Nome e email são obrigatórios');
        return;
      }

      const usuario: Omit<Usuario, 'id' | 'created_at' | 'updated_at'> = {
        nome: form.nome,
        email: form.email,
        filial_id: form.filial_id ? parseInt(form.filial_id) : undefined,
        is_admin: form.is_admin,
        ativo: form.ativo
      };

      if (editingUser) {
        await usuariosService.update(editingUser.id!, usuario);
        setSuccess('Usuário atualizado com sucesso!');
      } else {
        await usuariosService.create(usuario, form.senha_temporaria);
        setSuccess('Usuário criado com sucesso!');
      }

      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (usuario: UsuarioCompleto) => {
    setEditingUser(usuario);
    setForm({
      nome: usuario.nome,
      email: usuario.email,
      filial_id: usuario.filial_id?.toString() || '',
      is_admin: usuario.is_admin,
      ativo: usuario.ativo,
      senha_temporaria: 'Temp123!'
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;

    try {
      await usuariosService.delete(id);
      setSuccess('Usuário excluído com sucesso!');
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEditPermissions = async (usuario: UsuarioCompleto) => {
    setEditingUser(usuario);

    // Carregar permissões do usuário
    try {
      const permissoesUsuario = await permissoesService.getByUsuarioId(usuario.id!);

      // Converter para formato do state
      const permissoesMap: Record<number, any> = {};
      funcionalidades.forEach(func => {
        const permissao = permissoesUsuario.find(p => p.funcionalidade_id === func.id);
        permissoesMap[func.id] = {
          pode_ver: permissao?.pode_ver || false,
          pode_criar: permissao?.pode_criar || false,
          pode_editar: permissao?.pode_editar || false,
          pode_excluir: permissao?.pode_excluir || false
        };
      });

      setPermissoes(permissoesMap);
      setPermissoesDialogOpen(true);
    } catch (err: any) {
      setError('Erro ao carregar permissões: ' + err.message);
    }
  };

  const handleSavePermissions = async () => {
    if (!editingUser) return;

    try {
      const permissoesArray = Object.entries(permissoes).map(([funcId, perms]) => ({
        funcionalidade_id: parseInt(funcId),
        pode_ver: perms.pode_ver,
        pode_criar: perms.pode_criar,
        pode_editar: perms.pode_editar,
        pode_excluir: perms.pode_excluir
      }));

      await permissoesService.savePermissoes(editingUser.id!, permissoesArray);
      setSuccess('Permissões salvas com sucesso!');
      setPermissoesDialogOpen(false);
      loadData();
    } catch (err: any) {
      setError('Erro ao salvar permissões: ' + err.message);
    }
  };

  const updatePermission = (funcId: number, tipo: string, valor: boolean) => {
    setPermissoes(prev => ({
      ...prev,
      [funcId]: {
        ...prev[funcId],
        [tipo]: valor
      }
    }));
  };

  const toggleAllPermissions = (funcId: number, enabled: boolean) => {
    setPermissoes(prev => ({
      ...prev,
      [funcId]: {
        pode_ver: enabled,
        pode_criar: enabled,
        pode_editar: enabled,
        pode_excluir: enabled
      }
    }));
  };

  const resetForm = () => {
    setForm({
      nome: '',
      email: '',
      filial_id: '',
      is_admin: false,
      ativo: true,
      senha_temporaria: 'Temp123!'
    });
    setEditingUser(null);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const handleOpenResetPassword = (usuario: UsuarioCompleto) => {
    setResetPasswordUser(usuario);
    setNovaSenhaTemporaria('Temp123!');
    setResetPasswordDialogOpen(true);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser) return;

    try {
      const result = await usuariosService.resetPassword(resetPasswordUser.id!, novaSenhaTemporaria);

      if (result.success) {
        setSuccess(`✅ Senha redefinida com sucesso!\n\n👤 Usuário: ${resetPasswordUser.nome}\n🔑 Nova senha: ${novaSenhaTemporaria}\n\nO usuário será obrigado a trocar a senha no próximo login.`);
        setResetPasswordDialogOpen(false);
        setResetPasswordUser(null);
      } else {
        setError(result.error || 'Erro ao redefinir senha');
      }
    } catch (err: any) {
      setError('Erro ao redefinir senha: ' + err.message);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Carregando usuários...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Gerenciar Usuários
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          disabled={!tabelasExistem}
        >
          Novo Usuário
        </Button>
      </Box>

      {!tabelasExistem && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>Sistema de Usuários não Configurado</Typography>
          <Typography variant="body2" paragraph>
            As tabelas de usuários ainda não foram criadas no banco de dados. Para ativar o sistema completo de gerenciamento de usuários:
          </Typography>
          <Typography variant="body2" component="ol" sx={{ pl: 2 }}>
            <li>Execute o script <code>scripts/create_auth_system.sql</code> no Supabase SQL Editor</li>
            <li>Execute o script <code>scripts/create_admin_user.sql</code> (ajuste seu email e UUID)</li>
            <li>Recarregue a página</li>
          </Typography>
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Filial</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {usuarios.map((usuario) => (
              <TableRow key={usuario.id}>
                <TableCell>{usuario.nome}</TableCell>
                <TableCell>{usuario.email}</TableCell>
                <TableCell>{usuario.filial?.nome || '-'}</TableCell>
                <TableCell>
                  {usuario.is_admin ? (
                    <Chip icon={<AdminIcon />} label="Admin" color="primary" size="small" />
                  ) : (
                    <Chip icon={<PersonIcon />} label="Usuário" color="default" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={usuario.ativo ? 'Ativo' : 'Inativo'}
                    color={usuario.ativo ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Editar usuário">
                    <IconButton onClick={() => handleEdit(usuario)} size="small">
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Gerenciar permissões">
                    <IconButton
                      onClick={() => handleEditPermissions(usuario)}
                      size="small"
                      disabled={usuario.is_admin}
                    >
                      <SecurityIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Redefinir senha">
                    <IconButton
                      onClick={() => handleOpenResetPassword(usuario)}
                      size="small"
                      color="warning"
                    >
                      <VpnKeyIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Excluir usuário">
                    <IconButton
                      onClick={() => handleDelete(usuario.id!)}
                      size="small"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog de Usuário */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Nome"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              disabled={!!editingUser}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Filial</InputLabel>
              <Select
                value={form.filial_id}
                label="Filial"
                onChange={(e) => setForm({ ...form, filial_id: e.target.value })}
              >
                <MenuItem value="">Nenhuma</MenuItem>
                {filiais.map((filial) => (
                  <MenuItem key={filial.id} value={filial.id?.toString()}>
                    {filial.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Campo senha temporária apenas para novos usuários */}
            {!editingUser && (
              <TextField
                fullWidth
                label="Senha Temporária"
                value={form.senha_temporaria}
                onChange={(e) => setForm({ ...form, senha_temporaria: e.target.value })}
                sx={{ mb: 2 }}
                helperText="O usuário será obrigado a trocar esta senha no primeiro login"
              />
            )}

            <Box display="flex" gap={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.is_admin}
                    onChange={(e) => setForm({ ...form, is_admin: e.target.checked })}
                  />
                }
                label="Administrador"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.ativo}
                    onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                  />
                }
                label="Ativo"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingUser ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Permissões */}
      <Dialog
        open={permissoesDialogOpen}
        onClose={() => setPermissoesDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Permissões - {editingUser?.nome}
            </Typography>
            <IconButton onClick={() => setPermissoesDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            {funcionalidades.map((func) => (
              <Box key={func.id} sx={{ mb: 2 }}>
                <Card variant="outlined">
                  <CardContent sx={{ pb: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6">{func.nome}</Typography>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={permissoes[func.id]?.pode_ver && permissoes[func.id]?.pode_criar && permissoes[func.id]?.pode_editar && permissoes[func.id]?.pode_excluir}
                            onChange={(e) => toggleAllPermissions(func.id, e.target.checked)}
                          />
                        }
                        label="Todos"
                      />
                    </Box>
                    <FormGroup row>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={permissoes[func.id]?.pode_ver || false}
                            onChange={(e) => updatePermission(func.id, 'pode_ver', e.target.checked)}
                          />
                        }
                        label="Ver"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={permissoes[func.id]?.pode_criar || false}
                            onChange={(e) => updatePermission(func.id, 'pode_criar', e.target.checked)}
                          />
                        }
                        label="Criar"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={permissoes[func.id]?.pode_editar || false}
                            onChange={(e) => updatePermission(func.id, 'pode_editar', e.target.checked)}
                          />
                        }
                        label="Editar"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={permissoes[func.id]?.pode_excluir || false}
                            onChange={(e) => updatePermission(func.id, 'pode_excluir', e.target.checked)}
                          />
                        }
                        label="Excluir"
                      />
                    </FormGroup>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermissoesDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleSavePermissions} variant="contained">
            Salvar Permissões
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Redefinir Senha */}
      <Dialog
        open={resetPasswordDialogOpen}
        onClose={() => setResetPasswordDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          🔑 Redefinir Senha
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Alert severity="warning" sx={{ mb: 3 }}>
              Você está prestes a redefinir a senha do usuário <strong>{resetPasswordUser?.nome}</strong>.
              <br />
              O usuário será obrigado a trocar a senha no próximo login.
            </Alert>

            <TextField
              fullWidth
              label="Nova Senha Temporária"
              value={novaSenhaTemporaria}
              onChange={(e) => setNovaSenhaTemporaria(e.target.value)}
              helperText="Esta senha será informada ao usuário para que ele possa fazer login"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetPasswordDialogOpen(false)}>Cancelar</Button>
          <Button
            onClick={handleResetPassword}
            variant="contained"
            color="warning"
            disabled={!novaSenhaTemporaria}
          >
            Redefinir Senha
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbars */}
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}>
        <Alert onClose={() => setError('')} severity="error">
          {error}
        </Alert>
      </Snackbar>

      <Snackbar open={!!success} autoHideDuration={6000} onClose={() => setSuccess('')}>
        <Alert onClose={() => setSuccess('')} severity="success">
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default GerenciarUsuarios; 