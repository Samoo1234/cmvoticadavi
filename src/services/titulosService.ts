import { supabase } from './supabase';

export interface Titulo {
  id: number;
  numero: string;
  fornecedor_id: number;
  filial_id: number;
  tipo_id?: number; // Nova coluna adicionada para tipo de fornecedor
  valor: number;
  data_emissao: string;
  data_vencimento: string;
  data_pagamento?: string;
  multa?: number;
  juros?: number;
  status: 'pendente' | 'pago' | 'vencido' | 'cancelado';
  observacao?: string;
}

export const titulosService = {
  async getAll() {
    const { data, error } = await supabase
      .from('titulos')
      .select('*');
    
    if (error) {
      console.error('Erro ao buscar títulos:', error);
      return [];
    }
    
    return data || [];
  },
  
  async getById(id: number) {
    const { data, error } = await supabase
      .from('titulos')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Erro ao buscar título ${id}:`, error);
      return null;
    }
    
    return data;
  },
  
  async create(titulo: Omit<Titulo, 'id'>) {
    const { data, error } = await supabase
      .from('titulos')
      .insert(titulo)
      .select();
    
    if (error) {
      console.error('Erro ao criar título:', error);
      return null;
    }
    
    return data[0];
  },
  
  async update(id: number, titulo: Partial<Titulo>) {
    const { data, error } = await supabase
      .from('titulos')
      .update(titulo)
      .eq('id', id)
      .select();
    
    if (error) {
      console.error(`Erro ao atualizar título ${id}:`, error);
      return null;
    }
    
    return data[0];
  },
  
  async delete(id: number) {
    const { error } = await supabase
      .from('titulos')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Erro ao excluir título ${id}:`, error);
      return false;
    }
    
    return true;
  },
  
  async getTitulosPendentes() {
    const { data, error } = await supabase
      .from('titulos')
      .select('*')
      .eq('status', 'pendente');
    
    if (error) {
      console.error('Erro ao buscar títulos pendentes:', error);
      return [];
    }
    
    return data || [];
  },
  
  async getTitulosVencidos() {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('titulos')
      .select('*')
      .eq('status', 'pendente')
      .lt('data_vencimento', today);
    
    if (error) {
      console.error('Erro ao buscar títulos vencidos:', error);
      return [];
    }
    
    return data || [];
  }
};
