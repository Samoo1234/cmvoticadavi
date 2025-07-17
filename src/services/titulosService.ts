import { supabase } from './supabase';

export interface Titulo {
  id: number;
  numero: string;
  fornecedor_id: number;
  filial_id: number;
  tipo?: string; // Tipo do fornecedor como texto
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
  async getProximoNumero() {
    try {
      // Buscar todos os títulos com numeração TIT-XXXXX (formato sequencial)
      const { data, error } = await supabase
        .from('titulos')
        .select('numero')
        .like('numero', 'TIT-_____') // Buscar apenas formato TIT-00001, TIT-00002, etc.
        .order('numero', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('Erro ao buscar último número:', error);
        return 'TIT-00001'; // Fallback para o primeiro número
      }
      
      if (!data || data.length === 0) {
        return 'TIT-00001'; // Primeiro título
      }
      
      // Extrair o número do último título
      const ultimoNumero = data[0].numero;
      const match = ultimoNumero.match(/TIT-(\d{5})/);
      
      if (match) {
        const numeroAtual = parseInt(match[1], 10);
        const proximoNumero = numeroAtual + 1;
        return `TIT-${proximoNumero.toString().padStart(5, '0')}`;
      }
      
      return 'TIT-00001'; // Fallback se não conseguir extrair o número
    } catch (error) {
      console.error('Erro ao gerar próximo número:', error);
      return 'TIT-00001';
    }
  },

  async getAll() {
    console.log('=== DEBUG TITULOS SERVICE ===');
    console.log('Buscando todos os títulos...');
    
    const { data, error } = await supabase
      .from('titulos')
      .select('*');
    
    console.log('Resultado da consulta:', { data, error });
    console.log('Quantidade de títulos encontrados:', data?.length || 0);
    
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
