import { supabase } from './supabase';

export interface TipoFornecedor {
  id: number;
  nome: string;
  descricao: string;
}

export const tiposFornecedoresService = {
  async getAll() {
    const { data, error } = await supabase
      .from('tipos_fornecedores')
      .select('*');
    
    if (error) {
      console.error('Erro ao buscar tipos de fornecedores:', error);
      return [];
    }
    
    return data || [];
  },
  
  async getById(id: number) {
    const { data, error } = await supabase
      .from('tipos_fornecedores')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Erro ao buscar tipo de fornecedor ${id}:`, error);
      return null;
    }
    
    return data;
  },
  
  async create(tipoFornecedor: Omit<TipoFornecedor, 'id'>) {
    const { data, error } = await supabase
      .from('tipos_fornecedores')
      .insert(tipoFornecedor)
      .select();
    
    if (error) {
      console.error('Erro ao criar tipo de fornecedor:', error);
      return null;
    }
    
    return data[0];
  },
  
  async update(id: number, tipoFornecedor: Partial<TipoFornecedor>) {
    const { data, error } = await supabase
      .from('tipos_fornecedores')
      .update(tipoFornecedor)
      .eq('id', id)
      .select();
    
    if (error) {
      console.error(`Erro ao atualizar tipo de fornecedor ${id}:`, error);
      return null;
    }
    
    return data[0];
  },
  
  async delete(id: number) {
    const { error } = await supabase
      .from('tipos_fornecedores')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Erro ao excluir tipo de fornecedor ${id}:`, error);
      return false;
    }
    
    return true;
  }
};
