# n8n-nodes-veniceai

This is an n8n community node. It lets you use Venice.ai API in your n8n workflows.

[Venice.ai](https://venice.ai) Venice API enables you to harness the power of advanced AI models for text and image generation while maintaining the highest standards of privacy and performance.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

### Venice's Values

- **Privacy-First Architecture**: Built from the ground up with user privacy as a core principle. Venice does not utilize or store user data for any purposes whatsoever.
- **Open-Source**: Venice only utilizes open-source models to ensure users have full transparency into the models they are interacting with.
- **OpenAI API Compatible**: Seamless integration with existing OpenAI clients using the Venice API base URL.



## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

### Chat Completions

- Endpoint: /api/v1/chat/completions
- Documentation: [Chat Completions API Reference](https://docs.venice.ai/api-reference/endpoint/chat/completions)
- Purpose: Generate text responses in a chat-like format
- Features:
  - Text chat with customizable parameters
  - Vision model support for image analysis
  - Web search capability for up-to-date information
  - System prompts for controlling model behavior
  - Temperature and other generation parameters

### Images Generate

- Endpoint: /api/v1/images/generate
- Documentation: [Images Generate API Reference](https://docs.venice.ai/api-reference/endpoint/image/generate)
- Purpose: Generate images
- Features:
  - Customizable image dimensions
  - Control over generation steps and parameters
  - Style presets and negative prompts
  - Binary or base64 image output

### Speech Generation

- Endpoint: /api/v1/audio/speech
- Documentation: [Speech API Reference](https://docs.venice.ai/api-reference/endpoint/audio/speech)
- Purpose: Convert text to speech
- Features:
  - Multiple voice options (male and female voices)
  - Adjustable speech speed (0.25x to 4.0x)
  - Multiple audio formats (MP3, Opus, AAC, FLAC, WAV, PCM)
  - Streaming support for sentence-by-sentence output
  - Maximum text length of 4096 characters

## Vision Models

The node supports vision-enabled models (like qwen-2.5-vl) that can analyze images. To use this feature:

1. Select a vision-enabled model
2. Enable the "Binary Image" option
3. Specify the binary property containing your image (data0)
4. Enter your question about the image ({{ $json.chatInput }})
5. The model will analyze the image and respond to your query

## Web Search

The node supports web search capabilities for retrieving up-to-date information. To use this feature:

1. In Chat Options, find the "Web Search" setting
2. Choose from three options:
   - Auto: Let the model decide when to use web search
   - On: Force web search on
   - Off: Force web search off
3. The model will automatically search the web when needed to provide current information

Example use cases:
- Current events and news
- Real-time information
- Fact-checking and verification
- Research and data gathering

## Credentials

Venice's API is protected via API keys. To generate a key, you must be a [Venice Pro User](https://venice.ai/pricing).

## Compatibility

Tested on n8n Version 1.71.3

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* [Venice.ai API reference](https://docs.venice.ai/api-reference/api-spec)

## Changelog

### v1.1
- First public version

### v1.2
- New credentials node with API key verification
- Venice logo icon added to credentials node
- Added model filtering to only show text models for Chat and image models for images

### v1.3
- Return Binary image option added

### v1.4
- Added support for vision-enabled models
- New Binary Image input option for image analysis
- Updated model filtering to include vision models
- Improved error handling and logging

### v1.5
- Added web search capability with Auto/On/Off options
- Enhanced chat options with web search controls
- Updated documentation with web search examples

### v1.6
- Added Text to Speech functionality
- Multiple voice options with gender selection
- Adjustable speech speed and format options
- Streaming support for sentence-by-sentence output
- Binary audio output support
