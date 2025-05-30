import { Test, TestingModule } from '@nestjs/testing';
import { UploadQuestionService } from './upload-question.service';

describe('UploadQuestionService', () => {
  let service: UploadQuestionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UploadQuestionService],
    }).compile();

    service = module.get<UploadQuestionService>(UploadQuestionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
