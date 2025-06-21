import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { authService, type AuthUser } from '../services/authService';
import { createFallbackUser } from '../utils/authFallback';

interface AuthContextType {
  user: AuthUser | null;
  supabaseUser: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  hasPermission: (rota: string, acao: 'ver' | 'criar' | 'editar' | 'excluir') => boolean;
  temSenhaTemporaria: boolean;
  trocarSenha: (novaSenha: string) => Promise<{ error: string | null }>;
  reloadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Primeiro verificar nosso sistema próprio
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setLoading(false);
    } else {
      // 2. Se não tem nosso usuário, verificar sessão do Supabase (para admins antigos)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setSupabaseUser(session.user);
          // Criar usuário fallback para admin apenas se for admin de verdade
          if (createFallbackUser(session.user).is_admin) {
            const fallbackUser = createFallbackUser(session.user);
            setUser(fallbackUser as AuthUser);
          }
        }
        setLoading(false);
      });
    }

    // Listener para mudanças do Supabase Auth (só para admins reais)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setSupabaseUser(session.user);
          // Só usar fallback se for admin real E não temos usuário do nosso sistema
          const currentUser = authService.getCurrentUser();
          if (!currentUser && createFallbackUser(session.user).is_admin) {
            const fallbackUser = createFallbackUser(session.user);
            setUser(fallbackUser as AuthUser);
          }
        } else {
          setSupabaseUser(null);
          // Manter usuário do nosso sistema se existir
          const currentUser = authService.getCurrentUser();
          setUser(currentUser);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      // 1. Primeiro tentar nosso sistema próprio
      const result = await authService.signIn(email, password);
      
      if (result.user) {
        setUser(result.user);
        return { error: null };
      }
      
      // 2. Se falhar, tentar Supabase Auth (para admins existentes)
      const { error: supabaseError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (!supabaseError) {
        // Login via Supabase funcionou, será capturado pelo listener
        return { error: null };
      }
      
      // 3. Se ambos falharam
      return { error: result.error || 'Email ou senha incorretos' };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await authService.signOut();
    await supabase.auth.signOut();
    setUser(null);
    setSupabaseUser(null);
  };

  const trocarSenha = async (novaSenha: string) => {
    try {
      const result = await authService.changePassword(novaSenha);
      
      if (result.success) {
        // Recarregar dados do usuário
        await reloadUser();
        return { error: null };
      } else {
        return { error: result.error || 'Erro ao trocar senha' };
      }
    } catch (error: any) {
      return { error: 'Erro interno ao trocar senha' };
    }
  };

  const reloadUser = async () => {
    const updatedUser = await authService.reloadUser();
    if (updatedUser) {
      setUser(updatedUser);
    }
  };

  const hasPermission = (rota: string, acao: 'ver' | 'criar' | 'editar' | 'excluir'): boolean => {
    // Se é admin, tem todas as permissões
    if (user?.is_admin) return true;
    
    // Se não tem usuário ou permissões, não tem acesso
    if (!user?.permissoes) return false;
    
    // Buscar a permissão específica
    const permissao = user.permissoes.find((p: any) => p.funcionalidade?.rota === rota);
    if (!permissao) return false;
    
    switch (acao) {
      case 'ver': return permissao.pode_ver;
      case 'criar': return permissao.pode_criar;
      case 'editar': return permissao.pode_editar;
      case 'excluir': return permissao.pode_excluir;
      default: return false;
    }
  };

  const value = {
    user,
    supabaseUser,
    loading,
    signIn,
    signOut,
    isAdmin: user?.is_admin === true,
    hasPermission,
    temSenhaTemporaria: user?.senha_temporaria || false,
    trocarSenha,
    reloadUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 