import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StoreUserStatus, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth.types';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado');
    }

    const hasAllowedRole = user.stores.some(
      (store) =>
        store.status === StoreUserStatus.ACTIVE &&
        requiredRoles.includes(store.role)
    );

    if (!hasAllowedRole) {
      throw new ForbiddenException({
        code: 'ROLE_ACCESS_DENIED',
        message: 'Usuário não possui permissão para executar esta ação'
      });
    }

    return true;
  }
}
