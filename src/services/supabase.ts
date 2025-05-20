import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tudmimjtwetyqyumkodf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1ZG1pbWp0d2V0eXF5dW1rb2RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNzM3MzcsImV4cCI6MjA2MjY0OTczN30.vPlgtgul4p-JNVy5BW5nXOBI0hGfU97IYwI_e4Q_-eo';

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
