export type OAuthProvider = 'google' | 'github'

export type OAuthProfile = {
  providerId: string
  provider: OAuthProvider
  email: string
  name: string
  avatarUrl?: string
}
