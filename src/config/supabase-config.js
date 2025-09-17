/**
 * Supabase Configuration
 * Contains environment-specific settings for Supabase integration
 */

export const supabaseConfig = {
  url: 'https://ettzfhfbkyvrxuydffgk.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0dHpmaGZia3l2cnh1eWRmZmdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMjUxODMsImV4cCI6MjA3MzcwMTE4M30.ZtVnk5bLvoSCNmGJnXvdbfePXGPWdJAe_VD1eMHV8PI'
};

export const appConfig = {
  name: 'Business Startup Guide Canada',
  version: '2.0.0',
  features: {
    enableAuth: true,
    enableSync: true,
    enableOfflineMode: true
  }
};