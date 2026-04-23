import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PasswordService } from './password.service';
import { AccountStatus } from '../users/enums/account-status.enum';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    this.validateCredentials(registerDto.email, registerDto.password);

    const password = await this.passwordService.hash(registerDto.password);
    const user = await this.usersService.createUser({
      email: registerDto.email,
      password,
      deviceId: registerDto.deviceId,
    });

    return {
      message: 'User registered successfully',
      user: this.toSafeUser(user),
    };
  }

  async login(loginDto: LoginDto) {
    this.validateCredentials(loginDto.email, loginDto.password);

    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await this.passwordService.verify(
      loginDto.password,
      user.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.accountStatus === AccountStatus.BLOCKED) {
      throw new UnauthorizedException('Your account is blocked');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      device_id: user.deviceId,
    });

    return {
      message: 'Login successful',
      access_token: accessToken,
      user: this.toSafeUser(user),
    };
  }

  private validateCredentials(email?: string, password?: string): void {
    if (!email?.trim()) {
      throw new BadRequestException('Email is required');
    }

    if (!password?.trim()) {
      throw new BadRequestException('Password is required');
    }

    if (password.length < 8) {
      throw new BadRequestException(
        'Password must be at least 8 characters long',
      );
    }
  }

  private toSafeUser(user: User) {
    return {
      user_id: user.id,
      device_id: user.deviceId,
      email: user.email,
      role: user.role,
      account_status: user.accountStatus,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
  }
}
