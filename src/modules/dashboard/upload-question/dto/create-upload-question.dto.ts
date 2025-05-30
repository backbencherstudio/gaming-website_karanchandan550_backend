export class CreateUploadQuestionDto {
  questions: {
    question: string;
    options: string[];
    answer: string;
  }[];
  category: string;
}