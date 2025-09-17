/**
 * Authentication Manager
 * Handles user authentication, session management, and auth state changes
 */

import supabaseClient from '../lib/supabase.js';

export class AuthManager {
  constructor() {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.authStateListeners = [];
    this.initialized = false;
  }

  /**
   * Initialize authentication manager
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize Supabase client
      await supabaseClient.initialize();

      // Get current session
      await this.checkAuthState();

      // Listen to auth state changes
      supabaseClient.onAuthStateChange((event, session) => {
        this.handleAuthStateChange(event, session);
      });

      this.initialized = true;
      console.log('Auth manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize auth manager:', error);
      throw error;
    }
  }

  /**
   * Check current authentication state
   * @returns {Promise<void>}
   */
  async checkAuthState() {
    try {
      const user = await supabaseClient.getUser();
      
      if (user) {
        this.currentUser = user;
        this.isAuthenticated = true;
        
        // Ensure user profile exists
        await this.ensureUserProfile(user);
      } else {
        this.currentUser = null;
        this.isAuthenticated = false;
      }

      // Notify listeners
      this.notifyAuthStateListeners();
    } catch (error) {
      console.error('Error checking auth state:', error);
      this.currentUser = null;
      this.isAuthenticated = false;
    }
  }

  /**
   * Handle authentication state changes
   * @param {string} event - Auth event type
   * @param {Object|null} session - User session
   */
  handleAuthStateChange(event, session) {
    console.log('Auth state changed:', event, session?.user?.email);

    switch (event) {
      case 'SIGNED_IN':
        this.currentUser = session?.user || null;
        this.isAuthenticated = !!session?.user;
        this.ensureUserProfile(this.currentUser);
        break;
      
      case 'SIGNED_OUT':
        this.currentUser = null;
        this.isAuthenticated = false;
        break;
      
      case 'TOKEN_REFRESHED':
        // Session refreshed, user remains the same
        break;
      
      default:
        console.log('Unhandled auth event:', event);
    }

    this.notifyAuthStateListeners();
  }

  /**
   * Ensure user profile exists in database
   * @param {Object} user - User object
   * @returns {Promise<void>}
   */
  async ensureUserProfile(user) {
    if (!user) return;

    try {
      // Try to get existing profile
      const profile = await supabaseClient.getProfile(user.id);
      
      if (!profile) {
        console.log('Creating user profile for:', user.email);
        // Profile doesn't exist, it should be created by the database trigger
        // But let's verify it exists after a short delay
        setTimeout(async () => {
          try {
            await supabaseClient.getProfile(user.id);
            console.log('User profile verified');
          } catch (error) {
            console.error('User profile creation failed:', error);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error);
    }
  }

  /**
   * Sign up new user
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Auth result
   */
  async signUp(email, password, options = {}) {
    try {
      const result = await supabaseClient.signUp(email, password, {
        metadata: {
          display_name: options.displayName || email.split('@')[0],
          ...options.metadata
        }
      });

      if (result.error) {
        throw result.error;
      }

      return {
        success: true,
        user: result.data?.user,
        needsEmailConfirmation: !result.data?.session,
        message: result.data?.session 
          ? 'Account created successfully!'
          : 'Please check your email to confirm your account.'
      };
    } catch (error) {
      console.error('Sign up error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create account'
      };
    }
  }

  /**
   * Sign in user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Auth result
   */
  async signIn(email, password) {
    try {
      const result = await supabaseClient.signIn(email, password);

      if (result.error) {
        throw result.error;
      }

      return {
        success: true,
        user: result.data?.user,
        message: 'Signed in successfully!'
      };
    } catch (error) {
      console.error('Sign in error:', error);
      return {
        success: false,
        error: this.getAuthErrorMessage(error)
      };
    }
  }

  /**
   * Sign in with magic link
   * @param {string} email - User email
   * @returns {Promise<Object>} Auth result
   */
  async signInWithMagicLink(email) {
    try {
      const result = await supabaseClient.signInWithMagicLink(email);

      if (result.error) {
        throw result.error;
      }

      return {
        success: true,
        message: 'Magic link sent! Check your email to sign in.'
      };
    } catch (error) {
      console.error('Magic link error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send magic link'
      };
    }
  }

  /**
   * Sign out user
   * @returns {Promise<Object>} Auth result
   */
  async signOut() {
    try {
      const result = await supabaseClient.signOut();

      if (result.error) {
        throw result.error;
      }

      return {
        success: true,
        message: 'Signed out successfully!'
      };
    } catch (error) {
      console.error('Sign out error:', error);
      return {
        success: false,
        error: error.message || 'Failed to sign out'
      };
    }
  }

  /**
   * Reset password
   * @param {string} email - User email
   * @returns {Promise<Object>} Reset result
   */
  async resetPassword(email) {
    try {
      const result = await supabaseClient.resetPassword(email);

      if (result.error) {
        throw result.error;
      }

      return {
        success: true,
        message: 'Password reset email sent! Check your inbox.'
      };
    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send reset email'
      };
    }
  }

  /**
   * Update user profile
   * @param {Object} updates - Profile updates
   * @returns {Promise<Object>} Update result
   */
  async updateProfile(updates) {
    if (!this.isAuthenticated || !this.currentUser) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    try {
      const result = await supabaseClient.updateUserProfile(this.currentUser.id, updates);

      return {
        success: true,
        profile: result,
        message: 'Profile updated successfully!'
      };
    } catch (error) {
      console.error('Profile update error:', error);
      return {
        success: false,
        error: error.message || 'Failed to update profile'
      };
    }
  }

  /**
   * Get user profile
   * @returns {Promise<Object|null>} User profile
   */
  async getUserProfile() {
    if (!this.isAuthenticated || !this.currentUser) {
      return null;
    }

    try {
      return await supabaseClient.getProfile(this.currentUser.id);
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Delete user account
   * @returns {Promise<Object>} Delete result
   */
  async deleteAccount() {
    if (!this.isAuthenticated || !this.currentUser) {
      return {
        success: false,
        error: 'User not authenticated'
      };
    }

    try {
      await supabaseClient.deleteUserAccount(this.currentUser.id);
      
      // Sign out after deleting account
      await this.signOut();

      return {
        success: true,
        message: 'Account deleted successfully'
      };
    } catch (error) {
      console.error('Account deletion error:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete account'
      };
    }
  }

  /**
   * Get current user
   * @returns {Object|null} Current user
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isUserAuthenticated() {
    return this.isAuthenticated;
  }

  /**
   * Add auth state change listener
   * @param {Function} listener - Listener function
   */
  addAuthStateListener(listener) {
    this.authStateListeners.push(listener);
  }

  /**
   * Remove auth state change listener
   * @param {Function} listener - Listener function
   */
  removeAuthStateListener(listener) {
    const index = this.authStateListeners.indexOf(listener);
    if (index > -1) {
      this.authStateListeners.splice(index, 1);
    }
  }

  /**
   * Notify all auth state listeners
   */
  notifyAuthStateListeners() {
    this.authStateListeners.forEach(listener => {
      try {
        listener({
          isAuthenticated: this.isAuthenticated,
          user: this.currentUser
        });
      } catch (error) {
        console.error('Error in auth state listener:', error);
      }
    });
  }

  /**
   * Get user-friendly error message
   * @param {Error} error - Error object
   * @returns {string} Error message
   */
  getAuthErrorMessage(error) {
    const message = error.message || error.toString();
    
    // Map common Supabase auth errors to user-friendly messages
    if (message.includes('Invalid login credentials')) {
      return 'Invalid email or password. Please try again.';
    }
    if (message.includes('Email not confirmed')) {
      return 'Please check your email and click the confirmation link.';
    }
    if (message.includes('User already registered')) {
      return 'An account with this email already exists. Try signing in instead.';
    }
    if (message.includes('Password should be at least')) {
      return 'Password must be at least 6 characters long.';
    }
    if (message.includes('Unable to validate email address')) {
      return 'Please enter a valid email address.';
    }
    
    return message;
  }
}

// Export singleton instance
const authManager = new AuthManager();
export default authManager;