import { supabase } from './supabase';

export interface DespesaDiversa {
  id: number;
  filial_id: number;
  categoria_id?: number;
  nome: string;
  valor: number;
  data_despesa: string;
  data_pagamento?: string;
  forma_pagamento?: string;
  status: 'pendente' | 'pago';
  observacao?: string;
  comprovante_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DespesaDiversaCompleta extends DespesaDiversa {
  filial_nome: string;
  categoria_nome?: string;
}

export const despesasDiversasService = {
  async getAll(): Promise<DespesaDiversa[]> {
    const { data, error } = await supabase
      .from('despesas_diversas')
      .select('*')
      .order('data_despesa', { ascending: false });

    if (error) {
      console.error('Erro ao buscar despesas diversas:', error);
      return [];
    }

    return data || [];
  },

  async getAllCompletas(): Promise<DespesaDiversaCompleta[]> {
    const { data, error } = await supabase
      .from('despesas_diversas')
      .select(`
        *,
        filiais (nome),
        categorias_despesas (nome)
      `)
      .order('data_despesa', { ascending: false });

    if (error) {
      console.error('Erro ao buscar despesas diversas completas:', error);
      return [];
    }

    return data?.map(item => ({
      ...item,
      filial_nome: item.filiais?.nome || 'Não especificado',
      categoria_nome: item.categorias_despesas?.nome || 'Sem categoria'
    })) || [];
  },

  async getById(id: number): Promise<DespesaDiversa | null> {
    const { data, error } = await supabase
      .from('despesas_diversas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Erro ao buscar despesa diversa ${id}:`, error);
      return null;
    }

    return data;
  },

  async getByFilial(filialId: number): Promise<DespesaDiversa[]> {
    const { data, error } = await supabase
      .from('despesas_diversas')
      .select('*')
      .eq('filial_id', filialId)
      .order('data_despesa', { ascending: false });

    if (error) {
      console.error(`Erro ao buscar despesas diversas da filial ${filialId}:`, error);
      return [];
    }

    return data || [];
  },

  async getByStatus(status: 'pendente' | 'pago'): Promise<DespesaDiversa[]> {
    const { data, error } = await supabase
      .from('despesas_diversas')
      .select('*')
      .eq('status', status)
      .order('data_despesa', { ascending: false });

    if (error) {
      console.error(`Erro ao buscar despesas diversas com status ${status}:`, error);
      return [];
    }

    return data || [];
  },

  async getByPeriodo(dataInicial: string, dataFinal: string): Promise<DespesaDiversa[]> {
    const { data, error } = await supabase
      .from('despesas_diversas')
      .select('*')
      .gte('data_despesa', dataInicial)
      .lte('data_despesa', dataFinal)
      .order('data_despesa', { ascending: false });

    if (error) {
      console.error(`Erro ao buscar despesas diversas no período ${dataInicial} a ${dataFinal}:`, error);
      return [];
    }

    return data || [];
  },

  async getByPeriodoCompletas(dataInicial: string, dataFinal: string): Promise<DespesaDiversaCompleta[]> {
    const { data, error } = await supabase
      .from('despesas_diversas')
      .select(`
        *,
        filiais (nome),
        categorias_despesas (nome)
      `)
      .gte('data_despesa', dataInicial)
      .lte('data_despesa', dataFinal)
      .order('data_despesa', { ascending: false });

    if (error) {
      console.error(`Erro ao buscar despesas diversas completas no período ${dataInicial} a ${dataFinal}:`, error);
      return [];
    }

    return data?.map(item => ({
      ...item,
      filial_nome: item.filiais?.nome || 'Não especificado',
      categoria_nome: item.categorias_despesas?.nome || 'Sem categoria'
    })) || [];
  },

  async getPendentes(): Promise<DespesaDiversaCompleta[]> {
    const { data, error } = await supabase
      .from('despesas_diversas')
      .select(`
        *,
        filiais (nome),
        categorias_despesas (nome)
      `)
      .eq('status', 'pendente')
      .order('data_despesa');

    if (error) {
      console.error('Erro ao buscar despesas diversas pendentes:', error);
      return [];
    }

    return data?.map(item => ({
      ...item,
      filial_nome: item.filiais?.nome || 'Não especificado',
      categoria_nome: item.categorias_despesas?.nome || 'Sem categoria'
    })) || [];
  },

  async create(despesa: Omit<DespesaDiversa, 'id' | 'created_at' | 'updated_at'>): Promise<DespesaDiversa | null> {
    const { data, error } = await supabase
      .from('despesas_diversas')
      .insert([despesa])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar despesa diversa:', error);
      return null;
    }

    return data;
  },

  async update(id: number, despesa: Partial<DespesaDiversa>): Promise<DespesaDiversa | null> {
    const { data, error } = await supabase
      .from('despesas_diversas')
      .update(despesa)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Erro ao atualizar despesa diversa ${id}:`, error);
      return null;
    }

    return data;
  },

  async marcarComoPago(id: number, dataPagamento: string, formaPagamento?: string): Promise<DespesaDiversa | null> {
    const updateData: Partial<DespesaDiversa> = {
      status: 'pago',
      data_pagamento: dataPagamento
    };

    if (formaPagamento) {
      updateData.forma_pagamento = formaPagamento;
    }

    return this.update(id, updateData);
  },

  async marcarComoPendente(id: number): Promise<DespesaDiversa | null> {
    return this.update(id, { 
      status: 'pendente',
      data_pagamento: undefined,
      forma_pagamento: undefined
    });
  },

  async delete(id: number): Promise<boolean> {
    const { error } = await supabase
      .from('despesas_diversas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Erro ao excluir despesa diversa ${id}:`, error);
      return false;
    }

    return true;
  },

  // Estatísticas úteis
  async getTotalPorPeriodo(dataInicial: string, dataFinal: string): Promise<{ total: number; pagas: number; pendentes: number }> {
    const despesas = await this.getByPeriodo(dataInicial, dataFinal);
    
    const total = despesas.reduce((sum, d) => sum + d.valor, 0);
    const pagas = despesas.filter(d => d.status === 'pago').reduce((sum, d) => sum + d.valor, 0);
    const pendentes = despesas.filter(d => d.status === 'pendente').reduce((sum, d) => sum + d.valor, 0);

    return { total, pagas, pendentes };
  }
}; 