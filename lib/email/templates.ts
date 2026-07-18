/**
 * Email Templates — Humanify branded (logo + layout).
 */
import {
  humanifyOnboardingReminderEmail,
  humanifyWelcomeEmail,
} from './humanify-mails';

export interface WelcomeEmailData {
  ownerName: string;
  ownerEmail: string;
  tempPassword: string;
  tenantName: string;
  businessType: string;
  loginUrl: string;
}

export interface OnboardingReminderData {
  ownerName: string;
  tenantName: string;
  currentStep: number;
  totalSteps: number;
  continueUrl: string;
}

export function generateWelcomeEmail(data: WelcomeEmailData) {
  return humanifyWelcomeEmail(data);
}

export function generateOnboardingReminder(data: OnboardingReminderData) {
  return humanifyOnboardingReminderEmail(data);
}
