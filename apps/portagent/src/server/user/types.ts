/**
 * User Management Types
 *
 * Application-level user model for Portagent.
 * This is separate from AgentX infrastructure (which is user-agnostic).
 */

/**
 * User record in database
 */
export interface UserRecord {
  /**
   * Unique user identifier (UUID)
   */
  userId: string;

  /**
   * Unique username for login
   */
  username: string;

  /**
   * User email address (unique)
   */
  email: string;

  /**
   * Hashed password (bcrypt)
   */
  passwordHash: string;

  /**
   * User's dedicated Container ID
   * Assigned on registration, used for all sessions
   */
  containerId: string;

  /**
   * Display name (optional)
   */
  displayName?: string;

  /**
   * Avatar URL or identifier (optional)
   */
  avatar?: string;

  /**
   * Whether the user account is active
   * @default true
   */
  isActive: boolean;

  /**
   * Timestamp when user was created
   */
  createdAt: number;

  /**
   * Timestamp when user was last updated
   */
  updatedAt: number;
}

/**
 * User registration input
 */
export interface RegisterUserInput {
  /**
   * Unique username for login
   */
  username: string;

  /**
   * User email address (optional)
   */
  email?: string;

  /**
   * Plain text password (will be hashed)
   */
  password: string;

  /**
   * User's dedicated Container ID
   * Created by auth layer before calling createUser
   */
  containerId: string;

  /**
   * Display name (optional)
   */
  displayName?: string;

  /**
   * Avatar URL or identifier (optional)
   */
  avatar?: string;
}

/**
 * User login input
 */
export interface LoginUserInput {
  /**
   * Username or email
   */
  usernameOrEmail: string;

  /**
   * Plain text password
   */
  password: string;
}

/**
 * Public user info (safe to expose)
 */
export interface UserInfo {
  userId: string;
  username: string;
  email: string;
  containerId: string;
  displayName?: string;
  avatar?: string;
  createdAt: number;
}
