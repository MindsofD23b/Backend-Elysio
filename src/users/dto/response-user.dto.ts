export class UserResponseDto {
  id: string;
  email: string | null;
  phoneNumber: string | null;
  emailVerified: boolean;
  gender: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  country: string;
  language: string;
  jobTitle: string;
  aboutMe: string;
  createdAt: Date;
}
