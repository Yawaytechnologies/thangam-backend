import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('global')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Global search across all entities (SUPER_ADMIN only)',
  })
  @ApiQuery({ name: 'query', type: String, description: 'Search term' })
  globalSearch(@Query('query') query: string) {
    return this.searchService.globalSearch(query ?? '');
  }
}
