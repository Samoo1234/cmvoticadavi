import { supabase } from './supabase';

export interface CategoriaDespesa {
  id: number;
  nome: string;
  tipo: 'fixa' | 'diversa';
  created_at?: string;
  updated_at?: string;
}

export interface Despesa {
  id: number;
  filial_id: number;
  categoria_id?: number;
  nome: string;
  valor: number;
  data_despesa?: string;
  data_pagamento?: string;
  forma_pagamento?: string;
  tipo_despesa: 'fixa' | 'variavel';
  periodicidade?: 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual';
  dia_vencimento?: number;
  data_vencimento?: string;  // Nova coluna para data completa de vencimento
  status: 'pendente' | 'pago' | 'ativo' | 'inativo';
  comprovante_url?: string;
  observacao?: string;
  created_at?: string;
  updated_at?: string;
  
  // Campos virtuais para exibição
  filial?: string;
  categoria?: string;
}

export interface DespesaCompleta extends Despesa {
  filial: string;
  categoria: string;
}

// Serviço para categorias de despesas
export const categoriasDespesasService = {

  async getAll(): Promise<CategoriaDespesa[]> {
    try {
      const { data, error } = await supabase
        .from('categorias_despesas')
        .select('*')
        .order('nome');

      if (error) {
        console.error('Erro ao buscar categorias de despesas:', error);
        return [];
      }

      // Filtrar apenas categorias com tipos válidos e corrigir dados antigos
      const categoriasValidas = (data || []).filter(categoria => {
        if (!['fixa', 'diversa'].includes(categoria.tipo)) {
          console.warn(`Categoria com tipo inválido encontrada: ${categoria.nome} (${categoria.tipo})`);
          return false;
        }
        return true;
      });

      return categoriasValidas;
    } catch (error) {
      console.error('Erro inesperado ao buscar categorias:', error);
      return [];
    }
  },

  async getByTipo(tipo: 'fixa' | 'diversa'): Promise<CategoriaDespesa[]> {
    const { data, error } = await supabase
      .from('categorias_despesas')
      .select('*')
      .eq('tipo', tipo)
      .order('nome');

    if (error) {
      console.error(`Erro ao buscar categorias de despesas do tipo ${tipo}:`, error);
      return [];
    }

    return data || [];
  },

  async create(categoria: Omit<CategoriaDespesa, 'id' | 'created_at' | 'updated_at'>): Promise<CategoriaDespesa | null> {
    try {
      // Validar o tipo antes de enviar para o banco
      if (!['fixa', 'diversa'].includes(categoria.tipo)) {
        console.error('Tipo de categoria inválido:', categoria.tipo);
        return null;
      }

      const { data, error } = await supabase
        .from('categorias_despesas')
        .insert([categoria])
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar categoria de despesa:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro inesperado ao criar categoria:', error);
      return null;
    }
  },

  async update(id: number, categoria: Partial<CategoriaDespesa>): Promise<CategoriaDespesa | null> {
    try {
      // Validar o tipo se estiver sendo atualizado
      if (categoria.tipo && !['fixa', 'diversa'].includes(categoria.tipo)) {
        console.error('Tipo de categoria inválido:', categoria.tipo);
        return null;
      }

      const { data, error } = await supabase
        .from('categorias_despesas')
        .update(categoria)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`Erro ao atualizar categoria de despesa ID ${id}:`, error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro inesperado ao atualizar categoria:', error);
      return null;
    }
  },

  async delete(id: number): Promise<boolean> {
    try {
      // Verificar se existem despesas vinculadas nas tabelas corretas
      const [despesasFixasResult, despesasDiversasResult] = await Promise.all([
        supabase
          .from('despesas_fixas')
          .select('id')
          .eq('categoria_id', id)
          .limit(1),
        supabase
          .from('despesas_diversas')
          .select('id')
          .eq('categoria_id', id)
          .limit(1)
      ]);

      const temDespesasFixas = despesasFixasResult.data && despesasFixasResult.data.length > 0;
      const temDespesasDiversas = despesasDiversasResult.data && despesasDiversasResult.data.length > 0;

      if (temDespesasFixas || temDespesasDiversas) {
        console.error(`Categoria ID ${id} não pode ser excluída pois tem despesas vinculadas`);
        return false;
      }

      // Se não há despesas vinculadas, pode excluir
      const { error } = await supabase
        .from('categorias_despesas')
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`Erro ao excluir categoria de despesa ID ${id}:`, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Erro inesperado ao excluir categoria ID ${id}:`, error);
      return false;
    }
  },

  // Nova função para verificar despesas vinculadas
  async verificarDespesasVinculadas(categoriaId: number): Promise<{ fixas: number; diversas: number }> {
    try {
      const [fixasResult, diversasResult] = await Promise.all([
        supabase
          .from('despesas_fixas')
          .select('id', { count: 'exact' })
          .eq('categoria_id', categoriaId),
        supabase
          .from('despesas_diversas')
          .select('id', { count: 'exact' })
          .eq('categoria_id', categoriaId)
      ]);

      return {
        fixas: fixasResult.count || 0,
        diversas: diversasResult.count || 0
      };
    } catch (error) {
      console.error('Erro ao verificar despesas vinculadas:', error);
      return { fixas: 0, diversas: 0 };
    }
  },

  // Função para remover vinculações e permitir exclusão
  async removerVinculacoesEExcluir(categoriaId: number): Promise<{ success: boolean; message: string }> {
    try {
      // Verificar quantas despesas estão vinculadas
      const vinculacoes = await this.verificarDespesasVinculadas(categoriaId);
      
      if (vinculacoes.fixas === 0 && vinculacoes.diversas === 0) {
        // Pode excluir normalmente
        const sucesso = await this.delete(categoriaId);
        return {
          success: sucesso,
          message: sucesso ? 'Categoria excluída com sucesso!' : 'Erro ao excluir categoria'
        };
      }

      // Perguntar ao usuário se quer remover as vinculações
      const mensagem = `Esta categoria tem ${vinculacoes.fixas} despesas fixas e ${vinculacoes.diversas} despesas diversas vinculadas. Deseja remover essas vinculações (as despesas não serão excluídas, apenas desvinculadas da categoria)?`;
      
      return {
        success: false,
        message: mensagem
      };
    } catch (error) {
      console.error('Erro ao processar exclusão:', error);
      return {
        success: false,
        message: 'Erro ao processar exclusão da categoria'
      };
    }
  },

  async forcarExclusaoComDesvinculacao(categoriaId: number): Promise<{ success: boolean; message: string }> {
    try {
      // Remover vinculações (setar categoria_id para null)
      await Promise.all([
        supabase
          .from('despesas_fixas')
          .update({ categoria_id: null })
          .eq('categoria_id', categoriaId),
        supabase
          .from('despesas_diversas')
          .update({ categoria_id: null })
          .eq('categoria_id', categoriaId)
      ]);

      // Agora excluir a categoria
      const sucesso = await this.delete(categoriaId);
      
      return {
        success: sucesso,
        message: sucesso 
          ? 'Categoria excluída com sucesso! As despesas foram desvinculadas.' 
          : 'Erro ao excluir categoria mesmo após desvinculação'
      };
    } catch (error) {
      console.error('Erro ao forçar exclusão:', error);
      return {
        success: false,
        message: 'Erro ao forçar exclusão da categoria'
      };
    }
  }
};

// Serviço principal para despesas - DEPRECIADO: usar despesasFixasService e despesasDiversasService
export const despesasService = {
  // DEPRECIADO - usar despesasFixasService.getAll() e despesasDiversasService.getAll()
  async getAll(): Promise<Despesa[]> {
    console.warn('despesasService.getAll() está depreciado. Use despesasFixasService e despesasDiversasService');
    return [];
  },

  // DEPRECIADO - usar despesasFixasService.getAllCompletas() e despesasDiversasService.getAllCompletas()
  async getAllCompletas(): Promise<DespesaCompleta[]> {
    console.warn('despesasService.getAllCompletas() está depreciado. Use despesasFixasService e despesasDiversasService');
    return [];
  },

  // TODOS OS MÉTODOS ABAIXO ESTÃO DEPRECIADOS
  // USE: despesasFixasService e despesasDiversasService

  async getByTipo(tipo: 'fixa' | 'variavel'): Promise<Despesa[]> {
    console.warn('despesasService.getByTipo() está depreciado. Use despesasFixasService ou despesasDiversasService');
    return [];
  },

  async getByTipoCompletas(tipo: 'fixa' | 'variavel'): Promise<DespesaCompleta[]> {
    console.warn('despesasService.getByTipoCompletas() está depreciado. Use despesasFixasService ou despesasDiversasService');
    return [];
  },

  async getByFilial(filialId: number): Promise<Despesa[]> {
    console.warn('despesasService.getByFilial() está depreciado. Use despesasFixasService e despesasDiversasService');
    return [];
  },

  async getByPeriodo(dataInicial: string, dataFinal: string): Promise<Despesa[]> {
    console.warn('despesasService.getByPeriodo() está depreciado. Use despesasDiversasService.getByPeriodo()');
    return [];
  },

  async getByPeriodoCompletas(dataInicial: string, dataFinal: string): Promise<DespesaCompleta[]> {
    console.warn('despesasService.getByPeriodoCompletas() está depreciado. Use despesasDiversasService.getByPeriodoCompletas()');
    return [];
  },

  async getByFilialEPeriodo(filialId: number, dataInicial: string, dataFinal: string): Promise<Despesa[]> {
    console.warn('despesasService.getByFilialEPeriodo() está depreciado. Use despesasFixasService e despesasDiversasService');
    return [];
  },

  async create(despesa: Omit<Despesa, 'id' | 'created_at' | 'updated_at'>): Promise<Despesa | null> {
    console.warn('despesasService.create() está depreciado. Use despesasFixasService.create() ou despesasDiversasService.create()');
    return null;
  },

  async update(id: number, despesa: Partial<Despesa>): Promise<Despesa | null> {
    console.warn('despesasService.update() está depreciado. Use despesasFixasService.update() ou despesasDiversasService.update()');
    return null;
  },

  async marcarComoPago(id: number, dataPagamento: string, formaPagamento?: string): Promise<Despesa | null> {
    console.warn('despesasService.marcarComoPago() está depreciado. Use despesasDiversasService.marcarComoPago()');
    return null;
  },

  async atualizarStatus(id: number, status: 'pendente' | 'pago' | 'ativo' | 'inativo'): Promise<Despesa | null> {
    console.warn('despesasService.atualizarStatus() está depreciado. Use despesasFixasService ou despesasDiversasService');
    return null;
  },

  async delete(id: number): Promise<boolean> {
    console.warn('despesasService.delete() está depreciado. Use despesasFixasService.delete() ou despesasDiversasService.delete()');
    return false;
  },

  // Método para compatibilidade com outras páginas
  async getCategorias(): Promise<CategoriaDespesa[]> {
    return categoriasDespesasService.getAll();
  },

  // Métodos específicos para cada tipo de despesa
  async getCategoriasFixas(): Promise<CategoriaDespesa[]> {
    const todasCategorias = await categoriasDespesasService.getAll();
    return todasCategorias.filter(cat => cat.tipo === 'fixa');
  },

  async getCategoriasDiversas(): Promise<CategoriaDespesa[]> {
    const todasCategorias = await categoriasDespesasService.getAll();
    return todasCategorias.filter(cat => cat.tipo === 'diversa');
  }
};
