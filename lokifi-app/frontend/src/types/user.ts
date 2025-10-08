/**
 * User type definitions
 */

export interface User {
  id?: string;
  email: string;
  username?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type UserUpdate = Partial<User>;
