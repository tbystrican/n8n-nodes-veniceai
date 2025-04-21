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

## Configuration

### API Key
You'll need to provide your Venice.ai API key to use this node. You can get your API key from your [Venice.ai dashboard](https://venice.ai).

### Base URL
The node supports custom Base URL configuration, allowing you to:
- Use different Venice.ai API environments
- Connect to self-hosted instances
- Configure proxy settings if needed

By default, the Base URL is set to `https://api.venice.ai/api/v1`. You can modify this in the credentials settings if needed.

## Operations

### Upscale Images
- Endpoint: /api/v1/image/upscale
- Documentation: [Image Upscale API Reference](https://docs.venice.ai/api-reference/endpoint/image/upscale)
- Purpose: Increase image resolution while maintaining quality
- Features:
  - 2x or 4x upscaling options
  - Handle images up to 4096x4096 pixels
  - Batch processing support

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

## Session-Based Memory

The Venice AI node supports conversation memory through the sessionId parameter:

- Maintain context across multiple node executions
- Group related conversations with unique session IDs
- Memory context is included in API calls automatically
- Perfect for building multi-turn conversational workflows

## Tools Integration

The node supports tool selection for AI model function calling:

- Select specific tools through multi-select options
- AI can use selected tools during conversation
- Tools are included in API calls to the Venice API
- Enables more interactive and capable AI assistants

## Credentials

Venice's API is protected via API keys. To generate a key, you must be a [Venice Pro User](https://venice.ai/pricing).

## Compatibility

Tested on n8n Version 1.71.3+

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* [Venice.ai API reference](https://docs.venice.ai/api-reference/api-spec)

## Changelog

### v1.1.0
- First public version

### v1.2.0
- New credentials node with API key verification
- Venice logo icon added to credentials node
- Added model filtering to only show text models for Chat and image models for images

### v1.3.0
- Return Binary image option added

### v1.4.0
- Added support for vision-enabled models
- New Binary Image input option for image analysis
- Updated model filtering to include vision models
- Improved error handling and logging

### v1.5.0
- Added web search capability with Auto/On/Off options
- Enhanced chat options with web search controls
- Updated documentation with web search examples

### v1.6.1
- Added Text to Speech functionality
- Multiple voice options with gender selection
- Adjustable speech speed and format options
- Streaming support for sentence-by-sentence output
- Binary audio output support

### v1.7.0
- Added tools integration via multi-select options
- Implemented session-based memory through sessionId parameter
- Enhanced model selection refresh when switching between operations
- Improved model filtering based on operation type
- Added debug logging for troubleshooting
- Better error handling for model loading

### v1.7.1
- Fixed issue with web search and image format API parameters

### v1.7.2
- Fixed issue with binary image handling in chat operation
- Added option to disable tools when using models that don't support them
- Improved message structure for image analysis according to API requirements
- Better error handling for incompatible model features

### v1.8.1
- Added Upscale Images operation

### v1.9.0
- Added Base URL to credentials to be able to use various endpoints (usefull for Venice betatesters)

### v1.9.1
- Added new options to Upscale operation: Enhance, Replication, Enhance Creativity, and Prompt
- These options allow finer control over image upscaling and creativity
- All options are available in the node UI and sent to the Venice API

## Upcoming Features

The following features are planned for future releases:

### Chat Enhancements
- Tool Calls support for function calling
- Streaming support for chat completions
- Reasoning content exposure
- Advanced parameters (min_p, stop_token_ids)

### Image Capabilities
- Image upscaling operation
- Inpainting support
- EXIF metadata embedding
- Format selection options

### Multi-Modal Support
- Enhanced image and text mixed inputs
- Improved session management
- Better validation for image inputs

See our [refactoring plan](./refactor.md) for more details on upcoming features.
