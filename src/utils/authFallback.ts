// Fallback temporário para quando as tabelas de usuários não foram criadas
export const isAdminByEmail = (email: string): boolean => {
  const adminEmails = [
    'admin@cmvotica.com.br',
    'admin@cmv.com.br',
    'administrador@cmvotica.com.br',
    'samtecsolucoes@gmail.com'
  ];
  
  return adminEmails.includes(email.toLowerCase());
};

export const createFallbackUser = (authUser: any) => {
  return {
    id: authUser.id,
    auth_user_id: authUser.id,
    nome: authUser.email?.split('@')[0] || 'Usuário',
    email: authUser.email,
    is_admin: isAdminByEmail(authUser.email || ''),
    ativo: true,
    created_at: new Date().toISOString()
  };
}; 