/** One email to send. */
export class MailMessageDto {
  to: string;
  subject: string;
  text: string;
  html: string;
}
