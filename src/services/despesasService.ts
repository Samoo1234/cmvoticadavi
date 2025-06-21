import { supabase } from './supabase';

export interface CategoriaDespesa {
  id: number;
  nome: string;
  tipo: 'fixa' | 'variavel' | 'ambos';
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
    const { data, error } = await supabase
      .from('categorias_despesas')
      .select('*')
      .order('nome');

    if (error) {
      console.error('Erro ao buscar categorias de despesas:', error);
      return [];
    }

    return data || [];
  },

  async getByTipo(tipo: 'fixa' | 'variavel' | 'ambos'): Promise<CategoriaDespesa[]> {
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
  },

  async update(id: number, categoria: Partial<CategoriaDespesa>): Promise<CategoriaDespesa | null> {
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
  },

  async delete(id: number): Promise<boolean> {
    const { error } = await supabase
      .from('categorias_despesas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Erro ao excluir categoria de despesa ID ${id}:`, error);
      return false;
    }

    return true;
  }
};

// Serviço principal para despesas
export const despesasService = {
  async getAll(): Promise<Despesa[]> {
    const { data, error } = await supabase
      .from('despesas')
      .select('*')
      .order('data_despesa', { ascending: false });

    if (error) {
      console.error('Erro ao buscar despesas:', error);
      return [];
    }

    return data || [];
  },

  async getAllCompletas(): Promise<DespesaCompleta[]> {
    const { data, error } = await supabase
      .from('despesas')
      .select(`
        *,
        filiais (nome),
        categorias_despesas (nome, tipo)
      `)
      .order('data_despesa', { ascending: false });

    if (error) {
      console.error('Erro ao buscar despesas completas:', error);
      return [];
    }

    // Mapear os dados para o formato esperado
    const despesasCompletas = data?.map(item => ({
      ...item,
      filial: item.filiais?.nome || 'Não especificado',
      categoria: item.categorias_despesas?.nome || 'Não categorizado'
    })) || [];

    return despesasCompletas;
  },

  async getByTipo(tipo: 'fixa' | 'variavel'): Promise<Despesa[]> {
    const { data, error } = await supabase
      .from('despesas')
      .select('*')
      .eq('tipo_despesa', tipo)
      .order('data_despesa', { ascending: false });

    if (error) {
      console.error(`Erro ao buscar despesas do tipo ${tipo}:`, error);
      return [];
    }

    return data || [];
  },

  async getByTipoCompletas(tipo: 'fixa' | 'variavel'): Promise<DespesaCompleta[]> {
    const { data, error } = await supabase
      .from('despesas')
      .select(`
        *,
        filiais (nome),
        categorias_despesas (nome, tipo)
      `)
      .eq('tipo_despesa', tipo)
      .order('data_despesa', { ascending: false });

    if (error) {
      console.error(`Erro ao buscar despesas completas do tipo ${tipo}:`, error);
      return [];
    }

    // Mapear os dados para o formato esperado
    const despesasCompletas = data?.map(item => ({
      ...item,
      filial: item.filiais?.nome || 'Não especificado',
      categoria: item.categorias_despesas?.nome || 'Não categorizado'
    })) || [];

    return despesasCompletas;
  },

  async getByFilial(filialId: number): Promise<Despesa[]> {
    const { data, error } = await supabase
      .from('despesas')
      .select('*')
      .eq('filial_id', filialId)
      .order('data_despesa', { ascending: false });

    if (error) {
      console.error(`Erro ao buscar despesas da filial ID ${filialId}:`, error);
      return [];
    }

    return data || [];
  },

  async getByPeriodo(dataInicial: string, dataFinal: string): Promise<Despesa[]> {
    const { data, error } = await supabase
      .from('despesas')
      .select('*')
      .gte('data_despesa', dataInicial)
      .lte('data_despesa', dataFinal)
      .order('data_despesa', { ascending: false });

    if (error) {
      console.error(`Erro ao buscar despesas no período de ${dataInicial} a ${dataFinal}:`, error);
      return [];
    }

    return data || [];
  },

  async getByPeriodoCompletas(dataInicial: string, dataFinal: string): Promise<DespesaCompleta[]> {
    // Buscar todas as despesas (fixas e variáveis no período)
    const { data, error } = await supabase
      .from('despesas')
      .select(`
        *,
        filiais (nome),
        categorias_despesas (nome, tipo)
      `)
      .or(`tipo_despesa.eq.fixa,and(tipo_despesa.eq.variavel,data_despesa.gte.${dataInicial},data_despesa.lte.${dataFinal})`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Erro ao buscar despesas completas no período de ${dataInicial} a ${dataFinal}:`, error);
      return [];
    }

    // Mapear os dados para o formato esperado
    const despesasCompletas = data?.map(item => ({
      ...item,
      filial: item.filiais?.nome || 'Não especificado',
      categoria: item.categorias_despesas?.nome || 'Não categorizado'
    })) || [];

    return despesasCompletas;
  },

  async getByFilialEPeriodo(filialId: number, dataInicial: string, dataFinal: string): Promise<Despesa[]> {
    const { data, error } = await supabase
      .from('despesas')
      .select('*')
      .eq('filial_id', filialId)
      .gte('data_despesa', dataInicial)
      .lte('data_despesa', dataFinal)
      .order('data_despesa', { ascending: false });

    if (error) {
      console.error(`Erro ao buscar despesas da filial ID ${filialId} no período de ${dataInicial} a ${dataFinal}:`, error);
      return [];
    }

    return data || [];
  },

  async create(despesa: Omit<Despesa, 'id' | 'created_at' | 'updated_at'>): Promise<Despesa | null> {
    const { data, error } = await supabase
      .from('despesas')
      .insert([despesa])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar despesa:', error);
      return null;
    }

    return data;
  },

  async update(id: number, despesa: Partial<Despesa>): Promise<Despesa | null> {
    const { data, error } = await supabase
      .from('despesas')
      .update(despesa)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Erro ao atualizar despesa ID ${id}:`, error);
      return null;
    }

    return data;
  },
  
  // Já existe um método marcarComoPago mais completo abaixo

  async marcarComoPago(id: number, dataPagamento: string, formaPagamento?: string): Promise<Despesa | null> {
    const { data, error } = await supabase
      .from('despesas')
      .update({
        status: 'pago',
        data_pagamento: dataPagamento,
        ...(formaPagamento && { forma_pagamento: formaPagamento })
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Erro ao marcar despesa ID ${id} como paga:`, error);
      return null;
    }

    return data;
  },

  async atualizarStatus(id: number, status: 'pendente' | 'pago' | 'ativo' | 'inativo'): Promise<Despesa | null> {
    const { data, error } = await supabase
      .from('despesas')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Erro ao atualizar status da despesa ID ${id} para ${status}:`, error);
      return null;
    }

    return data;
  },

  async delete(id: number): Promise<boolean> {
    const { error } = await supabase
      .from('despesas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Erro ao excluir despesa ID ${id}:`, error);
      return false;
    }

    return true;
  },

  // Método para compatibilidade com outras páginas
  async getCategorias(): Promise<CategoriaDespesa[]> {
    return categoriasDespesasService.getAll();
  },

  // Métodos específicos para cada tipo de despesa
  async getCategoriasFixas(): Promise<CategoriaDespesa[]> {
    const todasCategorias = await categoriasDespesasService.getAll();
    return todasCategorias.filter(cat => cat.tipo === 'fixa' || cat.tipo === 'ambos');
  },

  async getCategoriasDiversas(): Promise<CategoriaDespesa[]> {
    const todasCategorias = await categoriasDespesasService.getAll();
    return todasCategorias.filter(cat => cat.tipo === 'variavel' || cat.tipo === 'ambos');
  }
};
