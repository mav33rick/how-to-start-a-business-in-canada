/**
 * Supabase Client Setup
 * Initializes Supabase client with authentication and database access
 */

import { supabaseConfig } from '../config/supabase-config.js';

/**
 * Supabase client class with built-in Supabase JS functionality
 * Since we can't import the Supabase library directly in a static environment,
 * we'll load it from CDN and create our client wrapper
 */
class SupabaseClient {
  constructor() {
    this.client = null;
    this.initialized = false;
  }

  /**
   * Initialize Supabase client by loading from CDN
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Load Supabase from CDN
      if (!window.supabase) {
        await this.loadSupabaseFromCDN();
      }

      // Create Supabase client
      this.client = window.supabase.createClient(
        supabaseConfig.url,
        supabaseConfig.anonKey,
        {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
          }
        }
      );

      this.initialized = true;
      console.log('Supabase client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
      throw error;
    }
  }

  /**
   * Load Supabase library from CDN
   * @returns {Promise<void>}
   */
  loadSupabaseFromCDN() {
    return new Promise((resolve, reject) => {
      if (window.supabase) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.async = true;
      script.onload = () => {
        console.log('Supabase library loaded from CDN');
        resolve();
      };
      script.onerror = () => {
        reject(new Error('Failed to load Supabase library from CDN'));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Get the Supabase client instance
   * @returns {Object} Supabase client
   */
  getClient() {
    if (!this.initialized || !this.client) {
      throw new Error('Supabase client not initialized. Call initialize() first.');
    }
    return this.client;
  }

  /**
   * Get current user session
   * @returns {Promise<Object>} User session
   */
  async getSession() {
    const client = this.getClient();
    const { data: { session } } = await client.auth.getSession();
    return session;
  }

  /**
   * Get current user
   * @returns {Promise<Object|null>} Current user or null
   */
  async getUser() {
    const session = await this.getSession();
    return session?.user || null;
  }

  /**
   * Sign up new user
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Auth response
   */
  async signUp(email, password, options = {}) {
    const client = this.getClient();
    return await client.auth.signUp({
      email,
      password,
      options: {
        data: options.metadata || {}
      }
    });
  }

  /**
   * Sign in user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Auth response
   */
  async signIn(email, password) {
    const client = this.getClient();
    return await client.auth.signInWithPassword({
      email,
      password
    });
  }

  /**
   * Sign in with magic link
   * @param {string} email - User email
   * @returns {Promise<Object>} Auth response
   */
  async signInWithMagicLink(email) {
    const client = this.getClient();
    return await client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin
      }
    });
  }

  /**
   * Sign out user
   * @returns {Promise<Object>} Auth response
   */
  async signOut() {
    const client = this.getClient();
    return await client.auth.signOut();
  }

  /**
   * Reset password
   * @param {string} email - User email
   * @returns {Promise<Object>} Auth response
   */
  async resetPassword(email) {
    const client = this.getClient();
    return await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
  }

  /**
   * Update user profile
   * @param {Object} updates - Profile updates
   * @returns {Promise<Object>} Update response
   */
  async updateProfile(updates) {
    const client = this.getClient();
    return await client.auth.updateUser(updates);
  }

  /**
   * Listen to auth state changes
   * @param {Function} callback - Callback function
   * @returns {Object} Subscription object
   */
  onAuthStateChange(callback) {
    const client = this.getClient();
    return client.auth.onAuthStateChange(callback);
  }

  /**
   * Database operations
   */

  /**
   * Get user profile
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Profile data
   */
  async getProfile(userId) {
    const client = this.getClient();
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updates - Profile updates
   * @returns {Promise<Object>} Updated profile
   */
  async updateUserProfile(userId, updates) {
    const client = this.getClient();
    const { data, error } = await client
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get user progress
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Progress data
   */
  async getUserProgress(userId) {
    const client = this.getClient();
    const { data, error } = await client
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }
    return data;
  }

  /**
   * Save user progress
   * @param {string} userId - User ID
   * @param {Object} progressData - Progress data
   * @returns {Promise<Object>} Saved progress
   */
  async saveUserProgress(userId, progressData) {
    const client = this.getClient();
    
    // Use upsert to handle both insert and update
    const { data, error } = await client
      .from('user_progress')
      .upsert({
        user_id: userId,
        ...progressData,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get progress history
   * @param {string} userId - User ID
   * @param {number} limit - Number of history entries to fetch
   * @returns {Promise<Array>} Progress history
   */
  async getProgressHistory(userId, limit = 10) {
    const client = this.getClient();
    const { data, error } = await client
      .from('progress_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Delete user account and all associated data
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async deleteUserAccount(userId) {
    const client = this.getClient();
    
    // Delete profile (cascades to delete progress and history)
    const { error } = await client
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (error) throw error;
  }
}

// Export singleton instance
const supabaseClient = new SupabaseClient();
export default supabaseClient;