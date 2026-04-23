import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );

    if (!requiredRoles || requiredRoles.length == 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const token = request.headers['authorization']?.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    const user = await this.jwtService
      .verifyAsync(token, { secret: process.env.JWT_SECRET })
      .then((data) => data)
      .catch((err) => {
        throw new UnauthorizedException(err.message);
      });
    if (requiredRoles.includes(user.role)) {
      request.user = user;
      return true;
    }
    throw new ForbiddenException("Unauthorized:Insufficient permissions to complete this operation");
  }
}
