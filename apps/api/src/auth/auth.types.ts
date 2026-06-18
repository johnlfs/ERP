import { StoreUserStatus, UserRole } from '@prisma/client';

export type AuthenticatedStore = {
  id: string;
  name: string;
  tradeName: string | null;
  role: UserRole;
  status: StoreUserStatus;
};

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  stores: AuthenticatedStore[];
};

export type JwtPayload = {
  sub: string;
  email: string;
};
