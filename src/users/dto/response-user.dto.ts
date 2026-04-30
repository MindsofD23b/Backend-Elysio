export class UserResponseDto {
  id: string;
  email: string | null;
  phoneNumber: string | null;
  phonePrefix: string | null;
  emailVerified: boolean;
  gender: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  country: string;
  language: string;
  jobTitle: string;
  aboutMe: string;
  city: string | null;
  interestedIn: string | null;
  minPreferredAge: number | null;
  maxPreferredAge: number | null;
  acceptedTerms: boolean;
  acceptedPrivacyPolicy: boolean;
  subscriptionStatus: string;
  createdAt: Date;
  photoUrl?: string | null;
}
