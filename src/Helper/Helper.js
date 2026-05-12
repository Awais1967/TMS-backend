import { randomBytes } from 'node:crypto'

export const generateReferralCode = () => {
  return randomBytes(5).toString('hex')
}
