import { supabase } from './supabase';

export interface Medico {
  id: number;
  nome: string;
  created_at?: string;
  updated_at?: string;
}

export const medicosService = {
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('medicos')
        .select('*')
        .order('nome');
      
      if (error) {
        console.error('Erro ao buscar médicos:', error);
        return [];
      }
      
      return data || [];
    } catch (e) {
      console.error('Exceção ao buscar médicos:', e);
      return [];
    }
  },
  
  async getById(id: number) {
    const { data, error } = await supabase
      .from('medicos')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Erro ao buscar médico ${id}:`, error);
      return null;
    }
    
    return data;
  },
  
  async create(medico: Omit<Medico, 'id' | 'created_at' | 'updated_at'>) {
    try {
      if (!medico.nome || !medico.nome.trim()) {
        console.error('Nome do médico é obrigatório');
        return null;
      }
      
      const dadosValidados = {
        nome: medico.nome.trim()
      };
      
      const { data, error } = await supabase
        .from('medicos')
        .insert(dadosValidados)
        .select();
      
      if (error) {
        console.error('Erro ao criar médico:', error);
        return null;
      }
      
      return data?.[0] || null;
    } catch (e) {
      console.error('Exceção ao criar médico:', e);
      return null;
    }
  },
  
  async update(id: number, medico: Partial<Medico>) {
    const { data, error } = await supabase
      .from('medicos')
      .update({ nome: medico.nome?.trim() })
      .eq('id', id)
      .select();
    
    if (error) {
      console.error(`Erro ao atualizar médico ${id}:`, error);
      return null;
    }
    
    return data[0];
  },
  
  async delete(id: number) {
    const { error } = await supabase
      .from('medicos')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Erro ao excluir médico ${id}:`, error);
      throw new Error('Erro ao excluir médico. Tente novamente.');
    }
    
    return true;
  }
};