import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from '../services/storage.service';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!file.mimetype.match(/^image\/(jpg|jpeg|png|webp)|application\/pdf$/)) {
      throw new BadRequestException('File type not supported');
    }
    return this.storageService.uploadFile(file);
  }

  @Post('upload/video')
  @UseInterceptors(FileInterceptor('file'))
  async uploadVideo(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 500 * 1024 * 1024 }), // 500MB
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!file.mimetype.match(/^video\/(mp4|mov|avi|webm|quicktime)$/)) {
      throw new BadRequestException('Video type not supported');
    }
    // TODO: Get title from body if possible, or use filename
    return this.storageService.uploadVideo(file, file.originalname);
  }
}
