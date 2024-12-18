# n8n-nodes-veniceai

This is an n8n community node. It lets you use Venice.ai API in your n8n workflows.

[Venice.ai](https://venice.ai) provides a private and uncensored AI API with features like document uploads, image generation, and customizable interactions, available in both free and paid Venice Pro versions.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  <!-- delete if no auth needed -->  
[Compatibility](#compatibility)  
[Resources](#resources)  
[Changelog](#changelog)  
 

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

### Chat Completions

- Endpoint: /api/v1/chat/completions
- Documentation: [Chat Completions API Reference](https://docs.venice.ai/api-reference/endpoint/chat/completions)
- Purpose: Generate text responses in a chat-like format

### Images Generate

- Endpoint: /api/v1/images/generate
- Documentation: [Images Generate API Reference](https://docs.venice.ai/api-reference/endpoint/image/generate)
- Purpose: Generate images



## Credentials

Venice’s API is protected via API keys. To generate a key, you must be a [Venice Pro User](https://venice.ai/pricing).


## Compatibility

Tested on n8n Version 1.71.3

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
* [Venice.ai API reference](https://docs.venice.ai/api-reference/api-spec)

## Changelog

### v1.1
- first public version

### v1.2
- new credentials node with API key verification
- venice logo icon added to credentials node
- added model filtering to only show text models for Chat and image models for images

### v1.3
- Return Binary image option added
