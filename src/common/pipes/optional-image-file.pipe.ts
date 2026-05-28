import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

@Injectable()
export class OptionalImageFilePipe implements PipeTransform {
  transform(file?: Express.Multer.File) {
    if (!file) return undefined;
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException(
        'Only JPEG, PNG, and WebP images are allowed',
      );
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('Image must be 5 MB or smaller');
    }
    return file;
  }
}
