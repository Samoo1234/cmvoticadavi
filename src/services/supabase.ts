import { createClient } from '@supabase/supabase-js';

// Usar variáveis de ambiente do arquivo .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Verificar se as variáveis de ambiente estão definidas
if (!supabaseUrl || !supabaseKey) {
  console.error('Variáveis de ambiente do Supabase não definidas!');
}

// Configuração do cliente Supabase com interceptors de erro
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Interceptor para logar todas as requisições
supabase.realtime.setAuth(supabaseKey);

// Interceptor para erros
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event, session);
});
