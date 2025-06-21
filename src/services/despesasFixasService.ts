import { supabase } from './supabase';

export interface DespesaFixa {
  id: number;
  filial_id: number;
  categoria_id?: number;
  nome: string;
  valor: number;
  periodicidade: 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual';
  dia_vencimento: number;
  data_vencimento?: string;
  status: 'ativo' | 'inativo';
  observacao?: string;
  comprovante_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DespesaFixaCompleta extends DespesaFixa {
  filial_nome: string;
  categoria_nome?: string;
}

export const despesasFixasService = {
  async getAll(): Promise<DespesaFixa[]> {
    const { data, error } = await supabase
      .from('despesas_fixas')
      .select('*')
      .order('nome');

    if (error) {
      console.error('Erro ao buscar despesas fixas:', error);
      return [];
    }

    return data || [];
  },

  async getAllCompletas(): Promise<DespesaFixaCompleta[]> {
    const { data, error } = await supabase
      .from('despesas_fixas')
      .select(`
        *,
        filiais (nome),
        categorias_despesas (nome)
      `)
      .order('nome');

    if (error) {
      console.error('Erro ao buscar despesas fixas completas:', error);
      return [];
    }

    return data?.map(item => ({
      ...item,
      filial_nome: item.filiais?.nome || 'Não especificado',
      categoria_nome: item.categorias_despesas?.nome || 'Sem categoria'
    })) || [];
  },

  async getById(id: number): Promise<DespesaFixa | null> {
    const { data, error } = await supabase
      .from('despesas_fixas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Erro ao buscar despesa fixa ${id}:`, error);
      return null;
    }

    return data;
  },

  async getByFilial(filialId: number): Promise<DespesaFixa[]> {
    const { data, error } = await supabase
      .from('despesas_fixas')
      .select('*')
      .eq('filial_id', filialId)
      .order('nome');

    if (error) {
      console.error(`Erro ao buscar despesas fixas da filial ${filialId}:`, error);
      return [];
    }

    return data || [];
  },

  async getByStatus(status: 'ativo' | 'inativo'): Promise<DespesaFixa[]> {
    const { data, error } = await supabase
      .from('despesas_fixas')
      .select('*')
      .eq('status', status)
      .order('nome');

    if (error) {
      console.error(`Erro ao buscar despesas fixas com status ${status}:`, error);
      return [];
    }

    return data || [];
  },

  async getVencimentosProximos(dias: number = 7): Promise<DespesaFixaCompleta[]> {
    const hoje = new Date();
    const dataLimite = new Date();
    dataLimite.setDate(hoje.getDate() + dias);

    const { data, error } = await supabase
      .from('despesas_fixas')
      .select(`
        *,
        filiais (nome),
        categorias_despesas (nome)
      `)
      .eq('status', 'ativo')
      .gte('data_vencimento', hoje.toISOString().slice(0, 10))
      .lte('data_vencimento', dataLimite.toISOString().slice(0, 10))
      .order('data_vencimento');

    if (error) {
      console.error('Erro ao buscar vencimentos próximos:', error);
      return [];
    }

    return data?.map(item => ({
      ...item,
      filial_nome: item.filiais?.nome || 'Não especificado',
      categoria_nome: item.categorias_despesas?.nome || 'Sem categoria'
    })) || [];
  },

  async create(despesa: Omit<DespesaFixa, 'id' | 'created_at' | 'updated_at'>): Promise<DespesaFixa | null> {
    const { data, error } = await supabase
      .from('despesas_fixas')
      .insert([despesa])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar despesa fixa:', error);
      return null;
    }

    return data;
  },

  async update(id: number, despesa: Partial<DespesaFixa>): Promise<DespesaFixa | null> {
    const { data, error } = await supabase
      .from('despesas_fixas')
      .update(despesa)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Erro ao atualizar despesa fixa ${id}:`, error);
      return null;
    }

    return data;
  },

  async ativar(id: number): Promise<DespesaFixa | null> {
    return this.update(id, { status: 'ativo' });
  },

  async inativar(id: number): Promise<DespesaFixa | null> {
    return this.update(id, { status: 'inativo' });
  },

  async delete(id: number): Promise<boolean> {
    const { error } = await supabase
      .from('despesas_fixas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Erro ao excluir despesa fixa ${id}:`, error);
      return false;
    }

    return true;
  },

  // Gerar próximos vencimentos baseado na periodicidade
  async gerarProximosVencimentos(despesaId: number, meses: number = 12): Promise<Date[]> {
    const despesa = await this.getById(despesaId);
    if (!despesa) return [];

    const vencimentos: Date[] = [];
    const hoje = new Date();
    
    for (let i = 0; i < meses; i++) {
      const proximoVencimento = new Date(hoje);
      
      switch (despesa.periodicidade) {
        case 'mensal':
          proximoVencimento.setMonth(hoje.getMonth() + i);
          break;
        case 'bimestral':
          proximoVencimento.setMonth(hoje.getMonth() + (i * 2));
          break;
        case 'trimestral':
          proximoVencimento.setMonth(hoje.getMonth() + (i * 3));
          break;
        case 'semestral':
          proximoVencimento.setMonth(hoje.getMonth() + (i * 6));
          break;
        case 'anual':
          proximoVencimento.setFullYear(hoje.getFullYear() + i);
          break;
      }
      
      proximoVencimento.setDate(despesa.dia_vencimento);
      vencimentos.push(proximoVencimento);
    }
    
    return vencimentos;
  }
}; 