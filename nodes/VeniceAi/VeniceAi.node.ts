import type { IExecuteFunctions, ILoadOptionsFunctions, INodeExecutionData, INodeType, INodeTypeDescription, IDataObject, INodePropertyOptions, IHttpRequestMethods, IRequestOptions, IBinaryKeyData, } from 'n8n-workflow';
import { NodeOperationError, NodeExecutionOutput } from 'n8n-workflow';
import { Readable } from 'stream';


export class VeniceAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Venice.ai',
		name: 'veniceAi',
		icon: 'file:veniceai.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Interact with Venice AI API',
		defaults: {
			name: 'Venice.ai',
		},
		inputs: ['main'], // Corrected to an array
		outputs: ['main'], // Corrected to an array
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
					{
						name: 'Images',
						value: 'images',
						description: 'Generate an image',
						action: 'Generate an image',
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
				description: 'Choose from the list. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
				displayOptions: {
					show: {
						operation: ['chat'],
					},
				},
			},
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				description: 'The prompt to generate an image',
				required: true,
				displayOptions: {
					show: {
						operation: ['images'],
					},
				},
			},
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				default: 0.9,
				description: 'What sampling temperature to use',
				displayOptions: {
					show: {
						operation: ['chat'],
					},
				},
			},
			{
				displayName: 'Chat Options',
				name: 'chatOptions',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: ['chat'],
					},
				},
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
			{
				displayName: 'Image Options',
				name: 'imageOptions',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: ['images'],
					},
				},
				options: [
					{
						displayName: 'Width',
						name: 'width',
						type: 'number',
						default: 1024,
						description: 'Width of the generated image',
					},
					{
						displayName: 'Height',
						name: 'height',
						type: 'number',
						default: 1024,
						description: 'Height of the generated image',
					},
					{
						displayName: 'Steps',
						name: 'steps',
						type: 'number',
						default: 30,
						description: 'Number of steps to generate the image',
					},
					{
						displayName: 'Hide Watermark',
						name: 'hide_watermark',
						type: 'boolean',
						default: false,
						description: 'Whether to hide the watermark',
					},
					{
						displayName: 'Seed',
						name: 'seed',
						type: 'number',
						default: 123,
						description: 'Seed to use for generating the image',
					},
					{
						displayName: 'CFG Scale',
						name: 'cfg_scale',
						type: 'number',
						default: 123,
						description: 'CFG scale to use for generating the image',
					},
					{
						displayName: 'Style Preset',
						name: 'style_preset',
						type: 'string',
						default: '',
						description: 'Style preset to use for generating the image',
					},
					{
						displayName: 'Negative Prompt',
						name: 'negative_prompt',
						type: 'string',
						default: '',
						description: 'Negative prompt to use for generating the image',
					},

					{
						displayName: 'Return Binary',
						name: 'return_binary',
						type: 'boolean',
						default: false,
						description: 'Whether to return binary image data instead of base64',
					},

				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('veniceAiApi');
				const operation = this.getCurrentNodeParameter('operation') as string;

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

					let models = response.data
						.filter((model: any) => model.id && model.object === 'model')
						.map((model: any) => ({
							name: model.id,
							value: model.id,
							description: model.type,
						}))
						.sort((a: INodePropertyOptions, b: INodePropertyOptions) => a.name.localeCompare(b.name));

					if (operation === 'chat') {
						models = models.filter((model: INodePropertyOptions) => model.description?.includes('text'));
					} else if (operation === 'images') {
						models = models.filter((model: INodePropertyOptions) => model.description?.includes('image'));
					}

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
		let returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('veniceAiApi');

		if (!credentials?.apiKey) {
			throw new NodeOperationError(this.getNode(), 'No valid API key provided');
		}

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const model = this.getNodeParameter('model', i) as string;

				if (operation === 'chat') {
					const message = this.getNodeParameter('message', i) as string;
					const temperature = this.getNodeParameter('temperature', i) as number;
					const chatOptions = this.getNodeParameter('chatOptions', i) as IDataObject;

					const messages = [];

					// Add system message if provided
					if (chatOptions.system_prompt) {
						messages.push({ role: 'system', content: chatOptions.system_prompt });
					}

					// Add user message
					messages.push({ role: 'user', content: message });

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
								include_venice_system_prompt: (chatOptions as any)['include_venice_system_prompt'] ?? false,
							},
							...Object.fromEntries(Object.entries(chatOptions).filter(([key]) => !['system_prompt', 'include_venice_system_prompt'].includes(key))),
						},
						json: true,
					};

					const response = await this.helpers.request(options);
					this.logger.debug('Response from API:', response);

					if (!response?.choices?.[0]?.message?.content) {
						this.logger.error('Invalid response format from Venice AI API');
						throw new NodeOperationError(
							this.getNode(),
							'Invalid response format from Venice AI API',
						);
					}

					const messageContent = response.choices[0].message.content.trim();
					this.logger.debug('Message content:', messageContent);

					returnData.push({
						json: {
							output: messageContent,
						},
						pairedItem: {
							item: i,
						},
					});
				} else if (operation === 'images') {
					const prompt = this.getNodeParameter('prompt', i) as string;
					const imageOptions = this.getNodeParameter('imageOptions', i) as IDataObject;

					//let jsonResponse = true as boolean;

					let options: IRequestOptions;

					if (imageOptions.return_binary) {
						options = {
							url: 'https://api.venice.ai/api/v1/image/generate',
							headers: {
								Authorization: `Bearer ${credentials.apiKey}`,
								'Content-Type': 'application/json',
							},
							method: 'POST' as IHttpRequestMethods,
							body: {
								model,
								prompt,
								width: imageOptions.width,
								height: imageOptions.height,
								steps: imageOptions.steps,
								hide_watermark: imageOptions.hide_watermark,
								seed: imageOptions.seed,
								cfg_scale: imageOptions.cfg_scale,
								style_preset: imageOptions.style_preset,
								negative_prompt: imageOptions.negative_prompt,
								return_binary: imageOptions.return_binary
							},
							json: false, // Set json to false to get the response as a buffer
							encoding: null, // Set encoding to null to get the response as a buffer
						};

					} else {
						options = {
							url: 'https://api.venice.ai/api/v1/image/generate',
							headers: {
								Authorization: `Bearer ${credentials.apiKey}`,
								'Content-Type': 'application/json',
							},
							method: 'POST' as IHttpRequestMethods,
							body: {
								model,
								prompt,
								width: imageOptions.width,
								height: imageOptions.height,
								steps: imageOptions.steps,
								hide_watermark: imageOptions.hide_watermark,
								seed: imageOptions.seed,
								cfg_scale: imageOptions.cfg_scale,
								style_preset: imageOptions.style_preset,
								negative_prompt: imageOptions.negative_prompt,
								return_binary: imageOptions.return_binary
							},
							json: true, // Set json to false to get the response as a buffer
						};

					}

					const response = await this.helpers.request(options);
					this.logger.debug('Response from API:', response);

					if (imageOptions.return_binary) {
						this.sendMessageToUI("return_binary Enabled");

						const outputPropertyName = this.getNodeParameter(
							'options.response.response.outputPropertyName',
							0,
							'data',
						) as string;

						const newItem: INodeExecutionData = {
							json: {},
							binary: {},
							pairedItem: {
								item: i,
							},
						};

						let binaryData: Buffer | Readable;
						Object.assign(newItem.binary as IBinaryKeyData, items[i].binary);
						const responseContentType = 'image/png';

						newItem.json = items[i].json;
						binaryData = response;

						const preparedBinaryData = await this.helpers.prepareBinaryData(
							binaryData,
							undefined,
							responseContentType || undefined,
						);
						preparedBinaryData.fileName = 'image.png';
						newItem.binary![outputPropertyName] = preparedBinaryData;
						returnData.push(newItem);

					} else {
						returnData.push({
							json: {
								response,
							},
							pairedItem: {
								item: i,
							},
						});
					}

				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as Error).message,
						},
						pairedItem: {
							item: i,
						},
					});
					continue;
				}
				throw error;
			}
		}

		const replaceNullValues = (item: INodeExecutionData) => {
			if (item.json === null) {
				item.json = {};
			}
			return item;
		};

		returnData = returnData.map(replaceNullValues);

		if (
			returnData.length === 1 &&
			returnData[0].json.data &&
			Array.isArray(returnData[0].json.data)
		) {
			return new NodeExecutionOutput(
				[returnData],
				[
					{
						message:
							'To split the contents of ‘data’ into separate items for easier processing, add a ‘Spilt Out’ node after this one',
						location: 'outputPane',
					},
				],
			);
		}

		return [returnData];


	}
}
