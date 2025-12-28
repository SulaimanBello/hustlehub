# SMS Provider Setup Guide

## Why Termii for HustleHub Nigeria?

**Termii** is recommended for the Nigerian market due to:
- ✅ Nigerian company with local infrastructure
- ✅ Better delivery rates in Nigeria (98%+)
- ✅ Lower costs for Nigerian numbers
- ✅ No foreign transaction fees
- ✅ Faster support for NG-specific issues
- ✅ Simple API with good documentation

### Cost Comparison (as of Dec 2025)
| Provider | Cost per SMS (Nigeria) | Minimum Top-up |
|----------|------------------------|----------------|
| **Termii** | ₦2.50 - ₦4.00 | ₦5,000 |
| Twilio | $0.0140 (~₦22) | $20 |
| Africa's Talking | $0.01 (~₦16) | $10 |

**Verdict**: Termii is 5-8x cheaper for Nigerian SMS 🎯

---

## Termii Setup Steps

### 1. Create Termii Account

1. Visit [https://termii.com](https://termii.com)
2. Click **"Get Started"** → **"Create Account"**
3. Fill in business details:
   - Company Name: HustleHub
   - Email: your-email@example.com
   - Phone: Your NG phone number
4. Verify email and phone number
5. Complete KYC (Business Registration if available)

### 2. Fund Your Account

1. Navigate to **"Wallet"** in dashboard
2. Click **"Fund Wallet"**
3. Choose payment method:
   - Bank Transfer (recommended for lower fees)
   - Card Payment
   - USSD
4. **Recommended starting balance**: ₦10,000 (covers ~2,500-4,000 OTPs)

### 3. Get API Credentials

1. Go to **"Settings"** → **"API Settings"**
2. Copy your **API Key**
3. Note your **Sender ID** (default: "Termii" - can request custom ID)

### 4. Request Custom Sender ID (Optional but Recommended)

1. Navigate to **"Sender IDs"**
2. Click **"Request Sender ID"**
3. Enter: **"HustleHub"** or **"Hustle"** (max 11 characters)
4. Provide business documentation
5. Wait 1-3 business days for approval

**Benefits of Custom Sender ID**:
- Brand recognition
- Higher trust (fewer spam flags)
- Better delivery rates

---

## Environment Configuration

### Development (.env.development)
```bash
# SMS Configuration
SMS_PROVIDER=termii
TERMII_API_KEY=your-development-api-key
TERMII_SENDER_ID=Termii
TERMII_API_URL=https://api.ng.termii.com
```

### Production (.env.production)
```bash
# SMS Configuration
SMS_PROVIDER=termii
TERMII_API_KEY=your-production-api-key
TERMII_SENDER_ID=HustleHub  # Or your approved sender ID
TERMII_API_URL=https://api.ng.termii.com
```

### Staging/Testing (.env.test)
```bash
# SMS Configuration
SMS_PROVIDER=mock  # Use mock provider for tests
```

---

## Termii API Integration Details

### Send OTP Endpoint
```typescript
POST https://api.ng.termii.com/api/sms/otp/send

Headers:
  Content-Type: application/json

Body:
{
  "api_key": "YOUR_API_KEY",
  "message_type": "NUMERIC",
  "to": "2348012345678",
  "from": "HustleHub",
  "channel": "generic",
  "pin_attempts": 3,
  "pin_time_to_live": 5,
  "pin_length": 6,
  "pin_placeholder": "< 1234 >",
  "message_text": "Your HustleHub verification code is < 1234 >. Valid for 5 minutes.",
  "pin_type": "NUMERIC"
}

Response (Success):
{
  "pinId": "c8dcd048-5e7f-4347-8c89-4470c3af0b",
  "to": "2348012345678",
  "smsStatus": "Message Sent"
}
```

### Alternative: Direct SMS Send (More Control)
```typescript
POST https://api.ng.termii.com/api/sms/send

Body:
{
  "api_key": "YOUR_API_KEY",
  "to": "2348012345678",
  "from": "HustleHub",
  "sms": "Your HustleHub verification code is 123456. Valid for 5 minutes.",
  "type": "plain",
  "channel": "generic"
}
```

---

## Testing Checklist

### Before Going Live:

- [ ] **Test with your own number** (send OTP to yourself)
- [ ] **Test with team members** (3-5 different numbers)
- [ ] **Verify delivery time** (should be <10 seconds)
- [ ] **Check message format** (ensure OTP is clear)
- [ ] **Test rate limiting** (3 failed attempts should trigger cooldown)
- [ ] **Monitor wallet balance** (set up low-balance alerts)
- [ ] **Test during peak hours** (evening 6-9 PM)

### Termii Dashboard Monitoring:

1. **Message Status**: Go to "SMS Logs" to see delivery status
2. **Delivery Rate**: Should be >95% for Nigerian numbers
3. **Failed Messages**: Investigate any patterns
4. **Wallet Balance**: Set alert at ₦2,000 remaining

---

## Troubleshooting

### Issue: Messages Not Delivered

**Possible Causes**:
1. Invalid phone number format
2. Insufficient wallet balance
3. Network carrier issues
4. Sender ID not approved

**Solutions**:
1. Ensure numbers start with 234 (not +234 or 0)
2. Check Termii wallet balance
3. Try different carrier (MTN, Airtel, Glo, 9mobile)
4. Use default "Termii" sender ID if custom not approved

### Issue: Slow Delivery

**Possible Causes**:
1. Network congestion
2. Using wrong channel type
3. Carrier prioritization

**Solutions**:
1. Retry during off-peak hours
2. Use "generic" channel (not "dnd")
3. Consider upgrading Termii plan for priority routing

### Issue: High Costs

**Optimization Tips**:
1. Implement rate limiting (we already have this)
2. Add phone number verification before sending
3. Use 5-minute OTP expiry (vs 10 minutes)
4. Block repeated requests from same number
5. Consider SMS alternatives for non-critical notifications

---

## Cost Optimization

### Current Setup Costs (Estimated)

**Assumptions**:
- 1,000 users per month
- 2 OTPs per user (signup + occasional re-auth)
- ₦3.50 per SMS average

**Monthly Cost**: 1,000 users × 2 OTPs × ₦3.50 = **₦7,000/month**

### Scaling Projections

| Users/Month | OTPs/Month | Cost @ ₦3.50 | Cost @ ₦2.50 (volume discount) |
|-------------|------------|--------------|-------------------------------|
| 1,000 | 2,000 | ₦7,000 | ₦5,000 |
| 5,000 | 10,000 | ₦35,000 | ₦25,000 |
| 10,000 | 20,000 | ₦70,000 | ₦50,000 |
| 50,000 | 100,000 | ₦350,000 | ₦250,000 |

**Termii Volume Discounts**:
- >100,000 SMS/month: Contact for enterprise pricing
- Can negotiate down to ₦2.00/SMS at high volume

---

## Alternative: Fallback Provider

**Recommendation**: Configure Twilio as fallback for critical scenarios

```typescript
// In sms.service.ts
SMS_PROVIDER=termii          // Primary
SMS_FALLBACK_PROVIDER=twilio // Backup if Termii fails
```

**Use Fallback When**:
- Termii API is down
- Delivery fails 3 times
- Wallet balance is zero
- Critical user (admin, high-value)

---

## Security Best Practices

1. **Never commit API keys** to Git
2. **Rotate API keys** every 90 days
3. **Use separate keys** for dev/staging/production
4. **Monitor for abuse** (same number requesting OTPs repeatedly)
5. **Set spending limits** in Termii dashboard
6. **Enable IP whitelisting** if Termii supports it
7. **Log all SMS sends** for audit trail

---

## Support Contacts

**Termii Support**:
- Email: support@termii.com
- Phone: +234 xxx xxx xxxx (check their website)
- Dashboard: Live chat available
- Response time: Usually <24 hours

**Escalation**:
- For urgent issues during business hours
- Check Termii status page: status.termii.com (if available)

---

## Next Steps After Setup

1. ✅ Create Termii account
2. ✅ Fund wallet with ₦10,000
3. ✅ Get API key
4. ✅ Request custom Sender ID
5. ✅ Update environment variables
6. ✅ Test SMS sending
7. ✅ Monitor delivery rates
8. ✅ Set up low-balance alerts
9. ✅ Document costs for budget tracking

**Estimated Setup Time**: 1-2 hours (excluding Sender ID approval)
