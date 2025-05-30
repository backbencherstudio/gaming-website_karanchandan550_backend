import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { CreateUploadQuestionDto } from './dto/create-upload-question.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadQuestionService {
  private readonly dataPath = path.join(process.cwd(), 'src', 'data');

  async create(createUploadQuestionDto: CreateUploadQuestionDto) {
    try {
      const { questions, category } = createUploadQuestionDto;
      
      // Validate category
      const validCategories = ['concepts', 'trafficRules', 'trafficSafety', 'enviroment', 'generalQuestion'];
      if (!validCategories.includes(category)) {
        throw new HttpException('Invalid category', HttpStatus.BAD_REQUEST);
      }

      // Read and parse existing questions
      const filePath = path.join(this.dataPath, `${category}.ts`);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      const arrayMatch = fileContent.match(/const.*?=\s*(\[[\s\S]*?\])\s*\n\s*export/);
      if (!arrayMatch) {
        throw new HttpException('Could not find questions array in file', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const arrayContent = arrayMatch[1].trim();
      let existingQuestions;
      try {
        const cleanContent = arrayContent.replace(/,(\s*[\]\}])/g, '$1');
        existingQuestions = JSON.parse(cleanContent);
      } catch (e) {
        throw new HttpException('Failed to parse existing questions', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // Check for duplicate questions
      const duplicateQuestions = questions.filter(newQuestion => 
        existingQuestions.some(existingQuestion => 
          existingQuestion.question.toLowerCase() === newQuestion.question.toLowerCase()
        )
      );

      if (duplicateQuestions.length > 0) {
        return {
          success: false,
          message: "Questions already exist"
        };
      }

      // Get only non-duplicate questions
      const newQuestions = questions.filter(newQuestion => 
        !existingQuestions.some(existingQuestion => 
          existingQuestion.question.toLowerCase() === newQuestion.question.toLowerCase()
        )
      );

      if (newQuestions.length === 0) {
        return {
          success: false,
          message: 'No new questions to add',
          totalExisting: existingQuestions.length
        };
      }

      // Add new questions and save
      const updatedQuestions = [...existingQuestions, ...newQuestions];
      const newContent = `const ${category}Question = ${JSON.stringify(updatedQuestions, null, 2)}\n\nexport default ${category}Question;\n`;
      fs.writeFileSync(filePath, newContent);
      
      return {
        success: true,
        addedQuestions: newQuestions.length,
        totalQuestions: updatedQuestions.length
      };
    } catch (error) {
      console.error('Error details:', error);
      throw new HttpException(
        error.message || 'Failed to save questions',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getAllQuestions(category: string) {
    try {
      // Validate category
      const validCategories = ['concepts', 'trafficRules', 'trafficSafety', 'enviroment', 'generalQuestion'];
      if (!validCategories.includes(category)) {
        throw new HttpException('Invalid category', HttpStatus.BAD_REQUEST);
      }

      // Read file content
      const filePath = path.join(this.dataPath, `${category}.ts`);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Extract questions array
      const arrayMatch = fileContent.match(/const.*?=\s*(\[[\s\S]*?\])\s*\n\s*export/);
      if (!arrayMatch) {
        throw new HttpException('Could not find questions array in file', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const arrayContent = arrayMatch[1].trim();
      const cleanContent = arrayContent.replace(/,(\s*[\]\}])/g, '$1');
      const questions = JSON.parse(cleanContent);

      return {
        success: true,
        category,
        totalQuestions: questions.length,
        questions: questions
      };
    } catch (error) {
      console.error('Error details:', error);
      throw new HttpException(
        error.message || 'Failed to fetch questions',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
