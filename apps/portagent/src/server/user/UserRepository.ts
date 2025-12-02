/**
 * UserRepository - User data access layer
 *
 * Manages user persistence for Portagent application.
 * Extends the AgentX SQLite database with users table.
 */

import type { UserRecord, RegisterUserInput } from "./types";

/**
 * User repository interface
 */
export interface UserRepository {
  /**
   * Create a new user
   *
   * @param input - User registration data (password will be hashed)
   * @returns Created user record
   * @throws Error if username or email already exists
   */
  createUser(input: RegisterUserInput): Promise<UserRecord>;

  /**
   * Find user by ID
   *
   * @param userId - User ID
   * @returns User record or null if not found
   */
  findUserById(userId: string): Promise<UserRecord | null>;

  /**
   * Find user by username
   *
   * @param username - Username
   * @returns User record or null if not found
   */
  findUserByUsername(username: string): Promise<UserRecord | null>;

  /**
   * Find user by email
   *
   * @param email - Email address
   * @returns User record or null if not found
   */
  findUserByEmail(email: string): Promise<UserRecord | null>;

  /**
   * Find user by username or email
   *
   * @param usernameOrEmail - Username or email
   * @returns User record or null if not found
   */
  findUserByUsernameOrEmail(usernameOrEmail: string): Promise<UserRecord | null>;

  /**
   * Update user
   *
   * @param userId - User ID
   * @param updates - Partial user data to update
   * @returns Updated user record
   * @throws Error if user not found
   */
  updateUser(userId: string, updates: Partial<Omit<UserRecord, "userId">>): Promise<UserRecord>;

  /**
   * Delete user
   *
   * @param userId - User ID
   * @returns true if deleted, false if not found
   */
  deleteUser(userId: string): Promise<boolean>;

  /**
   * List all users
   *
   * @returns Array of user records
   */
  listUsers(): Promise<UserRecord[]>;

  /**
   * Check if username exists
   *
   * @param username - Username to check
   * @returns true if exists
   */
  usernameExists(username: string): Promise<boolean>;

  /**
   * Check if email exists
   *
   * @param email - Email to check
   * @returns true if exists
   */
  emailExists(email: string): Promise<boolean>;

  /**
   * Verify password for login
   *
   * @param usernameOrEmail - Username or email
   * @param password - Plain text password
   * @returns User record if valid, null if invalid
   */
  verifyPassword(usernameOrEmail: string, password: string): Promise<UserRecord | null>;
}
