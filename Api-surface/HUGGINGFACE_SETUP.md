# Hugging Face API Setup Guide

This guide will help you set up Hugging Face API access for the AI analysis features in the API Attack Surface Mapper.

## 🤗 Why Hugging Face?

Hugging Face offers several advantages over OpenAI:
- **Free Tier**: Generous free usage limits
- **Open Source Models**: Access to thousands of open-source AI models
- **No Credit Card Required**: Start using immediately
- **Model Variety**: Choose from different model sizes and capabilities
- **Privacy**: Your data isn't used to train future models

## 🔑 Getting Your API Key

### Step 1: Create Account
1. Go to [Hugging Face](https://huggingface.co/)
2. Click **Sign Up** and create a free account
3. Verify your email address

### Step 2: Generate API Token
1. Go to [Settings → Access Tokens](https://huggingface.co/settings/tokens)
2. Click **New token**
3. Give it a name like "API-Attack-Surface-Mapper"
4. Select **Read** permission (sufficient for inference)
5. Click **Generate a token**
6. **Copy and save** the token immediately (you won't see it again!)

## 🤖 Recommended Models

### For Best Results (Requires Pro Account - $9/month)
```env
HUGGINGFACE_MODEL=meta-llama/Llama-2-7b-chat-hf
```
- **Best for**: Comprehensive security analysis
- **Quality**: Excellent reasoning and explanations
- **Speed**: Fast inference

### For Free Tier Users
```env
HUGGINGFACE_MODEL=microsoft/DialoGPT-large
```
- **Best for**: Basic analysis and recommendations
- **Quality**: Good for simple explanations
- **Speed**: Very fast

```env
HUGGINGFACE_MODEL=google/flan-t5-large
```
- **Best for**: Structured analysis
- **Quality**: Good reasoning capabilities
- **Speed**: Fast

### For Advanced Users
```env
HUGGINGFACE_MODEL=mistralai/Mistral-7B-Instruct-v0.1
```
- **Best for**: Technical analysis
- **Quality**: Excellent for code and technical content
- **Speed**: Moderate

## ⚙️ Configuration

### 1. Add to your `.env` file:
```env
# Hugging Face Configuration
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
HUGGINGFACE_MODEL=meta-llama/Llama-2-7b-chat-hf
```

### 2. Optional: Model-specific settings
```env
# For better performance with larger models
HUGGINGFACE_MAX_TOKENS=2000
HUGGINGFACE_TEMPERATURE=0.3
HUGGINGFACE_TIMEOUT=30000
```

## 🚦 Rate Limits

### Free Tier
- **Requests**: 1000 requests/month
- **Rate**: 10 requests/minute
- **Models**: Access to most open-source models

### Pro Tier ($9/month)
- **Requests**: 10,000 requests/month  
- **Rate**: 100 requests/minute
- **Models**: Access to all models including LLaMA 2
- **Priority**: Faster inference

### Enterprise
- **Custom limits** based on needs
- **Dedicated endpoints**
- **SLA guarantees**

## 🔄 Migration from OpenAI

If you previously used OpenAI, the migration is automatic:

1. ✅ **Environment Variables**: Already updated to use Hugging Face
2. ✅ **AI Analysis Service**: Refactored to work with Hugging Face API
3. ✅ **Fallback Logic**: Graceful degradation if API is unavailable
4. ✅ **Response Parsing**: Handles various model output formats

### Key Differences

| Feature | OpenAI | Hugging Face |
|---------|--------|--------------|
| **Cost** | $0.002/1K tokens | Free tier + Pro options |
| **Setup** | Credit card required | No credit card needed |
| **Models** | GPT-3.5, GPT-4 | 100+ open source models |
| **Privacy** | Data used for training | No training on your data |
| **API Limits** | Pay per use | Monthly quotas |

## 🛠️ Troubleshooting

### Model Loading Issues
```
Error: Model is loading, retrying in 20 seconds...
```
**Solution**: The model is cold-starting. Wait 20 seconds and retry.

### Rate Limit Exceeded
```
Error: Rate limit exceeded
```
**Solutions**:
- Wait for the rate limit to reset
- Upgrade to Pro tier
- Switch to a lighter model

### Invalid API Key
```
Error: Invalid API token
```
**Solutions**:
- Check your API key is correct
- Ensure the token has `read` permissions
- Generate a new token if needed

### Model Not Found
```
Error: Model not found
```
**Solutions**:
- Check the model name is correct
- Ensure the model is available in your region
- Try a different model from the recommended list

## 📊 Model Performance Comparison

| Model | Quality | Speed | Free Tier | Best For |
|-------|---------|--------|-----------|----------|
| **LLaMA 2 7B** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ❌ (Pro only) | Comprehensive analysis |
| **Mistral 7B** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ✅ | Technical analysis |  
| **FLAN-T5** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ | Structured responses |
| **DialoGPT** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ | Simple explanations |

## 🎯 Optimization Tips

### 1. Choose the Right Model
- **For production**: Use LLaMA 2 or Mistral for best results
- **For testing**: Start with FLAN-T5 or DialoGPT
- **For cost optimization**: Stick with free tier models

### 2. Optimize Prompts
- Keep prompts concise but informative
- Use structured formats for better parsing
- Include specific instructions for output format

### 3. Handle Errors Gracefully
- The application automatically falls back to basic analysis
- Monitor your usage in the Hugging Face dashboard
- Set up alerts for rate limit warnings

## 🔗 Useful Links

- [Hugging Face Models Hub](https://huggingface.co/models)
- [API Documentation](https://huggingface.co/docs/api-inference/index)
- [Pricing Information](https://huggingface.co/pricing)
- [Model Comparison Tool](https://huggingface.co/spaces/HuggingFaceH4/open_llm_leaderboard)

## 💬 Support

If you need help with Hugging Face setup:

1. **Check the logs** in your application for specific error messages
2. **Visit the Hugging Face Discord** for community support
3. **Create an issue** in this repository with your error details
4. **Check the Hugging Face status page** for service issues

---

**Happy AI-powered vulnerability analysis! 🔒🤖**
