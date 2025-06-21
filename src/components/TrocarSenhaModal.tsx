import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  IconButton,
  InputAdornment,
  Alert
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface TrocarSenhaModalProps {
  open: boolean;
}

const TrocarSenhaModal: React.FC<TrocarSenhaModalProps> = ({ open }) => {
  const { trocarSenha } = useAuth();
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const validarSenha = (senha: string): string | null => {
    if (senha.length < 6) {
      return 'A senha deve ter pelo menos 6 caracteres';
    }
    if (!/(?=.*[a-z])/.test(senha)) {
      return 'A senha deve conter pelo menos uma letra minúscula';
    }
    if (!/(?=.*[A-Z])/.test(senha)) {
      return 'A senha deve conter pelo menos uma letra maiúscula';
    }
    if (!/(?=.*\d)/.test(senha)) {
      return 'A senha deve conter pelo menos um número';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    // Validações
    const erroValidacao = validarSenha(novaSenha);
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErro('As senhas não coincidem');
      return;
    }

    setCarregando(true);

    try {
      const { error } = await trocarSenha(novaSenha);
      
      if (error) {
        setErro(typeof error === 'string' ? error : (error as any)?.message || 'Erro desconhecido');
      } else {
        // Sucesso - o modal será fechado automaticamente quando temSenhaTemporaria mudar
        setNovaSenha('');
        setConfirmarSenha('');
      }
    } catch (error: any) {
      setErro('Erro ao alterar senha: ' + (error?.message || 'Erro inesperado'));
    } finally {
      setCarregando(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      maxWidth="sm" 
      fullWidth
      disableEscapeKeyDown
      onClose={() => {}} // Não permite fechar
    >
      <DialogTitle>
        <Typography variant="h6" component="div">
          Alterar Senha Temporária
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Sua senha atual é temporária. Por favor, defina uma nova senha para continuar.
        </Typography>
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {erro && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {erro}
            </Alert>
          )}

          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Nova Senha"
              type={mostrarSenha ? 'text' : 'password'}
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                      edge="end"
                    >
                      {mostrarSenha ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Confirmar Nova Senha"
              type={mostrarSenha ? 'text' : 'password'}
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              required
            />
          </Box>

          <Typography variant="body2" color="text.secondary">
            <strong>Requisitos da senha:</strong>
            <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
              <li>Mínimo 6 caracteres</li>
              <li>Pelo menos uma letra minúscula</li>
              <li>Pelo menos uma letra maiúscula</li>
              <li>Pelo menos um número</li>
            </ul>
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button
            type="submit"
            variant="contained"
            disabled={carregando || !novaSenha || !confirmarSenha}
            sx={{ minWidth: 120 }}
          >
            {carregando ? 'Alterando...' : 'Alterar Senha'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TrocarSenhaModal; 