/**
 * Utilitários para conversão segura de valores monetários
 * Evita problemas de precisão com ponto flutuante
 */

/**
 * Converte string para número decimal seguro (trabalha com centavos como inteiros)
 * @param valor - String do valor (ex: "50.00", "50,00", "50")
 * @returns Número decimal preciso
 */
export const parseDecimalSeguro = (valor: string | number): number => {
  if (typeof valor === 'number') {
    // Se já é número, arredonda para 2 casas decimais usando centavos
    return Math.round(valor * 100) / 100;
  }

  if (!valor || valor === '') {
    return 0;
  }

  // Limpa a string e substitui vírgula por ponto
  const valorLimpo = valor.toString().replace(',', '.').trim();
  
  // Verifica se é um número válido
  if (!/^\d*\.?\d*$/.test(valorLimpo)) {
    return 0;
  }

  // Converte para centavos (inteiro) para evitar problemas de ponto flutuante
  const centavos = Math.round(parseFloat(valorLimpo) * 100);
  
  // Retorna o valor em reais (divide por 100)
  return centavos / 100;
};

/**
 * Formata número para string com 2 casas decimais
 * @param valor - Número a ser formatado
 * @returns String formatada (ex: "50.00")
 */
export const formatarDecimal = (valor: number): string => {
  if (isNaN(valor)) {
    return '0.00';
  }
  
  // Trabalha com centavos para garantir precisão
  const centavos = Math.round(valor * 100);
  return (centavos / 100).toFixed(2);
};

/**
 * Valida se uma string representa um valor monetário válido
 * @param valor - String a ser validada
 * @returns true se válido, false caso contrário
 */
export const validarValorMonetario = (valor: string): boolean => {
  if (!valor || valor.trim() === '') {
    return false;
  }

  const valorLimpo = valor.replace(',', '.').trim();
  
  // Aceita apenas números com até 2 casas decimais
  return /^\d+(\.\d{1,2})?$/.test(valorLimpo);
};

/**
 * Soma valores monetários com precisão
 * @param valores - Array de valores a serem somados
 * @returns Soma precisa
 */
export const somarValores = (...valores: (string | number)[]): number => {
  let totalCentavos = 0;
  
  for (const valor of valores) {
    const valorSeguro = parseDecimalSeguro(valor);
    totalCentavos += Math.round(valorSeguro * 100);
  }
  
  return totalCentavos / 100;
};

/**
 * Subtrai valores monetários com precisão
 * @param minuendo - Valor do qual se subtrai
 * @param subtraendo - Valor a ser subtraído
 * @returns Diferença precisa
 */
export const subtrairValores = (minuendo: string | number, subtraendo: string | number): number => {
  const minuendoCentavos = Math.round(parseDecimalSeguro(minuendo) * 100);
  const subtraendoCentavos = Math.round(parseDecimalSeguro(subtraendo) * 100);
  
  return (minuendoCentavos - subtraendoCentavos) / 100;
};

/**
 * Multiplica valor monetário com precisão
 * @param valor - Valor a ser multiplicado
 * @param multiplicador - Multiplicador
 * @returns Produto preciso
 */
export const multiplicarValor = (valor: string | number, multiplicador: number): number => {
  const valorCentavos = Math.round(parseDecimalSeguro(valor) * 100);
  const resultadoCentavos = Math.round(valorCentavos * multiplicador);
  
  return resultadoCentavos / 100;
};

/**
 * Arredonda valor para duas casas decimais de forma segura
 * @param valor - Valor a ser arredondado
 * @returns Valor arredondado
 */
export const arredondarDuasCasas = (valor: string | number): string => {
  const valorSeguro = parseDecimalSeguro(valor);
  return formatarDecimal(valorSeguro);
};
