/**
 * Quick test script to verify SendGrid email sending works.
 * Run: npx tsx test-email.ts your@email.com
 */

// Load .env file manually
import { readFileSync } from 'fs';
try {
  const envContent = readFileSync('.env', 'utf8');
  for (const line of envContent.split('\n')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  }
} catch {}

import sgMail from '@sendgrid/mail';

async function main() {
  const testEmail = process.argv[2];

  if (!testEmail) {
    console.error('Usage: npx tsx test-email.ts your@email.com');
    process.exit(1);
  }

  const apiKey = process.env.SENDGRID_API_KEY;
  console.log('Testing SendGrid email sending...');
  console.log('To:', testEmail);
  console.log('API Key configured:', !!apiKey);
  console.log('API Key prefix:', apiKey?.substring(0, 10) + '...');

  if (!apiKey) {
    console.error('❌ SENDGRID_API_KEY not set in .env');
    process.exit(1);
  }

  sgMail.setApiKey(apiKey);

  try {
    const [response] = await sgMail.send({
      to: testEmail,
      from: { email: 'noreply@example.com', name: 'Master Agent Test' },
      subject: 'Test Email from Master Agent',
      text: 'This is a test email to verify SendGrid integration is working.',
      html: '<h1>Test Email</h1><p>This is a test email to verify SendGrid integration is working.</p>',
    });

    console.log('\nResponse status:', response.statusCode);
    console.log('Message ID:', response.headers['x-message-id']);
    console.log('\n✅ Email sent successfully!');
  } catch (err: any) {
    console.error('\n❌ Email failed:');
    if (err.response) {
      console.error('Status:', err.response.statusCode);
      console.error('Body:', JSON.stringify(err.response.body, null, 2));
    } else {
      console.error(err.message);
    }
  }
}

main().catch(console.error);
