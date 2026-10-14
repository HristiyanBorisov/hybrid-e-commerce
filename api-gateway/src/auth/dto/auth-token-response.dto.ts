/** Response of POST /auth/login. Send the token as "Authorization: Bearer <accessToken>". */
export class AuthTokenResponseDto {
  accessToken: string;

  /** Always "Bearer" */
  tokenType: 'Bearer';

  /** Seconds until the token expires */
  expiresIn: number;
}
