import { supabase } from './supabase';

export interface OrdemServico {
  id: number;
  numero: string;
  cliente: string;
  filial_id: number;
  data_abertura: string;
  data_entrega?: string;
  status: 'aberta' | 'em_andamento' | 'concluida' | 'entregue' | 'cancelada';
  valor_total: number;
  observacao?: string;
}

export interface ItemOS {
  id: number;
  os_id: number;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  fornecedor_id?: number;
}

export const osService = {
  async getAll() {
    const { data, error } = await supabase
      .from('ordens_servico')
      .select('*');
    
    if (error) {
      console.error('Erro ao buscar ordens de serviço:', error);
      return [];
    }
    
    return data || [];
  },
  
  async getById(id: number) {
    const { data, error } = await supabase
      .from('ordens_servico')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Erro ao buscar ordem de serviço ${id}:`, error);
      return null;
    }
    
    return data;
  },
  
  async getOSAbertas() {
    const { data, error } = await supabase
      .from('ordens_servico')
      .select('*')
      .in('status', ['aberta', 'em_andamento']);
    
    if (error) {
      console.error('Erro ao buscar ordens de serviço abertas:', error);
      return [];
    }
    
    return data || [];
  },
  
  async create(os: Omit<OrdemServico, 'id'>) {
    const { data, error } = await supabase
      .from('ordens_servico')
      .insert(os)
      .select();
    
    if (error) {
      console.error('Erro ao criar ordem de serviço:', error);
      return null;
    }
    
    return data[0];
  },
  
  async update(id: number, os: Partial<OrdemServico>) {
    const { data, error } = await supabase
      .from('ordens_servico')
      .update(os)
      .eq('id', id)
      .select();
    
    if (error) {
      console.error(`Erro ao atualizar ordem de serviço ${id}:`, error);
      return null;
    }
    
    return data[0];
  },
  
  async delete(id: number) {
    // Primeiro exclui os itens relacionados
    const { error: itemsError } = await supabase
      .from('itens_os')
      .delete()
      .eq('os_id', id);
    
    if (itemsError) {
      console.error(`Erro ao excluir itens da OS ${id}:`, itemsError);
      return false;
    }
    
    // Depois exclui a OS
    const { error } = await supabase
      .from('ordens_servico')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Erro ao excluir ordem de serviço ${id}:`, error);
      return false;
    }
    
    return true;
  },
  
  // Métodos para gerenciar itens da OS
  async getItensOS(osId: number) {
    const { data, error } = await supabase
      .from('itens_os')
      .select('*')
      .eq('os_id', osId);
    
    if (error) {
      console.error(`Erro ao buscar itens da OS ${osId}:`, error);
      return [];
    }
    
    return data || [];
  },
  
  async addItemOS(item: Omit<ItemOS, 'id'>) {
    const { data, error } = await supabase
      .from('itens_os')
      .insert(item)
      .select();
    
    if (error) {
      console.error('Erro ao adicionar item à OS:', error);
      return null;
    }
    
    return data[0];
  },
  
  async updateItemOS(id: number, item: Partial<ItemOS>) {
    const { data, error } = await supabase
      .from('itens_os')
      .update(item)
      .eq('id', id)
      .select();
    
    if (error) {
      console.error(`Erro ao atualizar item ${id} da OS:`, error);
      return null;
    }
    
    return data[0];
  },
  
  async deleteItemOS(id: number) {
    const { error } = await supabase
      .from('itens_os')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Erro ao excluir item ${id} da OS:`, error);
      return false;
    }
    
    return true;
  },
  
  // Métodos para relatórios
  async getRelatorioOSPorPeriodo(dataInicio: string, dataFim: string) {
    const { data, error } = await supabase
      .from('ordens_servico')
      .select('*')
      .gte('data_abertura', dataInicio)
      .lte('data_abertura', dataFim);
    
    if (error) {
      console.error('Erro ao gerar relatório de OS por período:', error);
      return [];
    }
    
    return data || [];
  },
  
  async getRelatorioOSPorFilial(filialId: number) {
    const { data, error } = await supabase
      .from('ordens_servico')
      .select('*')
      .eq('filial_id', filialId);
    
    if (error) {
      console.error(`Erro ao gerar relatório de OS para filial ${filialId}:`, error);
      return [];
    }
    
    return data || [];
  }
};
