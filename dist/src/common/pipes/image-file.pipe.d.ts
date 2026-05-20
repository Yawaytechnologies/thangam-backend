import { PipeTransform } from '@nestjs/common';
export declare class ImageFilePipe implements PipeTransform {
    transform(file: Express.Multer.File): Express.Multer.File;
}
