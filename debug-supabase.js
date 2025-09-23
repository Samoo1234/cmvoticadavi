// Script para debugar a conexão com o Supabase
console.log('=== DEBUG SUPABASE ===');

// Verificar variáveis de ambiente
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'DEFINIDA' : 'NÃO DEFINIDA');

// Tentar importar o cliente Supabase
try {
  const { supabase } = await import('./src/services/supabase.js');
  console.log('Cliente Supabase importado com sucesso');
  
  // Testar conexão simples
  const { data, error } = await supabase.from('ordens_servico').select('count', { count: 'exact', head: true });
  
  if (error) {
    console.error('Erro ao conectar com Supabase:', error);
    console.error('Código do erro:', error.code);
    console.error('Mensagem:', error.message);
    console.error('Detalhes:', error.details);
  } else {
    console.log('Conexão com Supabase bem-sucedida!');
    console.log('Dados retornados:', data);
  }
} catch (importError) {
  console.error('Erro ao importar cliente Supabase:', importError);
}
