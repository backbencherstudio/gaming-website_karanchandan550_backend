import { Controller, Post, Get, Body, Param, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { UploadQuestionService } from './upload-question.service';
import { CreateUploadQuestionDto } from './dto/create-upload-question.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { Role } from 'src/common/guard/role/role.enum';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { RolesGuard } from 'src/common/guard/role/roles.guard';

@ApiTags('Dashboard')
@Controller('upload-question')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)  // Only admin can access this controller
export class UploadQuestionController {
  constructor(private readonly uploadQuestionService: UploadQuestionService) {}

  @ApiOperation({ summary: 'Upload questions to specific category (Admin only)' })
  @Post()
  async create(@Body() createUploadQuestionDto: CreateUploadQuestionDto) {
    try {
      return await this.uploadQuestionService.create(createUploadQuestionDto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to upload questions',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @ApiOperation({ summary: 'Get all questions from specific category (Admin only)' })
  @Get(':category')
  async getAllQuestions(@Param('category') category: string) {
    try {
      return await this.uploadQuestionService.getAllQuestions(category);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch questions',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
