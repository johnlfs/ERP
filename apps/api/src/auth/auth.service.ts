import {
  Inject,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service';
import { AuthenticatedUser, JwtPayload } from './auth.types';
import { LoginDto } from './dto/login.dto';

type UserWithStores = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  passwordHash: string;
  stores: Array<{
    role: any;
    status: any;
    store: {
      id: string;
      name: string;
      tradeName: string | null;
    };
  }>;
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(DatabaseService)
    private readonly database: DatabaseService,
    @Inject(JwtService)
    private readonly jwtService: JwtService,
    @Inject(ConfigService)
    private readonly configService: ConfigService
  ) {}

  private formatUser(user: UserWithStores): AuthenticatedUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      stores: user.stores.map((storeUser) => ({
        id: storeUser.store.id,
        name: storeUser.store.name,
        tradeName: storeUser.store.tradeName,
        role: storeUser.role,
        status: storeUser.status
      }))
    };
  }

  private getJwtSecret() {
    const secret = this.configService.get<string>('JWT_SECRET');

    if (!secret || secret.length < 32) {
      throw new Error('JWT_SECRET inválido ou ausente');
    }

    return secret;
  }

  private getJwtExpiresIn() {
    return this.configService.get<string>('JWT_EXPIRES_IN') || '1d';
  }

  async getCurrentUser(userId: string): Promise<AuthenticatedUser> {
    const user = await this.database.user.findUnique({
      where: {
        id: userId
      },
      include: {
        stores: {
          where: {
            status: 'ACTIVE'
          },
          include: {
            store: {
              select: {
                id: true,
                name: true,
                tradeName: true
              }
            }
          }
        }
      }
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuário não autorizado');
    }

    return this.formatUser(user);
  }

  async login(input: LoginDto) {
    const email = input.email.trim().toLowerCase();

    const user = await this.database.user.findUnique({
      where: {
        email
      },
      include: {
        stores: {
          where: {
            status: 'ACTIVE'
          },
          include: {
            store: {
              select: {
                id: true,
                name: true,
                tradeName: true
              }
            }
          }
        }
      }
    });

    if (!user || !user.isActive || !user.passwordHash) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.getJwtSecret(),
      expiresIn: this.getJwtExpiresIn()
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      user: this.formatUser(user)
    };
  }

  async verifyToken(token: string): Promise<AuthenticatedUser> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.getJwtSecret()
      });

      return this.getCurrentUser(payload.sub);
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }
}
