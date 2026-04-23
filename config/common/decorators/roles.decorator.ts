import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { UserRole } from '../../common/enums/roles.enum';
import { RolesGuard } from '../../common/Guard/roles.guard';
export const Roles = (roles: UserRole[]) => {
  return applyDecorators(
    SetMetadata('roles', roles),
    UseGuards(RolesGuard),
  );
};
