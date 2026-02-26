export class UserResponseDto {
    id: string
    email: string
    phoneNumber: string
    emailVerified: boolean
    gender: string
    firstName: string
    lastName: string
    dateOfBirth?: Date
    country: string
    language: string
    jobTitle: string
    aboutMe: string
    createdAt: Date
}