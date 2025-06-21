import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

// ============================================
// INTERFACES
// ============================================

export interface Usuario {
  id?: string;
  auth_user_id?: string;
  nome: string;
  email: string;
  filial_id?: number;
  is_admin: boolean;
  ativo: boolean;
  senha_temporaria?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Funcionalidade {
  id: number;
  nome: string;
  descricao?: string;
  rota?: string;
  icone?: string;
  ordem: number;
  ativo: boolean;
}

export interface Permissao {
  id?: string;
  usuario_id: string;
  funcionalidade_id: number;
  pode_ver: boolean;
  pode_criar: boolean;
  pode_editar: boolean;
  pode_excluir: boolean;
  funcionalidade?: Funcionalidade;
}

export interface UsuarioCompleto extends Usuario {
  permissoes?: Permissao[];
  filial?: {
    id: number;
    nome: string;
  };
}

// ============================================
// SERVICE DE USUÁRIOS
// ============================================

export const usuariosService = {
  
  // Buscar todos os usuários (apenas admins)
  async getAll(): Promise<UsuarioCompleto[]> {
    const { data, error } = await supabase
      .from('usuarios')
      .select(`
        *,
        filial:filiais(id, nome)
      `)
      .order('nome');
    
    if (error) {
      console.error('Erro ao buscar usuários:', error);
      throw new Error(error.message);
    }
    
    return data || [];
  },

  // Buscar usuário por ID
  async getById(id: string): Promise<UsuarioCompleto | null> {
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
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Erro ao buscar usuário ${id}:`, error);
      return null;
    }
    
    return data;
  },

  // Buscar usuário pelo auth_user_id (usuário logado)
  async getByAuthUserId(authUserId: string): Promise<UsuarioCompleto | null> {
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
        .eq('auth_user_id', authUserId)
        .single();
      
      if (error) {
        // Se a tabela não existe (código 42P01), retorna null sem erro
        if (error.code === '42P01') {
          console.log('Tabela usuarios ainda não foi criada. Execute o script SQL.');
          return null;
        }
        throw error;
      }
      
      return data;
    } catch (error: any) {
      console.error(`Erro ao buscar usuário por auth_user_id ${authUserId}:`, error);
      throw error;
    }
  },

    // Criar usuário na tabela (sistema próprio)
  async create(usuario: Omit<Usuario, 'id' | 'created_at' | 'updated_at'>, senhaTemporaria: string): Promise<Usuario> {
    try {
      // Criar registro na tabela usuarios
      const { data, error } = await supabase
        .from('usuarios')
        .insert({
          nome: usuario.nome,
          email: usuario.email,
          filial_id: usuario.filial_id,
          is_admin: usuario.is_admin,
          ativo: usuario.ativo,
          senha_temporaria: true
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Erro ao criar usuário: ${error.message}`);
      }

      // Sucesso!
      alert(`✅ USUÁRIO CRIADO COM SUCESSO!\n\n` +
            `👤 Nome: ${usuario.nome}\n` +
            `📧 Email: ${usuario.email}\n` +
            `🔑 Senha: ${senhaTemporaria}\n\n` +
            `🎉 PRONTO PARA USAR!\n` +
            `O usuário já pode fazer login!`);

      return data;
    } catch (error: any) {
      throw new Error(`Falha ao criar usuário: ${error.message}`);
    }
  },

  // Atualizar usuário
  async update(id: string, usuario: Partial<Omit<Usuario, 'id' | 'auth_user_id' | 'created_at' | 'updated_at'>>): Promise<Usuario | null> {
    const { data, error } = await supabase
      .from('usuarios')
      .update(usuario)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Erro ao atualizar usuário ${id}:`, error);
      throw new Error(error.message);
    }
    
    return data;
  },

  // Deletar usuário (versão simplificada)
  async delete(id: string): Promise<boolean> {
    try {
      // Deletar apenas da tabela usuarios
      const { error } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Erro ao deletar usuário: ${error.message}`);
      }

      return true;
    } catch (error: any) {
      console.error(`Erro ao deletar usuário ${id}:`, error);
      throw new Error(error.message);
    }
  },

  // Marcar senha como não temporária (após troca)
  async marcarSenhaTrocada(authUserId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ senha_temporaria: false })
        .eq('auth_user_id', authUserId);

      if (error) {
        throw new Error(error.message);
      }

      return true;
    } catch (error: any) {
      console.error('Erro ao marcar senha como trocada:', error);
      return false;
    }
  }
};

// ============================================
// SERVICE DE FUNCIONALIDADES
// ============================================

export const funcionalidadesService = {
  
  // Buscar todas as funcionalidades
  async getAll(): Promise<Funcionalidade[]> {
    const { data, error } = await supabase
      .from('funcionalidades')
      .select('*')
      .eq('ativo', true)
      .order('ordem');
    
    if (error) {
      console.error('Erro ao buscar funcionalidades:', error);
      throw new Error(error.message);
    }
    
    return data || [];
  }
};

// ============================================
// SERVICE DE PERMISSÕES
// ============================================

export const permissoesService = {
  
  // Buscar permissões do usuário
  async getByUsuarioId(usuarioId: string): Promise<Permissao[]> {
    const { data, error } = await supabase
      .from('permissoes')
      .select(`
        *,
        funcionalidade:funcionalidades(*)
      `)
      .eq('usuario_id', usuarioId);
    
    if (error) {
      console.error(`Erro ao buscar permissões do usuário ${usuarioId}:`, error);
      return [];
    }
    
    return data || [];
  },

  // Salvar permissões do usuário (substitui todas)
  async savePermissoes(usuarioId: string, permissoes: Omit<Permissao, 'id' | 'usuario_id'>[]): Promise<boolean> {
    try {
      // 1. Deletar permissões existentes
      await supabase
        .from('permissoes')
        .delete()
        .eq('usuario_id', usuarioId);

      // 2. Inserir novas permissões
      if (permissoes.length > 0) {
        const permissoesParaInserir = permissoes.map(p => ({
          usuario_id: usuarioId,
          funcionalidade_id: p.funcionalidade_id,
          pode_ver: p.pode_ver,
          pode_criar: p.pode_criar,
          pode_editar: p.pode_editar,
          pode_excluir: p.pode_excluir
        }));

        const { error } = await supabase
          .from('permissoes')
          .insert(permissoesParaInserir);

        if (error) {
          throw new Error(error.message);
        }
      }

      return true;
    } catch (error: any) {
      console.error(`Erro ao salvar permissões do usuário ${usuarioId}:`, error);
      throw new Error(error.message);
    }
  },

  // Verificar se usuário tem permissão específica
  async verificarPermissao(usuarioId: string, funcionalidadeRota: string, acao: 'ver' | 'criar' | 'editar' | 'excluir'): Promise<boolean> {
    const { data, error } = await supabase
      .from('permissoes')
      .select(`
        *,
        funcionalidade:funcionalidades(rota)
      `)
      .eq('usuario_id', usuarioId)
      .eq('funcionalidade.rota', funcionalidadeRota)
      .single();

    if (error || !data) {
      return false;
    }

    switch (acao) {
      case 'ver': return data.pode_ver;
      case 'criar': return data.pode_criar;
      case 'editar': return data.pode_editar;
      case 'excluir': return data.pode_excluir;
      default: return false;
    }
  }
}; 