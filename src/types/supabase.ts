export interface CustoOSType {
  id: number;
  filial_id: number | null;
  data: string | null;
  valor_venda: number | null;
  custo_lentes: number | null;
  custo_armacoes: number | null;
  custo_mkt: number | null;
  outros_custos: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface FilialType {
  id: number;
  nome: string | null;
  endereco: string | null;
  telefone: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface FornecedorType {
  id: number;
  nome: string | null;
  tipo_id: number | null;
  contato: string | null;
  telefone: string | null;
  email: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TipoFornecedorType {
  id: number;
  nome: string | null;
  descricao: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TituloType {
  id: number;
  tipo: string | null;
  fornecedor_id: number | null;
  filial_id: number | null;
  data_emissao: string | null;
  vencimento: string | null;
  pagamento: string | null;
  valor: number | null;
  status: string | null;
  observacoes: string | null;
  created_at: string | null;
  updated_at: string | null;
}
