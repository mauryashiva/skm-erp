export interface AppConfig {
  port: number;
  nodeEnv: string;
  frontendUrl: string;
  supabase: {
    url: string;
    serviceRoleKey: string;
    jwtSecret: string;
  };
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  supabase: {
    url: process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key',
    jwtSecret: process.env.SUPABASE_JWT_SECRET || 'placeholder-jwt-secret',
  },
});
