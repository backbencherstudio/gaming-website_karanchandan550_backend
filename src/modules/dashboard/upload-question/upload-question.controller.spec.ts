import { Test, TestingModule } from '@nestjs/testing';
import { UploadQuestionController } from './upload-question.controller';
import { UploadQuestionService } from './upload-question.service';

describe('UploadQuestionController', () => {
  let controller: UploadQuestionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadQuestionController],
      providers: [UploadQuestionService],
    }).compile();

    controller = module.get<UploadQuestionController>(UploadQuestionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
