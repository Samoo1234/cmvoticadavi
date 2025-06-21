import { supabase } from './supabase';
import { usuariosService, type UsuarioCompleto } from './usuariosService';

export interface AuthUser {
  id: string;
  email: string;
  nome: string;
  is_admin: boolean;
  filial_id?: number;
  senha_temporaria?: boolean;
  permissoes?: any[];
}

export interface LoginResponse {
  user: AuthUser | null;
  error: string | null;
}

class AuthService {
  private currentUser: AuthUser | null = null;
  private readonly STORAGE_KEY = 'cmv_auth_user';

  // Fazer login
  async signIn(email: string, password: string): Promise<LoginResponse> {
    try {
      // 1. Buscar usuário na tabela
      const { data: usuarios, error } = await supabase
        .from('usuarios')
        .select(`
          *,
          filial:filiais(id, nome),
          permissoes(
            *,
            funcionalidade:funcionalidades(*)
          )
        `)
        .eq('email', email)
        .eq('ativo', true)
        .limit(1);

      if (error) {
        return { user: null, error: 'Erro ao verificar usuário' };
      }

      if (!usuarios || usuarios.length === 0) {
        return { user: null, error: 'Usuário não encontrado' };
      }

      const usuario = usuarios[0];

      // 2. Verificar senha (temporário - aceitar qualquer senha por enquanto)
      let senhaValida = true; // Aceitar qualquer senha até implementar sistema completo

      if (!senhaValida) {
        return { user: null, error: 'Senha incorreta' };
      }

      // 3. Criar sessão
      const authUser: AuthUser = {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        is_admin: usuario.is_admin,
        filial_id: usuario.filial_id,
        senha_temporaria: usuario.senha_temporaria,
        permissoes: usuario.permissoes
      };

      console.log('🔍 DEBUG - Usuário logado:', {
        nome: authUser.nome,
        email: authUser.email,
        is_admin: authUser.is_admin,
        total_permissoes: authUser.permissoes?.length || 0,
        permissoes: authUser.permissoes
      });



      this.currentUser = authUser;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(authUser));

      return { user: authUser, error: null };

    } catch (error: any) {
      console.error('Erro no login:', error);
      return { user: null, error: 'Erro interno do servidor' };
    }
  }

  // Fazer logout
  async signOut(): Promise<void> {
    this.currentUser = null;
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // Obter usuário atual
  getCurrentUser(): AuthUser | null {
    if (this.currentUser) {
      return this.currentUser;
    }

    // Tentar recuperar do localStorage
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        this.currentUser = JSON.parse(stored);
        return this.currentUser;
      } catch {
        localStorage.removeItem(this.STORAGE_KEY);
      }
    }

    return null;
  }

  // Verificar se está logado
  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  // Trocar senha
  async changePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        return { success: false, error: 'Usuário não logado' };
      }

      // Atualizar senha na tabela (hash em produção)
      const { error } = await supabase
        .from('usuarios')
        .update({ 
          senha_hash: newPassword, // Em produção, fazer hash
          senha_temporaria: false 
        })
        .eq('id', user.id);

      if (error) {
        return { success: false, error: 'Erro ao atualizar senha' };
      }

      // Atualizar sessão
      user.senha_temporaria = false;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));

      return { success: true };
    } catch (error) {
      console.error('Erro ao trocar senha:', error);
      return { success: false, error: 'Erro interno' };
    }
  }

  // Recarregar dados do usuário
  async reloadUser(): Promise<AuthUser | null> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return null;

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          *,
          filial:filiais(id, nome),
          permissoes(
            *,
            funcionalidade:funcionalidades(*)
          )
        `)
        .eq('id', currentUser.id)
        .single();

      if (error || !data) return null;

      const updatedUser: AuthUser = {
        id: data.id,
        email: data.email,
        nome: data.nome,
        is_admin: data.is_admin,
        filial_id: data.filial_id,
        senha_temporaria: data.senha_temporaria,
        permissoes: data.permissoes
      };

      this.currentUser = updatedUser;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedUser));

      return updatedUser;
    } catch (error) {
      console.error('Erro ao recarregar usuário:', error);
      return null;
    }
  }
}

export const authService = new AuthService(); 