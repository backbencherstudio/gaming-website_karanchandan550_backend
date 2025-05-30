import { Module } from '@nestjs/common';
import { UploadQuestionService } from './upload-question.service';
import { UploadQuestionController } from './upload-question.controller';

@Module({
  controllers: [UploadQuestionController],
  providers: [UploadQuestionService],
})
export class UploadQuestionModule {}
