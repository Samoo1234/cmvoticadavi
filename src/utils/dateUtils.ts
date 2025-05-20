/**
 * Utilitários para formatação e manipulação de datas
 */

/**
 * Formata uma data no formato ISO (YYYY-MM-DD) para o formato brasileiro (DD/MM/YYYY)
 * @param isoDate Data no formato ISO (YYYY-MM-DD)
 * @returns Data formatada no padrão brasileiro (DD/MM/YYYY)
 */
export const formatDateToBrazilian = (isoDate: string | null | undefined): string => {
  if (!isoDate) return '';
  
  try {
    // Verificar se é apenas uma data (YYYY-MM-DD) sem hora
    if (isoDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Adicionar T00:00:00 para garantir que a data seja interpretada na hora local
      const [year, month, day] = isoDate.split('-');
      return `${day}/${month}/${year}`;
    }
    
    // Para datas com timestamp completo
    const date = new Date(isoDate);
    
    // Verificar se a data é válida
    if (isNaN(date.getTime())) {
      return isoDate; // Retorna a string original se a data for inválida
    }
    
    // Ajustar para o fuso horário local
    const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    
    const day = localDate.getDate().toString().padStart(2, '0');
    const month = (localDate.getMonth() + 1).toString().padStart(2, '0');
    const year = localDate.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return isoDate; // Retorna a string original em caso de erro
  }
};

/**
 * Converte uma data no formato brasileiro (DD/MM/YYYY) para o formato ISO (YYYY-MM-DD)
 * @param brDate Data no formato brasileiro (DD/MM/YYYY)
 * @returns Data no formato ISO (YYYY-MM-DD)
 */
export const formatDateToISO = (brDate: string | null | undefined): string => {
  if (!brDate) return '';
  
  try {
    // Verificar se a data está no formato DD/MM/YYYY
    if (!brDate.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return brDate; // Retorna a string original se não estiver no formato esperado
    }
    
    const [day, month, year] = brDate.split('/');
    
    // Retorna apenas a data no formato YYYY-MM-DD sem hora
    // Isso garante que a data seja tratada como data local, sem problemas de fuso horário
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Erro ao converter data para ISO:', error);
    return brDate; // Retorna a string original em caso de erro
  }
};
