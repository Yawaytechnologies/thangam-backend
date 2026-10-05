import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { DirectorService } from './director.service';
import { DirectorTeamFilterDto } from './dto/director-team-filter.dto';

@ApiTags('Director')
@ApiBearerAuth()
@Controller('director')
@Roles(Role.DIRECTOR)
export class DirectorController {
  constructor(private readonly directorService: DirectorService) {}

  @Get('dashboard')
  @ApiOperation({ summary: "Get the authenticated Director's dashboard" })
  getDashboard(@CurrentUser('id') userId: string) {
    return this.directorService.getDashboard(userId);
  }

  @Get('team')
  @ApiOperation({ summary: "List only the authenticated Director's downline" })
  getTeam(
    @CurrentUser('id') userId: string,
    @Query() filters: DirectorTeamFilterDto,
  ) {
    return this.directorService.getTeam(userId, filters);
  }

  @Get('team/:memberId')
  @ApiOperation({ summary: 'Get a downline member as read-only details' })
  getTeamMember(
    @CurrentUser('id') userId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    return this.directorService.getTeamMember(userId, memberId);
  }

  @Get('profile')
  @ApiOperation({ summary: "Get the authenticated Director's safe profile" })
  getProfile(@CurrentUser('id') userId: string) {
    return this.directorService.getProfile(userId);
  }
}
