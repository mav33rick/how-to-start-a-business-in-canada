/**
 * Supabase Configuration
 * Environment-aware configuration for Supabase connection
 */

// Environment detection
const isDevelopment = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname.includes('localhost');

const isNetlify = window.location.hostname.includes('netlify.app') ||
                  window.location.hostname.includes('netlify.com');

const PRODUCTION_URL = 'https://how-to-start-a-business-in-canada.netlify.app';

// Get appropriate site URL
function getSiteUrl() {
  if (isDevelopment) {
    return 'http://localhost:3000'; // Default dev server port
  }
  
  if (isNetlify) {
    return window.location.origin;
  }
  
  // Default to production URL
  return PRODUCTION_URL;
}

export const supabaseConfig = {
  url: 'https://ettzfhfbkyvrxuydffgk.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0dHpmaGZia3l2cnh1eWRmZmdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMjUxODMsImV4cCI6MjA3MzcwMTE4M30.ZtVnk5bLvoSCNmGJnXvdbfePXGPWdJAe_VD1eMHV8PI',
  
  // Environment-aware site URL
  siteUrl: getSiteUrl(),
  
  // Auth configuration with proper redirects
  auth: {
    redirectTo: getSiteUrl(),
    passwordResetRedirectTo: `${getSiteUrl()}/auth/reset-password`,
    emailConfirmRedirectTo: `${getSiteUrl()}/auth/confirm`
  }
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