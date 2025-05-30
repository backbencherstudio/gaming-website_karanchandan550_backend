import { PartialType } from '@nestjs/swagger';
import { CreateUploadQuestionDto } from './create-upload-question.dto';

export class UpdateUploadQuestionDto extends PartialType(CreateUploadQuestionDto) {}
