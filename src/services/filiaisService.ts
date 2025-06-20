import { supabase } from './supabase';

export interface Filial {
  id?: number;
  nome: string;
  endereco: string;
  telefone?: string;
  responsavel?: string;
  ativa: boolean;
  created_at?: string;
}

export const filiaisService = {
  async getAll() {
    const { data, error } = await supabase
      .from('filiais')
      .select('*');
    
    if (error) {
      console.error('Erro ao buscar filiais:', error);
      return [];
    }
    
    return data || [];
  },
  
  async getById(id: number) {
    const { data, error } = await supabase
      .from('filiais')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Erro ao buscar filial ${id}:`, error);
      return null;
    }
    
    return data;
  },
  
  async create(filial: Omit<Filial, 'id'>) {
    try {
      console.log('=== INÍCIO DA CRIAÇÃO DE FILIAL ===');
      console.log('Dados recebidos para criar filial:', JSON.stringify(filial, null, 2));
      
      // Cria o objeto com os campos exatos que existem na tabela
      const now = new Date().toISOString();
      const filialToSend: Record<string, any> = {
        nome: String(filial.nome || '').trim(),
        endereco: String(filial.endereco || '').trim(),
        ativa: filial.ativa !== undefined ? Boolean(filial.ativa) : true,
        created_at: now
      };
      
      // Adiciona campos opcionais apenas se estiverem preenchidos
      if (filial.telefone) {
        filialToSend.telefone = String(filial.telefone).trim();
      }
      
      if (filial.responsavel) {
        filialToSend.responsavel = String(filial.responsavel).trim();
      }
      
      console.log('Dados formatados para envio:', JSON.stringify(filialToSend, null, 2));
      
      console.log('Enviando para o Supabase...');
      const { data, error, status, statusText } = await supabase
        .from('filiais')
        .insert([filialToSend]) // Envia como array
        .select()
        .single();
      
      console.log('Resposta do Supabase:', { status, statusText, data, error });
      
      if (error) {
        console.error('Erro ao criar filial:', error);
        throw new Error(`Erro ${error.code}: ${error.message} | ${error.details}`);
      }
      
      if (!data) {
        throw new Error('Nenhum dado retornado ao criar filial');
      }
      
      console.log('Filial criada com sucesso:', data);
      return data;
      
    } catch (error: any) {
      console.error('=== ERRO DETALHADO ===');
      console.error('Tipo do erro:', error?.constructor?.name);
      console.error('Mensagem:', error?.message);
      console.error('Stack:', error?.stack);
      
      // Converte o erro para um objeto simples para serialização segura
      const errorInfo = error ? {
        name: error.name,
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      } : {};
      
      console.error('Dados do erro:', JSON.stringify(errorInfo, null, 2));
      console.error('=== FIM DO ERRO ===');
      
      // Cria um novo erro com mais informações
      const errorMessage = error?.message || 'Erro desconhecido ao criar filial';
      const enhancedError = new Error(`Falha ao criar filial: ${errorMessage}`);
      
      // Adiciona propriedades adicionais ao erro de forma compatível
      Object.defineProperty(enhancedError, 'cause', {
        value: error,
        enumerable: false
      });
      
      throw enhancedError;
    }
  },
  
  async update(id: number, filial: Partial<Omit<Filial, 'id' | 'created_at'>>) {
    // Cria uma cópia do objeto filial apenas com os campos que devem ser atualizados
    const { data, error } = await supabase
      .from('filiais')
      .update(filial)
      .eq('id', id)
      .select();
    
    if (error) {
      console.error(`Erro ao atualizar filial ${id}:`, error);
      return null;
    }
    
    return data[0];
  },
  
  async delete(id: number) {
    const { error } = await supabase
      .from('filiais')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Erro ao excluir filial ${id}:`, error);
      
      // Verifica se é um erro de violação de chave estrangeira
      if (error.code === '23503') {
        throw new Error('Esta filial não pode ser excluída porque está sendo utilizada em outros registros do sistema.');
      }
      
      return false;
    }
    
    return true;
  }
};
