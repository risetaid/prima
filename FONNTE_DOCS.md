# Official Fonnte WhatsApp API Documentation

This document contains the official Fonnte WhatsApp Business API documentation extracted from https://docs.fonnte.com/

## Overview

Fonnte is an unofficial WhatsApp API Gateway service based in Indonesia that provides WhatsApp Business API functionality for sending messages, managing devices, and handling webhooks.

**Official Documentation**: https://docs.fonnte.com/  
**Main Website**: https://fonnte.com/  
**Last Updated**: January 27, 2025 (with deprecation of button features)

## Getting Started

### Prerequisites

1. Create a Fonnte account at https://fonnte.com/
2. Login to your dashboard
3. Create a device and copy the token as your API key
4. Connect your device before proceeding to send messages
5. Ensure you have sufficient deposit for API usage

### Authentication

All API requests require authentication using a token in the Authorization header:

```
Authorization: YOUR_TOKEN_HERE
```

## Send Message API

### Endpoint

**URL**: `https://api.fonnte.com/send`  
**Method**: `POST`  
**Content-Type**: `application/json` or `application/x-www-form-urlencoded`

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `target` | string | The WhatsApp number or group ID that will receive the message |
| `message` | string | The message content (supports emojis, maximum 60,000 characters) |

### Optional Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `delay` | integer | Minimum 0, add hyphen for random delay (e.g., "1-10" produces random delay between 1-10 seconds) |
| `countryCode` | string | Replace first zero with country code (default: "62" for Indonesia) |
| `location` | string | Format: "latitude,longitude" for location messages |
| `typing` | boolean | Show typing indicator (default: false) |
| `url` | string | Parameter for sending attachments to recipients |
| `file` | file | Upload file directly from local/form data |
| `connectOnly` | boolean | Use the API only on connected devices |
| `choices` | string | **Poll feature**: Polling choices, minimum 2, maximum 12, separated by commas |
| `select` | string | **Poll feature**: Polling selection limit, "single" or "multiple" |
| `pollname` | string | **Poll feature**: Name for the poll |

### Request Examples

#### Basic Text Message

```bash
curl -X POST https://api.fonnte.com/send \
  -H "Authorization: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "target": "6281234567890",
    "message": "Hello from Fonnte API!"
  }'
```

#### Message with Delay

```bash
curl -X POST https://api.fonnte.com/send \
  -H "Authorization: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "target": "6281234567890",
    "message": "Delayed message",
    "delay": "5-10"
  }'
```

#### Message with Attachment

```bash
curl -X POST https://api.fonnte.com/send \
  -H "Authorization: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "target": "6281234567890",
    "message": "Check out this image",
    "url": "https://example.com/image.jpg"
  }'
```

#### Location Message

```bash
curl -X POST https://api.fonnte.com/send \
  -H "Authorization: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "target": "6281234567890",
    "message": "My current location",
    "location": "-6.200000,106.816666"
  }'
```

#### WhatsApp Poll Message

```bash
curl -X POST https://api.fonnte.com/send \
  -H "Authorization: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "target": "6281234567890",
    "message": "Which is your favorite color?",
    "choices": "Red,Blue,Green,Yellow",
    "select": "single",
    "pollname": "Color Preference Poll"
  }'
```

#### Multiple Choice Poll

```bash
curl -X POST https://api.fonnte.com/send \
  -H "Authorization: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "target": "6281234567890", 
    "message": "Select your preferred meeting days:",
    "choices": "Monday,Tuesday,Wednesday,Thursday,Friday",
    "select": "multiple",
    "pollname": "Meeting Schedule"
  }'
```

### PHP Examples

#### Basic Message

```php
<?php
$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => 'https://api.fonnte.com/send',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS => array(
    'target' => '6281234567890',
    'message' => 'Hello from PHP!',
    'delay' => '2'
  ),
  CURLOPT_HTTPHEADER => array(
    'Authorization: YOUR_TOKEN'
  ),
));

$response = curl_exec($curl);
curl_close($curl);

echo $response;
?>
```

#### Poll Message with PHP

```php
<?php
$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => 'https://api.fonnte.com/send',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS => array(
    'target' => '6281234567890',
    'message' => 'What is your preferred programming language?',
    'choices' => 'PHP,JavaScript,Python,Java,Go',
    'select' => 'single',
    'pollname' => 'Programming Language Poll'
  ),
  CURLOPT_HTTPHEADER => array(
    'Authorization: YOUR_TOKEN'
  ),
));

$response = curl_exec($curl);
curl_close($curl);

echo $response;
?>
```

## Interactive Features & Bot Functionality

### WhatsApp Polls

Fonnte supports WhatsApp poll functionality for creating interactive surveys and gathering user feedback.

#### Poll Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `choices` | string | Yes | Comma-separated poll options (minimum 2, maximum 12) |
| `select` | string | Yes | Selection type: "single" or "multiple" |
| `pollname` | string | No | Display name for the poll |

#### Poll Limitations

- **Minimum choices**: 2 options
- **Maximum choices**: 12 options  
- **Selection types**: Single choice or multiple choice
- **Format**: Choices must be comma-separated
- **Compatibility**: Available for WhatsApp groups and individual chats

#### Interactive Bot Usage

Polls are particularly useful for:
- **Customer feedback collection**
- **Survey responses**
- **Quick decision making**
- **Menu selection in chatbots**
- **Preference gathering**

### Chatbot Development

According to the official documentation, Fonnte supports creating WhatsApp chatbots with interactive features. The service allows for:

- **Static chatbots** for serving information like FAQs
- **Interactive button responses** (though button features were deprecated as of January 27, 2025)
- **Poll-based interactions** for user engagement
- **Template-based responses** for common queries

### Bot Best Practices

1. **Use polls for multiple choice questions** instead of expecting text responses
2. **Limit poll options** to 12 or fewer for better user experience  
3. **Create clear poll questions** with concise option labels
4. **Handle poll responses** through webhook integrations
5. **Design conversation flows** that guide users through poll interactions

## API Order Endpoint

For managing devices and plans programmatically:

### Endpoint

**URL**: `https://api.fonnte.com/order`  
**Method**: `POST`

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `plan` | integer | Plan type (1-7) |
| `duration` | integer | Plan duration (1 = Month, 10 = Year) |
| `duration-value` | integer | Number of duration periods |
| `ai-quota` | integer | AI quota (minimum 500, steps of 100) |
| `ai-data` | integer | Additional AI data |

### Example Request

```php
$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => 'https://api.fonnte.com/order',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS => array(
    'plan' => 1,
    'duration' => 1,
    'duration-value' => 1,
    'ai-quota' => 500,
    'ai-data' => 0
  ),
  CURLOPT_HTTPHEADER => array(
    'Authorization: YOUR_TOKEN'
  ),
));

$response = curl_exec($curl);
curl_close($curl);

echo $response;
```

## WhatsApp Group Functionality

Fonnte supports sending messages to WhatsApp groups. You need to obtain the group ID first before sending messages.

### Getting Group ID

1. Add your Fonnte device to the WhatsApp group
2. Use the group management features in your Fonnte dashboard
3. The group ID can be used as the `target` parameter in send requests

## Phone Number Format

### Indonesian Numbers (Default)

- **Country Code**: 62 (Indonesia)
- **Format**: Remove leading zero and add country code
- **Example**: `081234567890` becomes `6281234567890`

### International Numbers

- Use full international format with country code
- **Example**: `+1234567890` becomes `1234567890`

## File Upload and Media

### Supported Media Types

- Images (JPG, PNG, GIF)
- Documents (PDF, DOC, DOCX)
- Audio files
- Video files

### Upload Methods

1. **URL Method**: Use `url` parameter with direct link to media
2. **File Upload**: Use `file` parameter with form-data upload
3. **Base64**: Encode file as base64 string (check documentation for specifics)

## Rate Limits and Best Practices

### Rate Limiting

- Fonnte implements rate limiting to prevent abuse
- Specific limits depend on your subscription plan
- Use the `delay` parameter to control message timing

### Best Practices

1. **Always check device connection** before sending bulk messages
2. **Use appropriate delays** between messages to avoid blocks
3. **Monitor your quota** and deposit balance
4. **Validate phone numbers** before sending
5. **Handle errors gracefully** with retry logic

## Error Handling

### Common Response Codes

The API returns JSON responses with status information:

```json
{
  "status": true,
  "message": "Success",
  "data": {
    "id": "message_id_here"
  }
}
```

### Error Response Format

```json
{
  "status": false,
  "message": "Error description",
  "error_code": "ERROR_CODE"
}
```

## Webhooks

### Webhook Configuration

Webhooks can be configured in your Fonnte dashboard to receive:
- Incoming message notifications
- Message status updates
- Device status changes

### Webhook Security

- Fonnte may implement webhook signature verification
- Check your dashboard for webhook URL configuration
- Ensure your endpoint can handle POST requests

## API Response Formats

### Successful Send Response

```json
{
  "status": true,
  "message": "Message sent successfully",
  "data": {
    "id": "unique_message_id",
    "target": "6281234567890",
    "message": "Your message content"
  }
}
```

### Error Response

```json
{
  "status": false,
  "message": "Device not connected",
  "error_code": "DEVICE_DISCONNECTED"
}
```

## Important Notes

### Recent Updates (January 2025)

- **Button Features Deprecated**: All button features have been deprecated as of January 27, 2025
- **Poll Features**: WhatsApp polls remain available with support for 2-12 choices and single/multiple selection
- **New Optimizations**: More features and optimizations added in early February 2025
- **Interactive Alternatives**: Use polls instead of buttons for interactive bot functionality
- **API Stability**: Check official documentation for the latest changes

### Limitations

1. **Device Connection Required**: Your device must be connected to WhatsApp Web
2. **WhatsApp Terms**: Comply with WhatsApp's terms of service
3. **Indonesia Focus**: Service primarily designed for Indonesian market
4. **Unofficial API**: This is an unofficial WhatsApp API gateway

## Support and Resources

- **Official Documentation**: https://docs.fonnte.com/
- **API Send Message Docs**: https://docs.fonnte.com/api-send-message/
- **English Documentation**: https://docs.fonnte.com/language/en/
- **PHP Tutorial**: https://docs.fonnte.com/send-whatsapp-message-with-php-api/
- **Main Website**: https://fonnte.com/

## Postman Collection

Fonnte provides a Postman collection for testing API endpoints. Check the official documentation for download links and usage instructions.

---

**Disclaimer**: This documentation is based on publicly available information from Fonnte's official documentation. Always refer to the latest official documentation at https://docs.fonnte.com/ for the most up-to-date information, as API specifications may change.