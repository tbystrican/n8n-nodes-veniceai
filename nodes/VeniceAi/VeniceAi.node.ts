import type { IExecuteFunctions, ILoadOptionsFunctions, INodeExecutionData, INodeType, INodeTypeDescription, IDataObject, INodePropertyOptions, IHttpRequestMethods, IRequestOptions, } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export class VeniceAi implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Venice AI',
    name: 'veniceAi',
    icon: 'file:veniceai.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Interact with Venice AI API',
    defaults: {
      name: 'Venice AI',
    },
    inputs: '={{["main"]}}',
    outputs: '={{["main"]}}',
    credentials: [
      {
        name: 'veniceAiApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Chat',
            value: 'chat',
            description: 'Send a chat message',
            action: 'Send a chat message',
          },
        ],
        default: 'chat',
      },
      {
        displayName: 'Model Name or ID',
        name: 'model',
        type: 'options',
        noDataExpression: true,
        typeOptions: {
          loadOptionsMethod: 'getModels',
        },
        required: true,
        default: '',
        description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
      },
      {
        displayName: 'Message',
        name: 'message',
        type: 'string',
        typeOptions: {
          rows: 4,
        },
        default: '',
        description: 'The message to send to the chat model',
        required: true,
      },
      {
        displayName: 'Temperature',
        name: 'temperature',
        type: 'number',
        default: 0.9,
        description: 'What sampling temperature to use',
      },
      {
        displayName: 'Additional Fields',
        name: 'additionalFields',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        options: [
          {
            displayName: 'System Prompt',
            name: 'system_prompt',
            type: 'string',
            typeOptions: {
              rows: 4,
            },
            default: '',
            description: 'System message to set the behavior of the assistant',
            placeholder: 'You are a helpful assistant...',
          },
          {
            displayName: 'Frequency Penalty',
            name: 'frequency_penalty',
            type: 'number',
            default: 0,
            description: 'Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency.',
          },
          {
            displayName: 'Max Tokens',
            name: 'max_tokens',
            type: 'number',
            default: 1000,
            description: 'The maximum number of tokens to generate',
          },
          {
            displayName: 'Presence Penalty',
            name: 'presence_penalty',
            type: 'number',
            default: 0,
            description: 'Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far.',
          },
          {
            displayName: 'Top P',
            name: 'top_p',
            type: 'number',
            default: 1,
            description: 'An alternative to sampling with temperature, called nucleus sampling',
          },
          {
            displayName: 'Include Venice System Prompt',
            name: 'include_venice_system_prompt',
            type: 'boolean',
            default: false,
            description: 'Whether to include the Venice system prompt in the response',
          },
        ],
      },
    ],
  };

  methods = {
    loadOptions: {
      async getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const credentials = await this.getCredentials('veniceAiApi');
        const options: IRequestOptions = {
          url: 'https://api.venice.ai/api/v1/models',
          headers: {
            Authorization: `Bearer ${credentials.apiKey}`,
          },
          method: 'GET' as IHttpRequestMethods,
          json: true,
        };
        try {
          const response = await this.helpers.request(options);
          if (!response?.data || !Array.isArray(response.data)) {
            throw new NodeOperationError(
              this.getNode(),
              'Invalid response format from Venice AI API',
            );
          }
          const models = response.data
            .filter((model: any) => model.id && model.object === 'model')
            .map((model: any) => ({
              name: model.id,
              value: model.id,
              description: model.type,
            }))
            .sort((a: INodePropertyOptions, b: INodePropertyOptions) => a.name.localeCompare(b.name));
          if (models.length === 0) {
            throw new NodeOperationError(
              this.getNode(),
              'No models found in Venice AI API response',
            );
          }
          return models;
        } catch (error) {
          throw new NodeOperationError(
            this.getNode(),
            `Failed to load models: ${(error as Error).message}`,
          );
        }
      },
    },
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const items = this.getInputData();
  const returnData: INodeExecutionData[] = [];
  const credentials = await this.getCredentials('veniceAiApi');
  if (!credentials?.apiKey) {
    throw new NodeOperationError(this.getNode(), 'No valid API key provided');
  }
  for (let i = 0; i < items.length; i++) {
    try {
      const operation = this.getNodeParameter('operation', i) as string;
      const model = this.getNodeParameter('model', i) as string;
      const message = this.getNodeParameter('message', i) as string;
      const temperature = this.getNodeParameter('temperature', i) as number;
      const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
      if (operation === 'chat') {
        const messages = [];
        // Add system message if provided
        if (additionalFields.system_prompt) {
          messages.push({ role: 'system', content: additionalFields.system_prompt, });
        }
        // Add user message
        messages.push({ role: 'user', content: message, });
        const options: IRequestOptions = {
          url: 'https://api.venice.ai/api/v1/chat/completions',
          headers: {
            Authorization: `Bearer ${credentials.apiKey}`,
            'Content-Type': 'application/json',
          },
          method: 'POST' as IHttpRequestMethods,
          body: {
            model,
            messages,
            temperature,
            venice_parameters: {
              include_venice_system_prompt: (additionalFields as any)['include_venice_system_prompt'] ?? false,
            },
            ...Object.fromEntries(Object.entries(additionalFields).filter(([key]) => !['system_prompt', 'include_venice_system_prompt'].includes(key))),
          },
          json: true,
        };
        const response = await this.helpers.request(options);
        if (!response?.choices?.[0]?.message?.content) {
          throw new NodeOperationError(
            this.getNode(),
            'Invalid response format from Venice AI API',
          );
        }
        const messageContent = response.choices[0].message.content.trim();
        returnData.push({ 
          json: { 
            response: messageContent, 
          }, 
          pairedItem: { item: i }, 
        }); 

      }
    } catch (error) {
      if (this.continueOnFail()) {
        returnData.push({ 
          json: { 
            error: (error as Error).message, 
          }, 
          pairedItem: { item: i }, 
        });
        continue;
      }
      throw error;
    }
  }
  return [returnData];
}
}