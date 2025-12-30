import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';
import * as path from 'path';
import 'multer'; // Ensure Multer types are loaded

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly storageApiKey: string;
  private readonly storageZone: string;
  private readonly pullZone: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.storageApiKey =
      this.configService.get<string>('BUNNY_STORAGE_API_KEY') || '';
    this.storageZone =
      this.configService.get<string>('BUNNY_STORAGE_ZONE') || '';
    this.pullZone = this.configService.get<string>('BUNNY_PULL_ZONE') || '';
    this.region = this.configService.get<string>('BUNNY_REGION') || ''; // 'ny', 'la', 'sg', 'syd', etc. or empty for DE (Falkenstein)
  }

  async uploadFile(
    file: Express.Multer.File,
  ): Promise<{ url: string; type: 'image' | 'document' }> {
    if (!this.storageApiKey || !this.storageZone || !this.pullZone) {
      throw new InternalServerErrorException(
        'Bunny.net configuration is missing',
      );
    }

    const fileExtension = path.extname(file.originalname).toLowerCase();
    const fileName = `${crypto.randomUUID()}${fileExtension}`;
    const fileType = this.getFileType(file.mimetype);

    // Construct Storage Endpoint
    // Main: https://storage.bunnycdn.com
    // Regions: https://{region}.storage.bunnycdn.com
    const baseUrl = this.region
      ? `https://${this.region}.storage.bunnycdn.com`
      : 'https://storage.bunnycdn.com';

    const uploadUrl = `${baseUrl}/${this.storageZone}/${fileName}`;

    try {
      this.logger.log(`Uploading file to Bunny.net: ${fileName}`);

      await axios.put(uploadUrl, file.buffer, {
        headers: {
          AccessKey: this.storageApiKey,
          'Content-Type': 'application/octet-stream', // Bunny recommends octet-stream or actual mime
        },
      });

      // Construct Public URL
      const publicUrl = `https://${this.pullZone}/${fileName}`;

      return {
        url: publicUrl,
        type: fileType,
      };
    } catch (error) {
      this.logger.error('Error uploading to Bunny.net', error);
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  private getFileType(mimeType: string): 'image' | 'document' {
    if (mimeType.startsWith('image/')) {
      return 'image';
    }
    return 'document';
  }
}
