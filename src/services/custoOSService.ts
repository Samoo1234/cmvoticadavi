import { supabase } from './supabase';

export interface CustoOS {
  id: number;
  filial_id: number;
  data: string;
  valor_venda: number;
  custo_lentes: number;
  custo_armacoes: number;
  custo_mkt: number;
  outros_custos: number;
  medico_id?: number;
  numero_tco?: string;
  created_at?: string;
  updated_at?: string;
}

interface CustoOSInput {
  filial_id: number;
  data: string;
  valor_venda: number;
  custo_lentes: number;
  custo_armacoes: number;
  custo_mkt: number;
  outros_custos: number;
  medico_id?: number;
  numero_tco?: string;
}

/**
 * Serviço para gerenciar os custos de OS no Supabase
 */
export const custoOSService = {
  /**
   * Busca todos os registros de custos de OS
   */
  async getAll(): Promise<CustoOS[]> {
    const { data, error } = await supabase
      .from('custos_os')
      .select('*')
      .order('data', { ascending: false });

    if (error) {
      console.error('Erro ao buscar custos de OS:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Busca um registro de custo de OS pelo ID
   * @param id ID do registro
   */
  async getById(id: number): Promise<CustoOS | null> {
    const { data, error } = await supabase
      .from('custos_os')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Erro ao buscar custo de OS com ID ${id}:`, error);
      return null;
    }

    return data;
  },

  /**
   * Busca registros de custos de OS por filial
   * @param filialId ID da filial
   */
  async getByFilial(filialId: number): Promise<CustoOS[]> {
    const { data, error } = await supabase
      .from('custos_os')
      .select('*')
      .eq('filial_id', filialId)
      .order('data', { ascending: false });

    if (error) {
      console.error(`Erro ao buscar custos de OS para filial ${filialId}:`, error);
      return [];
    }

    return data || [];
  },

  /**
   * Busca registros de custos de OS por período
   * @param dataInicio Data inicial
   * @param dataFim Data final
   */
  async getByPeriodo(dataInicio: string, dataFim: string): Promise<CustoOS[]> {
    const { data, error } = await supabase
      .from('custos_os')
      .select('*')
      .gte('data', dataInicio)
      .lte('data', dataFim)
      .order('data', { ascending: false });

    if (error) {
      console.error(`Erro ao buscar custos de OS no período de ${dataInicio} a ${dataFim}:`, error);
      return [];
    }

    return data || [];
  },

  /**
   * Busca registros de custos de OS por filial e período
   * @param filialId ID da filial
   * @param dataInicio Data inicial
   * @param dataFim Data final
   */
  async getByFilialEPeriodo(filialId: number, dataInicio: string, dataFim: string): Promise<CustoOS[]> {
    const { data, error } = await supabase
      .from('custos_os')
      .select('*')
      .eq('filial_id', filialId)
      .gte('data', dataInicio)
      .lte('data', dataFim)
      .order('data', { ascending: false });

    if (error) {
      console.error(`Erro ao buscar custos de OS para filial ${filialId} no período de ${dataInicio} a ${dataFim}:`, error);
      return [];
    }

    return data || [];
  },

  /**
   * Cria um novo registro de custo de OS
   * @param custoOS Dados do custo de OS
   */
  async create(custoOS: CustoOSInput): Promise<CustoOS | null> {
    const { data, error } = await supabase
      .from('custos_os')
      .insert(custoOS)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar custo de OS:', error);
      return null;
    }

    return data;
  },

  /**
   * Atualiza um registro de custo de OS
   * @param id ID do registro
   * @param custoOS Dados atualizados do custo de OS
   */
  async update(id: number, custoOS: Partial<CustoOSInput>): Promise<CustoOS | null> {
    const { data, error } = await supabase
      .from('custos_os')
      .update(custoOS)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Erro ao atualizar custo de OS com ID ${id}:`, error);
      return null;
    }

    return data;
  },

  /**
   * Exclui um registro de custo de OS
   * @param id ID do registro
   */
  async delete(id: number): Promise<boolean> {
    const { error } = await supabase
      .from('custos_os')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Erro ao excluir custo de OS com ID ${id}:`, error);
      return false;
    }

    return true;
  }
};
