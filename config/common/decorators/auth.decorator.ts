import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/Guard/jwt-auth.guard';

/**
 * Decorator for routes that require any authenticated user
 * No specific role required - just needs to be logged in
 */
export const Auth = () => {
  return applyDecorators(UseGuards(JwtAuthGuard));
};
