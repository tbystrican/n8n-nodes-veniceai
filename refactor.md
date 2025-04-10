# Venice AI Node Enhancement Plan

## Overview
This document outlines the step-by-step plan for enhancing the Venice AI node to fully leverage the capabilities of the Venice AI API. These improvements will focus on adding missing features, improving parameter consistency, and optimizing the user experience.

## 1. Chat Operation Enhancements

### 1.1. Add Tool Calls Support
- [ ] Add tool_calls parameter in the chat options section
- [ ] Add support for function definitions in the node
- [ ] Implement handling for tool_call_id in the execute method
- [ ] Create proper parsing for tool responses
- [ ] Add parallel_tool_calls boolean parameter to control parallel function calling

### 1.2. Add Streaming Support for Chat
- [ ] Add a boolean parameter for streaming in chat operations
- [ ] Implement streaming response handling in the execute method
- [ ] Create response transformation for both streaming and non-streaming outputs
- [ ] Add proper error handling for streaming connections
- [ ] Add stream_options for including usage information in the stream

### 1.3. Add Reasoning Content Support
- [ ] Add option to expose reasoning_content in the node output
- [ ] Update the response parsing to include this information when available
- [ ] Add proper documentation for this feature

### 1.4. Improve Web Search Options
- [ ] Update web search parameters to align with API values (auto/true/false)
- [ ] Add better descriptions for each option
- [ ] Ensure parameter names match the API expectations
- [ ] Add support for web search citations in the output

## 2. Speech Operation Enhancements

### 2.1. Add Model Parameter for Speech
- [ ] Add model selection for speech operation
- [ ] Default to tts-kokoro but allow for future expansion
- [ ] Update documentation for this parameter

### 2.2. Parameter Naming Consistency
- [ ] Rename "responseFormat" to "response_format" for API consistency
- [ ] Review all parameter names for consistency with API

### 2.3. Input Validation Improvements
- [ ] Add validation for text input to ensure it doesn't exceed 4096 characters
- [ ] Implement automatic truncation or warning for exceeded limits
- [ ] Add helpful error messages

## 3. General Improvements

### 3.1. Parameter Naming Consistency
- [ ] Review all parameter names for snake_case consistency
- [ ] Update any camelCase parameters to match API expectations
- [ ] Ensure all enums match exactly with API documentation

### 3.2. Error Handling
- [ ] Improve error messages for API-specific errors
- [ ] Add better handling for rate limits and token limits
- [ ] Create user-friendly error messages for common issues

### 3.3. Documentation Updates
- [ ] Update all parameter descriptions to match API documentation
- [ ] Add examples for complex parameters
- [ ] Include tips for optimal usage

### 3.4. Code Quality
- [ ] Fix any existing lint errors
- [ ] Improve typing for response objects
- [ ] Add more debug logging for troubleshooting

## 4. New Feature Additions

### 4.1. Advanced Chat Parameters
- [ ] Add support for min_p parameter (minimum probability threshold for token selection)
- [ ] Add support for stop_token_ids parameter
- [ ] Add support for the response_format object parameter to control JSON mode
- [ ] Add logprobs support for getting token probabilities

### 4.2. Image Enhancements
- [ ] Add support for inpainting parameters
- [ ] Add support for embed_exif_metadata option
- [ ] Add format selection option (webp/png)
- [ ] Add seed parameter for deterministic outputs

### 4.3. New Image Operations
- [x] Add new operation: "upscale" for image upscaling
- [x] Implement image upload for upscaling
- [x] Add scale parameter with options for 2x and 4x upscaling
- [x] Handle binary image output in node execution
- [x] Support both JPEG and PNG formats for upscaling

### 4.4. Multi-Modal Support
- [ ] Add better support for image_url in messages
- [ ] Support for mixed text and image inputs
- [ ] Improve validation for image inputs
- [ ] Add minimum image size requirements (64 pixels square)

### 4.5. Session Management
- [ ] Enhance session ID tracking for conversation history
- [ ] Add session expiration handling
- [ ] Add option to clear conversation history

## 5. Testing Plan

### 5.1. Unit Tests
- [ ] Add tests for new parameters
- [ ] Test edge cases for each enhancement
- [ ] Validate error handling

### 5.2. Integration Tests
- [ ] Test tool calls with actual API
- [ ] Verify streaming works as expected
- [ ] Test speech with different parameters
- [ ] Test multi-modal inputs

### 5.3. User Acceptance Testing
- [ ] Create sample workflows demonstrating new features
- [ ] Gather feedback on usability
- [ ] Make refinements based on feedback

## Priorities
1. Implement Tool Calls support (highest impact)
2. Add Streaming support for chat
3. Add advanced parameters (min_p, stop_token_ids, etc.)
4. Improve parameter naming consistency
5. Enhance multi-modal support
6. Add speech model parameter
7. Enhance error handling and documentation
