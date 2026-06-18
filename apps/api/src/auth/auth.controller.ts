import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { apiResponse } from '../common/api-response';
import { AuthenticatedUser } from './auth.types';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Autentica usuário e retorna token JWT' })
  async login(@Body() body: LoginDto) {
    const auth = await this.authService.login(body);

    return apiResponse(auth);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna o usuário autenticado' })
  async me(@CurrentUser() user: AuthenticatedUser) {
    return apiResponse(user);
  }
}
