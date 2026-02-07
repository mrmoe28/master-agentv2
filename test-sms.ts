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

import twilio from 'twilio';

async function main() {
  const testPhone = process.argv[2];
  if (!testPhone) {
    console.error('Usage: npx tsx test-sms.ts +1234567890');
    process.exit(1);
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  console.log('Testing Twilio SMS...');
  console.log('To:', testPhone);
  console.log('From:', fromNumber);
  console.log('Account SID:', accountSid?.substring(0, 10) + '...');

  const client = twilio(accountSid, authToken);

  try {
    const message = await client.messages.create({
      body: 'Test SMS from Master Agent - Integration working!',
      from: fromNumber,
      to: testPhone,
    });
    console.log('\n✅ SMS sent! SID:', message.sid);
  } catch (err: any) {
    console.error('\n❌ SMS failed:', err.message);
  }
}

main();
