import { supabase } from './supabase';

export interface Fornecedor {
  id: number;
  nome: string;
  cnpj: string;
  endereco?: string;
  tipo: string;
  filiais?: string;
}

export const fornecedoresService = {
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('*');
      
      if (error) {
        console.error('Erro ao buscar fornecedores:', error);
        return [];
      }
      
      return data || [];
    } catch (e) {
      console.error('Exceção ao buscar fornecedores:', e);
      return [];
    }
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
    try {
      // Validar dados antes de enviar ao Supabase
      if (!fornecedor.nome || !fornecedor.cnpj || !fornecedor.tipo) {
        console.error('Dados obrigatórios faltando');
        return null;
      }
      
      // Garantir que campos não nulos estejam presentes
      const dadosValidados = {
        nome: fornecedor.nome,
        cnpj: fornecedor.cnpj,
        tipo: fornecedor.tipo,
        endereco: fornecedor.endereco || '',
        filiais: fornecedor.filiais || ''
      };
      
      // Criação direta sem verificação prévia
      const { data, error } = await supabase
        .from('fornecedores')
        .insert(dadosValidados)
        .select();
      
      if (error) {
        console.error('Erro ao criar fornecedor:', error);
        return null;
      }
      
      return data?.[0] || null;
    } catch (e) {
      console.error('Exceção ao criar fornecedor:', e);
      return null;
    }
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
      
      // Verificar se é erro de integridade referencial
      if (error.code === '23503' || error.message.includes('still referenced')) {
        throw new Error('Este fornecedor não pode ser excluído porque possui títulos ou outros registros vinculados. Exclua primeiro os registros relacionados.');
      }
      
      throw new Error('Erro ao excluir fornecedor. Tente novamente.');
    }
    
    return true;
  }
};
