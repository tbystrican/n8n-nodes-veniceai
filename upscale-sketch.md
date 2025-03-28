# Venice AI Image Upscaling Implementation Sketch

## 1. Operation Addition

Add "upscale" to the operation options enum:

```typescript
{
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  options: [
    {
      name: 'Chat',
      value: 'chat',
      description: 'Chat with the AI model',
    },
    {
      name: 'Images',
      value: 'images',
      description: 'Generate images',
    },
    {
      name: 'Speech',
      value: 'speech',
      description: 'Convert text to speech',
    },
    {
      name: 'Upscale',
      value: 'upscale',
      description: 'Upscale images to higher resolution',
    },
  ],
  default: 'chat',
}
```

## 2. UI Parameters for Upscaling

Add the following parameters specific to the upscale operation:

```typescript
{
  displayName: 'Binary Image',
  name: 'binaryImageUpscale',
  type: 'boolean',
  default: true,
  required: true,
  description: 'Provide an image from binary data',
  displayOptions: {
    show: {
      operation: ['upscale'],
    },
  },
},
{
  displayName: 'Binary Image Property',
  name: 'binaryImageUpscaleProperty',
  type: 'string',
  default: 'data',
  description: 'Name of the binary property containing the image to upscale',
  displayOptions: {
    show: {
      operation: ['upscale'],
      binaryImageUpscale: [true],
    },
  },
},
{
  displayName: 'Scale Factor',
  name: 'scaleFactor',
  type: 'options',
  options: [
    {
      name: '2x Original Size',
      value: 2,
      description: 'Upscale to twice the original resolution',
    },
    {
      name: '4x Original Size',
      value: 4,
      description: 'Upscale to four times the original resolution',
    },
  ],
  default: 4,
  description: 'How much to upscale the image by',
  displayOptions: {
    show: {
      operation: ['upscale'],
    },
  },
},
{
  displayName: 'Output Format',
  name: 'outputFormat',
  type: 'options',
  options: [
    {
      name: 'Same as Input',
      value: 'same',
      description: 'Keep the original format',
    },
    {
      name: 'PNG',
      value: 'png',
      description: 'Convert to PNG format',
    },
    {
      name: 'JPEG',
      value: 'jpeg',
      description: 'Convert to JPEG format',
    },
  ],
  default: 'same',
  description: 'Format of the output image',
  displayOptions: {
    show: {
      operation: ['upscale'],
    },
  },
}
```

## 3. Execute Method Implementation

Add the upscale functionality to the execute method:

```typescript
// Inside the execute method
if (operation === 'upscale') {
  const binaryImageUpscale = this.getNodeParameter('binaryImageUpscale', i) as boolean;
  const scaleFactor = this.getNodeParameter('scaleFactor', i) as number;
  const outputFormat = this.getNodeParameter('outputFormat', i) as string;
  
  let formData: FormData;
  let binaryPropertyName: string;
  let fileName: string;
  let mimeType: string;
  
  // Get the binary image data
  if (binaryImageUpscale) {
    binaryPropertyName = this.getNodeParameter('binaryImageUpscaleProperty', i) as string;
    
    if (items[i].binary === undefined) {
      throw new NodeOperationError(
        this.getNode(),
        'No binary data exists on item!',
      );
    }
    
    if (items[i].binary[binaryPropertyName] === undefined) {
      throw new NodeOperationError(
        this.getNode(),
        `No binary data property '${binaryPropertyName}' exists on item!`,
      );
    }
    
    const binaryData = items[i].binary[binaryPropertyName];
    const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
    fileName = binaryData.fileName || 'image';
    mimeType = binaryData.mimeType || 'application/octet-stream';
    
    // Verify it's an image
    if (!mimeType.includes('image/')) {
      throw new NodeOperationError(
        this.getNode(),
        'The provided binary data is not an image!',
      );
    }
    
    // Create the form data
    formData = new FormData();
    formData.append('image', new Blob([binaryDataBuffer], { type: mimeType }), fileName);
    formData.append('scale', scaleFactor.toString());
  } else {
    throw new NodeOperationError(
      this.getNode(),
      'Upscaling requires a binary image input',
    );
  }
  
  const options: IRequestOptions = {
    url: 'https://api.venice.ai/api/v1/image/upscale',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${credentials.apiKey}`,
    },
    formData,
    encoding: null, // Important: This ensures the response is treated as binary
    resolveWithFullResponse: true,
  };
  
  try {
    const response = await this.helpers.request(options);
    
    // Get the mime type
    let responseMimeType = 'image/png'; // Default
    if (response.headers['content-type']) {
      responseMimeType = response.headers['content-type'];
    }
    
    // Determine output filename
    let outputFileName = fileName;
    if (outputFormat !== 'same') {
      const fileNameWithoutExtension = fileName.split('.').slice(0, -1).join('.');
      outputFileName = `${fileNameWithoutExtension}.${outputFormat}`;
      
      if (outputFormat === 'png') {
        responseMimeType = 'image/png';
      } else if (outputFormat === 'jpeg') {
        responseMimeType = 'image/jpeg';
      }
    }
    
    // Save the binary data
    const newItem: INodeExecutionData = {
      json: {
        success: true,
        filename: outputFileName,
        format: responseMimeType,
        scale: scaleFactor,
      },
      binary: {
        data: await this.helpers.prepareBinaryData(
          response.body,
          outputFileName,
          responseMimeType,
        ),
      },
    };
    
    return [newItem];
  } catch (error) {
    if (this.continueOnFail()) {
      return [{
        json: {
          error: error.message,
        },
      }];
    }
    throw error;
  }
}
```

## 4. FormData Handling

Ensure FormData is available in your node:

```typescript
// If not already imported
import { FormData } from 'formdata-node';
```

Or use the built-in form-data handling in n8n's request helper if available.

## 5. Testing Considerations

When testing the upscale operation:

1. Test with different image formats (JPEG, PNG)
2. Verify both 2x and 4x scale factors work correctly
3. Test handling of large images
4. Verify error handling for invalid inputs

## 6. Next Steps

After implementing this basic upscaling functionality, we could enhance it with:

1. Progress indicators for large images
2. Image validation (size, dimensions)
3. Batch processing for multiple images
