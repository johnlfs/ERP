import { ForbiddenException } from '@nestjs/common';
import { StoreUserStatus, UserRole } from '@prisma/client';
import { AuthenticatedUser } from './auth.types';

export const WRITE_STORE_ROLES: UserRole[] = [UserRole.ADMIN];

export function ensureUserCanWriteStore(
  user: AuthenticatedUser,
  storeId: string,
  allowedRoles: UserRole[] = WRITE_STORE_ROLES
) {
  const storeAccess = user.stores.find((store) => store.id === storeId);

  if (!storeAccess || storeAccess.status !== StoreUserStatus.ACTIVE) {
    throw new ForbiddenException({
      code: 'STORE_ACCESS_DENIED',
      message: 'Usuário não possui acesso ativo à loja informada'
    });
  }

  if (!allowedRoles.includes(storeAccess.role)) {
    throw new ForbiddenException({
      code: 'STORE_ROLE_DENIED',
      message: 'Usuário não possui permissão de escrita nesta loja'
    });
  }
}
