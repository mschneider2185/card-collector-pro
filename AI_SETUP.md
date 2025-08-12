# AI Processing Setup Guide

To enable real AI card recognition (instead of mock data), you need to configure the following API keys in your `.env.local` file:

## Required API Keys

### 1. OpenAI API Key (Required for AI Processing)
```
OPENAI_API_KEY=your_openai_api_key_here
```

**How to get it:**
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Go to API Keys section
4. Create a new API key
5. Copy the key and add it to your `.env.local` file

### 2. Google Cloud Vision API Key (Optional for OCR)
```
GOOGLE_CLOUD_VISION_API_KEY=your_google_cloud_vision_api_key_here
```

**How to get it:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Cloud Vision API
4. Create credentials (API Key)
5. Copy the key and add it to your `.env.local` file

### 3. AWS Credentials (Optional for OCR)
```
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
```

**How to get them:**
1. Go to [AWS Console](https://aws.amazon.com/)
2. Create an IAM user with Textract permissions
3. Generate access keys
4. Add them to your `.env.local` file

## Complete .env.local Example

```bash
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# AI Processing (Required for real AI features)
OPENAI_API_KEY=your_openai_api_key_here

# OCR Services (Optional - for better text extraction)
GOOGLE_CLOUD_VISION_API_KEY=your_google_cloud_vision_api_key_here
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key

# Anthropic Claude (Optional - alternative to OpenAI)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

## What Happens Without API Keys

If you don't configure the API keys:

1. **OCR will fail** - The system will show an error message about missing OCR service configuration
2. **AI processing will fail** - The system will show an error message about missing AI service configuration
3. **Manual entry still works** - Users can still manually enter card details
4. **Mock data is disabled** - The system no longer returns fake data, instead showing clear error messages

## Testing the Setup

1. Add the API keys to your `.env.local` file
2. Restart your development server: `npm run dev`
3. Upload a card image
4. The AI should now process the real image and extract actual card data

## Troubleshooting

### "OpenAI API key not configured" error
- Make sure `OPENAI_API_KEY` is set in your `.env.local` file
- Restart the development server after adding the key
- Check that the API key is valid and has sufficient credits

### "OCR service not configured" error
- This is expected if you don't have Google Cloud Vision or AWS Textract configured
- The system will still work, but OCR accuracy may be lower
- You can add OCR API keys for better text extraction

### "Invalid API key" error
- Check that your API keys are correct
- Ensure you have sufficient credits in your OpenAI account
- Verify the API keys are properly formatted (no extra spaces)

## Cost Considerations

- **OpenAI API**: ~$0.001-0.01 per card processed (depending on model)
- **Google Cloud Vision**: ~$0.001 per image processed
- **AWS Textract**: ~$0.0015 per page processed

For a typical user processing 100 cards per month, costs would be under $1. 