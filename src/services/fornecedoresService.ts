import { supabase } from './supabase';

export interface Fornecedor {
  id: number;
  nome: string;
  cnpj: string;
  endereco: string;
  tipo: string;
  filiais: string;
}

export const fornecedoresService = {
  async getAll() {
    const { data, error } = await supabase
      .from('fornecedores')
      .select('*');
    
    if (error) {
      console.error('Erro ao buscar fornecedores:', error);
      return [];
    }
    
    return data || [];
  },
  
  async getById(id: number) {
    const { data, error } = await supabase
      .from('fornecedores')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Erro ao buscar fornecedor ${id}:`, error);
      return null;
    }
    
    return data;
  },
  
  async create(fornecedor: Omit<Fornecedor, 'id'>) {
    const { data, error } = await supabase
      .from('fornecedores')
      .insert(fornecedor)
      .select();
    
    if (error) {
      console.error('Erro ao criar fornecedor:', error);
      return null;
    }
    
    return data[0];
  },
  
  async update(id: number, fornecedor: Partial<Fornecedor>) {
    const { data, error } = await supabase
      .from('fornecedores')
      .update(fornecedor)
      .eq('id', id)
      .select();
    
    if (error) {
      console.error(`Erro ao atualizar fornecedor ${id}:`, error);
      return null;
    }
    
    return data[0];
  },
  
  async delete(id: number) {
    const { error } = await supabase
      .from('fornecedores')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Erro ao excluir fornecedor ${id}:`, error);
      return false;
    }
    
    return true;
  }
};
