import {
  Put,
  Patch,
  UseGuards,
  Request,
  Controller,
  Body,
  Get,
  Param,
  Post,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  Delete,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UpdatePublicKeyDto } from './dto/update-public-key.dto';
import { PatchProfileDto } from './dto/patch-profile.dto';
import { UsersService } from './users.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UpdateInterestsDto } from '../auth/dto/update-interests.dto';

const imageFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: (err: Error | null, accept: boolean) => void,
) => {
  if (!file.mimetype.match(/^image\/(jpeg|png|webp)$/)) {
    return cb(
      new BadRequestException('Only JPEG, PNG, or WebP allowed'),
      false,
    );
  }
  cb(null, true);
};

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getMe(@Request() req) {
    return this.usersService.getProfile(req.user.sub);
  }

  @Get('me/interests')
  @UseGuards(AuthGuard('jwt'))
  getInterests(@Request() req) {
    return this.usersService.getInterests(req.user.sub);
  }

  @Put('me/interests')
  @UseGuards(AuthGuard('jwt'))
  updateInterests(@Request() req, @Body() dto: UpdateInterestsDto) {
    return this.usersService.updateInterests(req.user.sub, dto.interestIds);
  }

  @Put('me/public-key')
  @UseGuards(AuthGuard('jwt'))
  updatePublicKey(@Request() req, @Body() dto: UpdatePublicKeyDto) {
    return this.usersService.updatePublicKey(req.user.sub, dto.publicKey);
  }

  @Patch('me')
  @UseGuards(AuthGuard('jwt'))
  updateProfile(@Request() req, @Body() dto: PatchProfileDto) {
    return this.usersService.updateProfile(req.user.sub, dto);
  }

  @Put('me/photo')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: imageFilter,
    }),
  )
  async replacePhoto(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.replacePrimaryPhoto(req.user.sub, file);
  }

  @Get('calls-left')
  @UseGuards(AuthGuard('jwt'))
  callsLeft(@Request() req) {
    return this.usersService.callsLeft(req.user.sub);
  }

  @Get('me/photos')
  @UseGuards(AuthGuard('jwt'))
  async getGalleryPhotos(@Request() req) {
    return this.usersService.getGalleryPhotos(req.user.sub);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':userId/photos')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
      fileFilter: imageFilter,
    }),
  )
  async uploadPhoto(
    @Param('userId', ParseUUIDPipe) userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.uploadProfilePicture(userId, file);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':userId/photos/:photoId/url')
  async getPhotoUrl(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ) {
    return this.usersService.getSignedPhotoUrl(userId, photoId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':userId/photos/:photoId')
  async deletePhoto(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ) {
    return this.usersService.deleteProfilePicture(userId, photoId);
  }
}
