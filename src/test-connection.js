import { supabase } from './services/supabase.js';

console.log('🔍 Testando conexão com Supabase...');

// Teste 1: Verificar se consegue conectar
try {
  const { data, error } = await supabase.auth.getSession();
  console.log('✅ Conexão com Supabase OK');
} catch (err) {
  console.error('❌ Erro na conexão:', err.message);
}

// Teste 2: Verificar se a tabela ordens_servico existe
try {
  const { data, error } = await supabase
    .from('ordens_servico')
    .select('count', { count: 'exact', head: true });
  
  if (error) {
    console.error('❌ Erro ao acessar tabela ordens_servico:', error.message);
    console.error('Código:', error.code);
    
    if (error.code === 'PGRST116') {
      console.log('💡 SOLUÇÃO: A tabela "ordens_servico" não existe no banco!');
    } else if (error.code === '42501') {
      console.log('💡 SOLUÇÃO: Problema de permissões RLS na tabela.');
    }
  } else {
    console.log('✅ Tabela ordens_servico encontrada!');
    console.log('📊 Dados:', data);
  }
} catch (err) {
  console.error('❌ Erro inesperado:', err.message);
}
