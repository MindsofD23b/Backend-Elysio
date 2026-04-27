import { Put, UseGuards, Request, Controller, Body, Get, Param, Post, BadRequestException, UseInterceptors, UploadedFile, ParseUUIDPipe, Delete } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UpdatePublicKeyDto } from './dto/update-public-key.dto';
import { UsersService } from './users.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

const imageFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: (err: Error | null, accept: boolean) => void,
) => {
  if (!file.mimetype.match(/^image\/(jpeg|png|webp)$/)) {
    return cb(new BadRequestException('Only JPEG, PNG, or WebP allowed'), false);
  }
  cb(null, true);
};

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getMe(@Request() req) {
    return this.usersService.getProfile(req.user.sub);
  }

  @Put('me/public-key')
  @UseGuards(AuthGuard('jwt'))
  updatePublicKey(@Request() req, @Body() dto: UpdatePublicKeyDto) {
    return this.usersService.updatePublicKey(req.user.sub, dto.publicKey);
  }

  @Get('calls-left')
  @UseGuards(AuthGuard('jwt'))
  callsLeft(@Request() req) {
    return this.usersService.callsLeft(req.user.sub);
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