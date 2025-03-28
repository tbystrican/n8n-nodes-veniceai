/* eslint-disable n8n-nodes-base/node-param-description-boolean-without-whether */
/* eslint-disable n8n-nodes-base/node-param-description-excess-final-period */
/* eslint-disable n8n-nodes-base/node-param-option-name-duplicate */
/* eslint-disable n8n-nodes-base/node-param-options-type-unsorted-items */
import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	INodePropertyOptions,
	IHttpRequestMethods,
	IRequestOptions,
	IBinaryKeyData,
	INodeInputConfiguration,
} from 'n8n-workflow';
import { NodeOperationError, NodeExecutionOutput } from 'n8n-workflow';
import { Readable } from 'stream';

// Define a memory interface that matches LangChain's memory interface
interface IMemory {
	loadMemoryVariables(values: Record<string, any>): Promise<Record<string, any>>;
	saveContext(input: Record<string, any>, output: Record<string, any>): Promise<void>;
	chatHistory?: {
		getMessages(): Promise<any[]>;
	};
}

// Define an interface for tools
interface ITool {
	name: string;
	description: string;
	// Allow the call method to accept either string or object
	call(arg: string | object): Promise<string>;
	schema?: Record<string, any>;
	// Add methods that langchain tools use in n8n
	_call?(arg: string | object): Promise<string>;
	_schema?: Record<string, any>;
}

// Extract the final string value no matter how deeply nested
function extractFinalStringValue(obj: any): string {
	// If already a string, just return it
	if (typeof obj === 'string') {
		return obj;
	}

	// If not an object or null, convert to string and return
	if (typeof obj !== 'object' || obj === null) {
		return String(obj);
	}

	// Direct handling of the {query:{query:"1+1"}} pattern that causes issues
	if (obj.query && typeof obj.query === 'object' && obj.query.query !== undefined) {
		return String(obj.query.query);
	}

	// Normal handling of query property
	if (obj.query !== undefined) {
		if (typeof obj.query === 'object' && obj.query !== null) {
			// Try first property of nested query object
			const innerKeys = Object.keys(obj.query);
			if (innerKeys.length > 0) {
				return String(obj.query[innerKeys[0]]);
			}
		} else {
			return String(obj.query);
		}
	}

	// Try other common properties
	const commonProps = ['expression', 'input', 'text', 'value', 'content'];
	for (const prop of commonProps) {
		if (obj[prop] !== undefined) {
			if (typeof obj[prop] === 'object' && obj[prop] !== null) {
				// Recursively extract from nested object
				return extractFinalStringValue(obj[prop]);
			}
			return String(obj[prop]);
		}
	}

	// If no common properties, try the first property
	const keys = Object.keys(obj);
	if (keys.length > 0) {
		const firstValue = obj[keys[0]];
		if (typeof firstValue === 'object' && firstValue !== null) {
			// Recursively extract from nested object
			return extractFinalStringValue(firstValue);
		}
		return String(firstValue);
	}

	// Return empty string as last resort
	return '';
}

import { jsonParse } from 'n8n-workflow';

export class VeniceAi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'VeniceAi',
		name: 'veniceAi',
		icon: 'file:veniceai.svg',
		group: ['transform'],
		version: 1,
		description: 'Use VeniceAi AI models.',
		subtitle: '={{$parameter["operation"]}}',
		defaults: {
			name: 'VeniceAi',
		},
		inputs: [
			{
				displayName: 'Main',
				type: 'main',
			},
			{
				displayName: 'Memory',
				type: 'ai_memory',
				required: false,
				maxConnections: 1,
			},
			{
				displayName: 'Tools',
				type: 'ai_tool',
				required: false,
				maxConnections: 20,
			},
		] as INodeInputConfiguration[],
		outputs: ['main'],
		credentials: [
			{
				name: 'veniceAiApi',
				required: true,
			},
		],
		// Standard n8n input properties
		properties: [
			// {
			// 	displayName: 'Tools',
			// 	name: 'tools',
			// 	type: 'collection',
			// 	placeholder: 'Add Tool',
			// 	default: {},
			// 	options: [
			// 		{
			// 			displayName: 'Functions',
			// 			name: 'functions',
			// 			type: 'fixedCollection',
			// 			typeOptions: {
			// 				multipleValues: true,
			// 			},
			// 			default: {},
			// 			options: [
			// 				{
			// 					name: 'functionValues',
			// 					displayName: 'Function',
			// 					values: [
			// 						{
			// 							displayName: 'Name',
			// 							name: 'name',
			// 							type: 'string',
			// 							default: '',
			// 							description: 'The name of the function to be called',
			// 						},
			// 						{
			// 							displayName: 'Description',
			// 							name: 'description',
			// 							type: 'string',
			// 							default: '',
			// 							description: 'A description of what the function does',
			// 						},
			// 						{
			// 							displayName: 'Parameters',
			// 							name: 'parameters',
			// 							type: 'json',
			// 							default: '{}',
			// 							description: 'The parameters the function accepts (JSON Schema object)',
			// 						},
			// 					],
			// 				},
			// 			],
			// 		},
			// 	],
			// },
			// {
			// 	displayName: 'Tools',
			// 	name: 'tools',
			// 	type: 'json',
			// 	default: {},
			// 	displayOptions: {
			// 		show: {
			// 			operation: ['chat'],
			// 		},
			// 	},
			// 	description: 'Tools configuration for function calling and external integrations',
			// },
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Chat',
						value: 'chat',
						description: 'Send a chat message (supports text and images)',
						action: 'Send a chat message',
					},
					{
						name: 'Images',
						value: 'images',
						description: 'Generate an image',
						action: 'Generate an image',
					},
					{
						name: 'Speech',
						value: 'speech',
						description: 'Convert text to speech',
						action: 'Generate speech from text',
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
					loadOptionsDependsOn: ['operation'],
				},
				required: true,
				default: '',
				description:
					'Choose from the list. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				displayOptions: {
					show: {
						operation: ['chat', 'images'],
					},
				},
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				description: 'The message to send to the chat model.',
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
				description: 'The prompt to generate an image.',
				required: true,
				displayOptions: {
					show: {
						operation: ['images'],
					},
				},
			},
			{
				displayName: 'Image Size',
				name: 'size',
				type: 'options',
				options: [
					{ name: '256x256', value: '256x256' },
					{ name: '512x512', value: '512x512' },
					{ name: '1024x1024', value: '1024x1024' },
					{ name: '1024x1792', value: '1024x1792' },
					{ name: '1792x1024', value: '1792x1024' },
				],
				default: '1024x1024',
				description: 'The size of the generated image.',
				displayOptions: {
					show: {
						operation: ['images'],
					},
				},
			},
			{
				displayName: 'Image Options',
				name: 'imageOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						operation: ['images'],
					},
				},
				options: [
					{
						displayName: 'CFG Scale',
						name: 'cfg_scale',
						type: 'number',
						typeOptions: {
							minValue: 0.1,
							maxValue: 20,
						},
						default: 7.5,
						description: 'Controls the image generation process. Higher values lead to more adherence to the prompt.',
					},
					{
						displayName: 'Embed EXIF Metadata',
						name: 'embed_exif_metadata',
						type: 'boolean',
						default: false,
						description: 'Option to embed metadata about the generation in the image EXIF data',
					},
					{
						displayName: 'Format',
						name: 'format',
						type: 'options',
						options: [
							{ name: 'PNG', value: 'png' },
							{ name: 'WEBP', value: 'webp' },
							{ name: 'JPEG', value: 'jpeg' },
						],
						default: 'png',
						description: 'The format of the generated image.',
					},
					{
						displayName: 'Height',
						name: 'height',
						type: 'number',
						typeOptions: {
							minValue: 1,
							maxValue: 1280,
						},
						default: 1024,
						description: 'The height of the generated image. Requires values divisible by the model-specific divisor.',
					},
					{
						displayName: 'Hide Watermark',
						name: 'hide_watermark',
						type: 'boolean',
						default: false,
						description: 'Option to hide the Venice watermark',
					},
					{
						displayName: 'LoRA Strength',
						name: 'lora_strength',
						type: 'number',
						typeOptions: {
							minValue: 0,
							maxValue: 100,
						},
						default: 50,
						description: 'Lora strength for the model. Only applies if the model uses additional LoRAs.',
					},
					{
						displayName: 'Negative Prompt',
						name: 'negative_prompt',
						type: 'string',
						typeOptions: {
							rows: 2,
						},
						default: '',
						description: 'Items to exclude from the generated image.',
					},
					{
						displayName: 'Return Binary',
						name: 'return_binary',
						type: 'boolean',
						default: false,
						description: 'Option to return binary image data instead of base64',
					},
					{
						displayName: 'Response Format',
						name: 'response_format',
						type: 'options',
						options: [
							{ name: 'URL', value: 'url' },
							{ name: 'Base64 JSON', value: 'b64_json' },
						],
						default: 'url',
						description: 'The format in which the generated images are returned.',
					},
					{
						displayName: 'Safe Mode',
						name: 'safe_mode',
						type: 'boolean',
						default: false,
						description: 'Option to blur images classified as having adult content',
					},
					{
						displayName: 'Seed',
						name: 'seed',
						type: 'number',
						default: 0,
						description: 'Random seed for generation. Set to 0 for a random seed each time.',
					},
					{
						displayName: 'Steps',
						name: 'steps',
						type: 'number',
						typeOptions: {
							minValue: 1,
							maxValue: 50,
						},
						default: 20,
						description: 'Number of inference steps. Higher values may produce better results but take longer.',
					},
					{
						displayName: 'Style Preset',
						name: 'style_preset',
						type: 'options',
						options: [
							{ name: '3D Model', value: '3D Model' },
							{ name: 'Analog Film', value: 'Analog Film' },
							{ name: 'Anime', value: 'Anime' },
							{ name: 'Cinematic', value: 'Cinematic' },
							{ name: 'Comic Book', value: 'Comic Book' },
							{ name: 'Digital Art', value: 'Digital Art' },
							{ name: 'Enhance', value: 'Enhance' },
							{ name: 'Fantasy Art', value: 'Fantasy Art' },
							{ name: 'Isometric', value: 'Isometric' },
							{ name: 'Line Art', value: 'Line Art' },
							{ name: 'Low Poly', value: 'Low Poly' },
							{ name: 'Modeling Compound', value: 'Modeling Compound' },
							{ name: 'Neon Punk', value: 'Neon Punk' },
							{ name: 'Origami', value: 'Origami' },
							{ name: 'Photographic', value: 'Photographic' },
							{ name: 'Pixel Art', value: 'Pixel Art' },
							{ name: 'Tile Texture', value: 'Tile Texture' },
						],
						default: 'Photographic',
						description: 'The style preset to use for image generation.',
					},
					{
						displayName: 'Width',
						name: 'width',
						type: 'number',
						typeOptions: {
							minValue: 1,
							maxValue: 1280,
						},
						default: 1024,
						description: 'The width of the generated image. Requires values divisible by the model-specific divisor.',
					},
				],
			},
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				default: 0.9,
				description: 'What sampling temperature to use.',
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
						displayName: 'Enable Web Search',
						name: 'enable_web_search',
						type: 'options',
						options: [
							{
								name: 'Auto',
								value: 'auto',
								description: 'Let Venice AI determine when to search the web to answer user queries.'
							},
							{
								name: 'Always',
								value: 'true',
								description: 'Always search the web to answer user queries.',
							},
							{
								name: 'Never',
								value: 'false',
								description: 'Never search the web to answer user queries.',
							},
						],
						default: 'auto',
						description: 'Controls web search for answering queries.',
					},
					{
						displayName: 'Frequency Penalty',
						name: 'frequency_penalty',
						type: 'number',
						default: 0,
						description:
							'Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency.',
					},
					{
						displayName: 'Max Tokens',
						name: 'max_tokens',
						type: 'number',
						default: 1000,
						description: 'The maximum number of tokens to generate.',
					},
					{
						displayName: 'Presence Penalty',
						name: 'presence_penalty',
						type: 'number',
						default: 0,
						description:
							'Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far.',
					},
					{
						displayName: 'Top P',
						name: 'top_p',
						type: 'number',
						default: 1,
						description: 'An alternative to sampling with temperature, called nucleus sampling.',
					},
					{
						displayName: 'Include Venice System Prompt',
						name: 'include_venice_system_prompt',
						type: 'boolean',
						default: false,
						description: 'Option to include the Venice default system prompt',
					},
				],
			},
			{
				displayName: 'Binary Image',
				name: 'binaryImage',
				type: 'boolean',
				default: false,
				description: 'Option to include an image from binary input',
				displayOptions: {
					show: {
						operation: ['chat'],
					},
				},
			},
			{
				displayName: 'Binary Image Property',
				name: 'binaryImageProperty',
				type: 'string',
				default: 'data',
								description: 'Name of the binary property containing the image.',
				displayOptions: {
					show: {
						operation: ['chat'],
						binaryImage: [true],
					},
				},
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
								description: 'The text to convert to speech (max 4096 characters).',
				required: true,
				displayOptions: {
					show: {
						operation: ['speech'],
					},
				},
			},
			{
				displayName: 'Voice',
				name: 'voice',
				type: 'options',
				options: [
					{ name: 'Alloy (Female)', value: 'af_alloy' },
					{ name: 'Aoede (Female)', value: 'af_aoede' },
					{ name: 'Bella (Female)', value: 'af_bella' },
					{ name: 'Heart (Female)', value: 'af_heart' },
					{ name: 'Jadzia (Female)', value: 'af_jadzia' },
					{ name: 'Jessica (Female)', value: 'af_jessica' },
					{ name: 'Kore (Female)', value: 'af_kore' },
					{ name: 'Nicole (Female)', value: 'af_nicole' },
					{ name: 'Nova (Female)', value: 'af_nova' },
					{ name: 'River (Female)', value: 'af_river' },
					{ name: 'Sarah (Female)', value: 'af_sarah' },
					{ name: 'Sky (Female)', value: 'af_sky' },
					{ name: 'Adam (Male)', value: 'am_adam' },
					{ name: 'Echo (Male)', value: 'am_echo' },
					{ name: 'Eric (Male)', value: 'am_eric' },
					{ name: 'Fenrir (Male)', value: 'am_fenrir' },
					{ name: 'Liam (Male)', value: 'am_liam' },
					{ name: 'Michael (Male)', value: 'am_michael' },
					{ name: 'Onyx (Male)', value: 'am_onyx' },
					{ name: 'Puck (Male)', value: 'am_puck' },
					{ name: 'Santa (Male)', value: 'am_santa' },
					{ name: 'Alice (Female)', value: 'bf_alice' },
					{ name: 'Emma (Female)', value: 'bf_emma' },
					{ name: 'Lily (Female)', value: 'bf_lily' },
					{ name: 'Daniel (Male)', value: 'bm_daniel' },
					{ name: 'Fable (Male)', value: 'bm_fable' },
					{ name: 'George (Male)', value: 'bm_george' },
					{ name: 'Lewis (Male)', value: 'bm_lewis' },
					{ name: 'Dora (Female)', value: 'ef_dora' },
					{ name: 'Alex (Male)', value: 'em_alex' },
					{ name: 'Santa (Male)', value: 'em_santa' },
					{ name: 'Siwis (Female)', value: 'ff_siwis' },
					{ name: 'Alpha (Female)', value: 'hf_alpha' },
					{ name: 'Beta (Female)', value: 'hf_beta' },
					{ name: 'Omega (Male)', value: 'hm_omega' },
					{ name: 'Psi (Male)', value: 'hm_psi' },
					{ name: 'Sara (Female)', value: 'if_sara' },
					{ name: 'Nicola (Male)', value: 'im_nicola' },
					{ name: 'Alpha (Female)', value: 'jf_alpha' },
					{ name: 'Gongitsune (Female)', value: 'jf_gongitsune' },
					{ name: 'Nezumi (Female)', value: 'jf_nezumi' },
					{ name: 'Tebukuro (Female)', value: 'jf_tebukuro' },
					{ name: 'Kumo (Male)', value: 'jm_kumo' },
					{ name: 'Dora (Female)', value: 'pf_dora' },
					{ name: 'Alex (Male)', value: 'pm_alex' },
					{ name: 'Santa (Male)', value: 'pm_santa' },
					{ name: 'Xiaobei (Female)', value: 'zf_xiaobei' },
					{ name: 'Xiaoni (Female)', value: 'zf_xiaoni' },
					{ name: 'Xiaoxiao (Female)', value: 'zf_xiaoxiao' },
					{ name: 'Xiaoyi (Female)', value: 'zf_xiaoyi' },
					{ name: 'Yunjian (Male)', value: 'zm_yunjian' },
					{ name: 'Yunxi (Male)', value: 'zm_yunxi' },
					{ name: 'Yunxia (Male)', value: 'zm_yunxia' },
					{ name: 'Yunyang (Male)', value: 'zm_yunyang' },
				],
				default: 'af_sky',
				description: 'The voice to use for speech generation.',
				displayOptions: {
					show: {
						operation: ['speech'],
					},
				},
			},
			{
				displayName: 'Response Format',
				name: 'responseFormat',
				type: 'options',
				options: [
					{ name: 'MP3', value: 'mp3' },
					{ name: 'Opus', value: 'opus' },
					{ name: 'AAC', value: 'aac' },
					{ name: 'FLAC', value: 'flac' },
					{ name: 'WAV', value: 'wav' },
					{ name: 'PCM', value: 'pcm' },
				],
				default: 'mp3',
				description: 'The format of the audio response.',
				displayOptions: {
					show: {
						operation: ['speech'],
					},
				},
			},
			{
				displayName: 'Speed',
				name: 'speed',
				type: 'number',
				default: 1,
				description: 'The speed of the generated audio (0.25 to 4.0).',
				typeOptions: {
					minValue: 0.25,
					maxValue: 4,
				},
				displayOptions: {
					show: {
						operation: ['speech'],
					},
				},
			},
			{
				displayName: 'Streaming',
				name: 'streaming',
				type: 'boolean',
				default: false,
				description: 'Option to stream the audio back sentence by sentence',
				displayOptions: {
					show: {
						operation: ['speech'],
					},
				},
			},
		],
	};

	methods = {
		loadOptions: {
			async getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('veniceAiApi');
				const operation = this.getCurrentNodeParameter('operation') as string;

				this.logger.debug('Getting models for operation: ' + operation);

				var options: IRequestOptions = {
					url: 'https://api.venice.ai/api/v1/models?type=all',
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
						.sort((a: INodePropertyOptions, b: INodePropertyOptions) =>
							a.name.localeCompare(b.name),
						);

					// Filter models based on operation type
					if (operation === 'chat') {
						this.logger.debug('Filtering for chat models');
						models = models.filter((model: INodePropertyOptions) =>
							model.description?.includes('text'),
						);
					} else if (operation === 'images') {
						this.logger.debug('Filtering for image models');
						models = models.filter((model: INodePropertyOptions) =>
							model.description?.includes('image'),
						);
					} else if (operation === 'speech') {
						// For completeness, even though speech doesn't use the model parameter
						this.logger.debug('Operation is speech, no models needed');
						return [];
					}

					if (models.length === 0) {
						throw new NodeOperationError(
							this.getNode(),
							`No models found for operation: ${operation}`,
						);
					}

					this.logger.debug(`Found ${models.length} models for operation: ${operation}`);
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

	async loadMemoryVariables(this: IExecuteFunctions, values: IDataObject): Promise<IDataObject> {
		const memoryData = this.getInputData(1);
		if (!memoryData?.length) {
			return {};
		}

		// Log what we're sending to memory for debugging
		this.logger.debug('Sending to loadMemoryVariables:', values);

		const memoryRequest = {
			action: 'loadMemoryVariables',
			values,
		};

		// Send request to memory
		const memoryResponse = await this.helpers.request({
			url: 'service@memory',
			method: 'POST',
			body: memoryRequest,
			json: true,
		});

		// Log what we got back from memory
		this.logger.debug('Received from loadMemoryVariables:', memoryResponse);

		return memoryResponse || {};
	}

	async saveContext(this: IExecuteFunctions, input: IDataObject, output: IDataObject): Promise<IDataObject> {
		const memoryData = this.getInputData(1);
		if (!memoryData?.length) {
			return {};
		}

		// Log what we're sending to memory for debugging
		this.logger.debug('Sending to saveContext:', { input, output });

		const memoryRequest = {
			action: 'saveContext',
			input,
			output,
		};

		// Send request to memory
		const memoryResponse = await this.helpers.request({
			url: 'service@memory',
			method: 'POST',
			body: memoryRequest,
			json: true,
		});

		// Log what we got back from memory
		this.logger.debug('Received from saveContext:', memoryResponse);

		return memoryResponse || {};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData(0);
		let returnData: INodeExecutionData[] = [];
		const credentials = await this.getCredentials('veniceAiApi');

		// Get data from additional inputs if connected
		let memoryData: INodeExecutionData[] = [];
		let memory: IMemory | undefined;
		let tools: ITool[] = [];
		let memoryConnected = false;
		let toolsConnected = false;

		try {
			// Get connected memory using the correct n8n pattern
			try {
				// NOTE: n8n internally defines memory connection as 'ai_memory'
				memory = await this.getInputConnectionData('ai_memory', 0) as IMemory;
				memoryConnected = !!memory;
				this.logger.debug('Memory connection:', { connected: memoryConnected, memory });
			} catch (error) {
				memoryConnected = false;
				memory = undefined;
				this.logger.debug('No memory connected:', error);
			}

			// Also get memoryData as fallback
			try {
				memoryData = this.getInputData(1);
			} catch (error) {
				memoryData = [];
			}

			// Get connected tools
			try {
				// NOTE: n8n internally defines tools connection as 'ai_tool'
				tools = await this.getInputConnectionData('ai_tool', 0) as ITool[];
				toolsConnected = Array.isArray(tools) && tools.length > 0;

				// Enhanced tool debugging
				if (Array.isArray(tools) && tools.length > 0) {
					const toolInfo = tools.map(t => ({
						name: t.name,
						hasCallMethod: typeof t.call === 'function',
						hasLangChainCallMethod: typeof t._call === 'function',
						hasSchema: !!t.schema,
						hasLangChainSchema: !!t._schema,
					}));

					this.logger.debug('Tools connection:', {
						connected: toolsConnected,
						count: tools.length,
						toolInfo,
					});
				} else {
					this.logger.debug('Tools connection:', {
						connected: false,
						count: 0,
						message: 'No tools found in connection',
					});
				}
			} catch (error) {
				toolsConnected = false;
				tools = [];
				this.logger.debug('Error getting tools connection:', {
					error: error.message,
					stack: error.stack,
				});
			}
		} catch (e) {
			memoryConnected = false;
			memory = undefined;
			memoryData = [];
			toolsConnected = false;
			tools = [];
			this.logger.debug('Error checking inputs:', e);
		}

		if (!credentials?.apiKey) {
			throw new NodeOperationError(this.getNode(), 'No valid API key provided');
		}

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const model = operation !== 'speech' ? (this.getNodeParameter('model', i) as string) : '';

				if (operation === 'chat') {
					const message = this.getNodeParameter('message', i) as string;
					const chatOptions = this.getNodeParameter('chatOptions', i) as IDataObject;
					const binaryImage = this.getNodeParameter('binaryImage', i, false) as boolean;

					const messages = [];

					// Add system message if provided first
					if (chatOptions.system_prompt) {
						messages.push({ role: 'system', content: chatOptions.system_prompt });
					}

					// STEP 1: Load from memory if connected
					if (memoryConnected && memory) {
						try {
							// Use LangChain's loadMemoryVariables method
							const memoryVariables = await memory.loadMemoryVariables({
								input: message,
							});
							this.logger.debug('Memory variables loaded:', memoryVariables);

							// If we have chat history from memory, process it
							if (memoryVariables.chat_history) {
								const chatHistory = memoryVariables.chat_history;
								this.logger.debug('Chat history from memory:', chatHistory);

								// Add messages from chat history to our messages array
								if (Array.isArray(chatHistory)) {
									for (const historyMessage of chatHistory) {
										// Convert from LangChain message format to Venice format
										if (historyMessage._getType) {
											const type = historyMessage._getType();
											if (type === 'human') {
												messages.push({
													role: 'user',
													content: historyMessage.content,
												});
											} else if (type === 'ai') {
												messages.push({
													role: 'assistant',
													content: historyMessage.content,
												});
											} else if (type === 'system') {
												messages.push({
													role: 'system',
													content: historyMessage.content,
												});
											}
										}
									}
								}
							}
						} catch (error) {
							this.logger.error('Error loading memory variables:', error);
						}
					}

					// Add memory messages if provided via input
					if (memoryData?.length && memoryData[0].json.messages) {
						const inputMessages = memoryData[0].json.messages;
						if (Array.isArray(inputMessages)) {
							messages.push(...inputMessages);
						}
					}

					// Add user message
					if (binaryImage) {
						// Handle binary image
						const binaryImageProperty = this.getNodeParameter('binaryImageProperty', i) as string;
						// Use assertBinaryData instead of getBinaryDataBuffer
						const binaryData = this.helpers.assertBinaryData(i, binaryImageProperty);

						this.logger.debug('Sending message with binary data');
						const contentItem = {
							type: 'image',
							data: binaryData.data,  // Base64 string
						};

						messages.push({
							role: 'user',
							content: [contentItem],
						});
					} else {
						// Add plain text message
						messages.push({
							role: 'user',
							content: [
								{
									type: 'text',
									text: message,
								},
							],
						});
					}

					// Add tools to request if connected
					const requestOptions: {
						method: IHttpRequestMethods;
						url: string;
						body: Record<string, any>;
						json: boolean;
					} = {
						method: 'POST',
						url: '',
						body: {},
						json: true,
					};

					// Check if it's a chat or vision request
					if (operation === 'chat') {
						requestOptions.url = 'https://api.venice.ai/api/v1/chat/completions';
						requestOptions.body = {
							model: model || 'Venice-Medium',
							messages,
							temperature: chatOptions.temperature || 0.7,
							max_tokens: chatOptions.max_tokens || 1000,
							top_p: chatOptions.top_p || 0.95,
							top_k: chatOptions.top_k || 50,
							presence_penalty: chatOptions.presence_penalty || 0,
							frequency_penalty: chatOptions.frequency_penalty || 0,
							venice_parameters: {
								include_venice_system_prompt: chatOptions.include_venice_system_prompt || false,
								enable_web_search: chatOptions.enable_web_search || 'auto',
							},
							tools: [],
							tool_choice: 'auto',
						};

						// Add tools to the request if connected
						if (toolsConnected && tools.length > 0) {
							// Format tools for Venice AI - using each tool's exact schema
							const formattedTools = tools.map(tool => {
								// Get the tool's schema directly from the tool
								// This ensures we use exactly what each tool requires
								let parameters: Record<string, any>;

								// Check if the tool has schema property (LangChain StructuredTool)
								if (tool.schema) {
									// Try to extract schema in the LangChain way
									try {
										// Import zodToJsonSchema dynamically if available
										const { zodToJsonSchema } = require('zod-to-json-schema');
										parameters = zodToJsonSchema(tool.schema);
										this.logger.debug(`Tool ${tool.name} schema parsed with zodToJsonSchema:`, parameters);
									} catch (e) {
										// If zod-to-json-schema is not available or schema is not a zod schema,
										// fall back to direct schema access
										parameters = tool.schema as Record<string, any>;
										this.logger.debug(`Tool ${tool.name} using direct schema:`, parameters);
									}
								} else if (tool._schema) {
									// Some LangChain tools use _schema instead of schema
									try {
										const { zodToJsonSchema } = require('zod-to-json-schema');
										parameters = zodToJsonSchema(tool._schema);
									} catch (e) {
										parameters = tool._schema as Record<string, any>;
									}
								} else {
									// Fallback for tools without schema
									this.logger.warn(`Tool ${tool.name} has no schema defined, using default schema`);
									parameters = {
										type: 'object',
										properties: {},
										required: []
									};
								}

								return {
									type: 'function',
									function: {
										name: tool.name,
										description: tool.description || `Tool for ${tool.name}`,
										parameters
									},
								};
							});

							// Add tools to the request
							requestOptions.body.tools = formattedTools;

							// Debug the exact tools being sent to the API
							this.logger.debug('Added tools to request with exact schemas:', formattedTools);

							// Set tool_choice based on chat options
							if (chatOptions.tool_choice) {
								requestOptions.body.tool_choice = chatOptions.tool_choice;
							}

							this.logger.debug('Added tools to request with exact schemas:', formattedTools);
						}
					} else {
						// Vision request - for now we'll use the chat completions endpoint
						requestOptions.url = 'https://api.venice.ai/api/v1/chat/completions';
						requestOptions.body = {
							model: model || 'Venice-Medium',
							messages,
							temperature: chatOptions.temperature || 0.7,
							max_tokens: chatOptions.max_tokens || 1000,
							top_p: chatOptions.top_p || 0.95,
							top_k: chatOptions.top_k || 50,
							presence_penalty: chatOptions.presence_penalty || 0,
							frequency_penalty: chatOptions.frequency_penalty || 0,
							venice_parameters: {
								include_venice_system_prompt: chatOptions.include_venice_system_prompt || false,
								enable_web_search: chatOptions.enable_web_search || 'auto',
							},
						};
					}

					this.logger.debug('Sending request to Venice AI:', requestOptions);

					// Make the request to Venice AI
					let messageContent = '';
					try {
						const response = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'veniceAiApi',
							requestOptions,
						);

						this.logger.debug('Response from Venice AI:', { response });

						// Extract message content from response - Venice AI can sometimes return responses
						// in different formats, so we need to handle each case appropriately
						if (response?.choices?.[0]?.message) {
							// Standard response with message object
							if (response.choices[0].message.content !== null && response.choices[0].message.content !== undefined) {
								messageContent = response.choices[0].message.content;
							} else if (response.choices[0].message.tool_calls && response.choices[0].message.tool_calls.length > 0) {
								// If content is null but there are tool calls, that's a valid response
								messageContent = "I'll help you with that request by using the appropriate tools.";
							} else {
								this.logger.warn('Unexpected response format from Venice AI:', response);
								messageContent = "I received your message, but the response format was unexpected.";
							}
						} else if (response?.choices?.[0]?.text) {
							// Sometimes Venice might return completion-style responses
							messageContent = response.choices[0].text;
						} else {
							this.logger.error('Invalid response format from Venice AI:', response);
							throw new NodeOperationError(
								this.getNode(),
								'Invalid response format from Venice AI API. Check your node configuration, especially the system prompt settings.',
							);
						}

						this.logger.debug('Message content:', { content: messageContent });

						// Check for tool calls in the response
						const toolCalls = response.choices?.[0]?.message?.tool_calls || [];
						if (toolsConnected && tools.length > 0 && toolCalls.length > 0) {
							this.logger.debug('Found tool calls in response:', { count: toolCalls.length, calls: toolCalls });
							this.logger.debug('Available tools:', { count: tools.length, toolNames: tools.map(t => t.name) });

							// Track processed tool call IDs to avoid duplicates
							const processedToolCallIds = new Set();

							// Process each tool call
							for (const toolCall of toolCalls) {
								const { id, function: functionCall } = toolCall;

								// Skip if we've already processed this tool call ID
								if (processedToolCallIds.has(id)) {
									this.logger.debug(`Skipping already processed tool call ${id}`);
									continue;
								}

								// Mark this ID as processed
								processedToolCallIds.add(id);

								const { name, arguments: args } = functionCall;

								// Enhanced logging to debug nested arguments
								if (name === 'calculator') {
									this.logger.debug(`===== CALCULATOR TOOL CALL DEBUG =====`);
									this.logger.debug(`Raw arguments:`, { args });
									try {
										let parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
										this.logger.debug(`Parsed arguments:`, { parsedArgs });

										// Check for nesting
										if (parsedArgs && typeof parsedArgs === 'object') {
											this.logger.debug(`Top level keys:`, { keys: Object.keys(parsedArgs) });

											if ('query' in parsedArgs && typeof parsedArgs.query === 'object') {
												this.logger.debug(`Nested query object:`, { nested: parsedArgs.query });
											}
										}
									} catch (e) {
										this.logger.debug(`Error parsing arguments:`, { error: e.message });
									}
									this.logger.debug(`=====================================`);
								}

								// Find the matching tool
								const tool = tools.find(t => t.name === name);
								if (tool) {
									try {
										// Log the raw tool object to see its full structure
										this.logger.debug(`Tool ${name} raw structure:`, {
											name: tool.name,
											hasSchema: !!tool.schema,
											schemaKeys: tool.schema ? Object.keys(tool.schema) : []
										});

										// Parse and transform arguments
										const transformedArgs = await processToolArguments(tool, args, name, this.logger);
										this.logger.debug(`Processed args for ${name}:`, {
											before: args,
											after: transformedArgs
										});

                                       // Get a reference to the appropriate call method
                                       const callMethod = typeof tool._call === 'function' ? tool._call.bind(tool) :
                                          (typeof tool.call === 'function' ? tool.call.bind(tool) : null);

                                       if (!callMethod) {
                                          throw new NodeOperationError(
                                             this.getNode(),
                                             `Tool ${name} does not have a valid call() or _call() method`
                                          );
                                       }

                                       // Debug the final transformedArgs before calling the tool
                                       this.logger.debug(`Final args for ${name}:`, {
											argType: typeof transformedArgs,
											args: JSON.stringify(transformedArgs),
											isString: typeof transformedArgs === 'string',
											isObject: typeof transformedArgs === 'object' && transformedArgs !== null
										});

                                       // For tools without schema, ensure we're passing the raw value, not an object
                                       let finalArgs = transformedArgs;
                                       if (!tool.schema && typeof transformedArgs === 'object' && transformedArgs !== null) {
                                          // Extract raw value from single-property objects like {"input": "4+4"}
                                          const keys = Object.keys(transformedArgs);
                                          if (keys.length === 1) {
                                             const rawValue = transformedArgs[keys[0]];
                                             this.logger.debug(`Extracted raw value for schema-less tool ${name}: ${rawValue}`);
                                             finalArgs = rawValue;
                                          }
                                       }

                                       // Final check of what's being sent to the tool
                                       this.logger.debug(`FINAL args being sent to ${name}:`, {
                                          args: finalArgs,
                                          type: typeof finalArgs,
                                          isString: typeof finalArgs === 'string'
                                       });

                                       // Call the tool with the transformed arguments
                                       this.logger.debug(`Calling tool ${name} with transformed args`);
                                       const toolResponse = await callMethod(finalArgs);

                                       this.logger.debug(`Tool ${name} response:`, { response: toolResponse });

                                       // Format the tool response in case it's not a string
                                       let formattedToolResponse = toolResponse;
                                       if (typeof toolResponse !== 'string') {
											try {
												formattedToolResponse = JSON.stringify(toolResponse);
											} catch (e) {
												formattedToolResponse = String(toolResponse);
											}
										}

                                       // Add the tool call and response to messages
                                       messages.push({
											role: 'assistant',
											content: null,
											tool_calls: [
												{
													id,
													type: 'function',
													function: {
														name,
														arguments: typeof args === 'string' ? args : JSON.stringify(args)
													},
												},
											],
										});

                                       messages.push({
											role: 'tool',
											content: formattedToolResponse,
											tool_call_id: id,
										});

                                       // Make a follow-up request with the tool responses
                                       const followupRequestOptions = {
											...requestOptions,
											body: { ...requestOptions.body },
										};

                                       // CRITICAL: Ensure clean messages for follow-up - standardize all message formats
                                       if (followupRequestOptions.body.messages) {
											followupRequestOptions.body.messages = messages.map((msg: any) => {
												// If it's an assistant message with tool calls, standardize the arguments format
												if (msg.role === 'assistant' && msg.tool_calls && Array.isArray(msg.tool_calls)) {
													return {
														...msg,
														tool_calls: msg.tool_calls.map((tc: any) => {
															// Only modify function calls
															if (tc.type === 'function') {
																// Extract the actual value we want to pass
																let simpleArgs = tc.function.arguments;
																try {
																	// If arguments are JSON string, parse them first
																	if (typeof tc.function.arguments === 'string') {
																		const parsed = JSON.parse(tc.function.arguments);
																		// Handle nested query objects
																		if (parsed.query && typeof parsed.query === 'object') {
																			const valueToUse = extractFinalStringValue(parsed.query);
																			// Create a simple structure
																			simpleArgs = JSON.stringify({ query: valueToUse});
																		}
																	}
																} catch (e) {
																	// If parsing fails, use the string directly
																}

																return {
																	...tc,
																	function: {
																		...tc.function,
																		arguments: simpleArgs
																	}
																};
															}
															return tc;
														})
													};
												}
												return msg;
											});
										}

                                       // Ensure URL is set correctly for the follow-up request
                                       followupRequestOptions.url = 'https://api.venice.ai/api/v1/chat/completions';

                                       // Create simple follow-up messages
                                       followupRequestOptions.body.messages = messages.map((msg: any) => {
											// If it's a message with tool calls
											if (msg.role === 'assistant' && msg.tool_calls && Array.isArray(msg.tool_calls)) {
												return {
													role: msg.role,
													content: msg.content,
													tool_calls: msg.tool_calls.map((tc: any) => {
														// Only process function call arguments
														if (tc.type === 'function' && tc.function) {
															// Do NOT standardize the format - preserve the original arguments
															return {
																...tc,
																function: {
																	...tc.function,
																	arguments: tc.function.arguments
																}
															};
														}
														return tc;
													})
												};
											}
											return msg;
										});

                                       // Remove tools from follow-up request to prevent infinite loops
                                       if (followupRequestOptions.body.tools) {
											delete followupRequestOptions.body.tools;
										}
                                       if (followupRequestOptions.body.tool_choice) {
											delete followupRequestOptions.body.tool_choice;
										}

                                       this.logger.debug('Sending follow-up request with standardized tool calls:', followupRequestOptions);

                                       const followupResponse = await this.helpers.httpRequestWithAuthentication.call(
											this,
											'veniceAiApi',
											followupRequestOptions,
										);

                                       this.logger.debug('Follow-up response from Venice AI:', { followupResponse });

                                       // Extract message content from follow-up response using the same pattern
                                       if (followupResponse?.choices?.[0]?.message) {
											// Standard response with message object
											if (followupResponse.choices[0].message.content !== null &&
												followupResponse.choices[0].message.content !== undefined) {
												messageContent = followupResponse.choices[0].message.content;
											} else if (followupResponse.choices[0].message.tool_calls &&
													  followupResponse.choices[0].message.tool_calls.length > 0) {
												// This shouldn't normally happen in a follow-up, but handle just in case
												messageContent = "I'll continue using tools to help with your request.";
											} else {
												this.logger.warn('Unexpected follow-up response format from Venice AI:', followupResponse);
												messageContent = "I processed your request, but received an unexpected response format.";
											}
										} else if (followupResponse?.choices?.[0]?.text) {
											// Sometimes Venice might return completion-style responses
											messageContent = followupResponse.choices[0].text;
										} else {
											this.logger.error('Invalid follow-up response format from Venice AI:', followupResponse);
											throw new NodeOperationError(
												this.getNode(),
												'Invalid follow-up response format from Venice AI API. Check your node configuration.',
											);
										}

                                       this.logger.debug('Updated message content after tool use:', { content: messageContent });
									} catch (toolError) {
										this.logger.error(`Error calling tool ${name}:`, toolError);

										// Still include the tool call in messages, but with an error response
                                       messages.push({
											role: 'assistant',
											content: null,
											tool_calls: [
												{
													id,
													type: 'function',
													function: {
														name,
														arguments: typeof args === 'string' ? args : JSON.stringify(args)
													},
												},
											],
										});

                                       messages.push({
											role: 'tool',
											content: `Error: ${toolError.message}`,
											tool_call_id: id,
										});
									}
								} else {
									this.logger.warn(`Tool ${name} called but not found in connected tools`);

									// Include a message saying the tool wasn't found
                                   messages.push({
										role: 'assistant',
										content: null,
										tool_calls: [
											{
												id,
												type: 'function',
												function: {
													name,
													arguments: typeof args === 'string' ? args : JSON.stringify(args)
												},
											},
										],
									});

                                   messages.push({
										role: 'tool',
										content: `Error: Tool "${name}" not found`,
										tool_call_id: id,
									});
								}
							}
						}

					} catch (error) {
						if (this.continueOnFail()) {
							const errorData = {
								error: error.message,
							};
							returnData.push({
								json: errorData,
								pairedItem: {
									item: i,
								},
							});
							continue;
						}
						throw error;
					}

					// STEP 2: Save to memory if connected
					if (memoryConnected && memory) {
						try {
							// Use LangChain's saveContext method to save the conversation
							await memory.saveContext(
								{ input: message },
								{ output: messageContent }
							);
							this.logger.debug('Context saved to memory');
						} catch (error) {
							this.logger.error('Error saving context to memory:', error);
						}
					}

                   returnData.push({
						json: {
							output: messageContent,
							messages: messages,
							// Include memory and tool debugging info in the output
							debug_info: {
								memory: {
									connected: memoryConnected,
									available: !!memory,
									data_length: memoryData?.length || 0,
									type: memory ? memory.constructor.name : 'None',
								},
								tools: {
									connected: toolsConnected,
									count: Array.isArray(tools) ? tools.length : 0,
									names: Array.isArray(tools) ? tools.map(t => t.name) : [],
								}
							}
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
								return_binary: imageOptions.return_binary,
								lora_strength: imageOptions.lora_strength,
								safe_mode: imageOptions.safe_mode,
								format: imageOptions.format,
								embed_exif_metadata: imageOptions.embed_exif_metadata,
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
								return_binary: imageOptions.return_binary,
								lora_strength: imageOptions.lora_strength,
								safe_mode: imageOptions.safe_mode,
								format: imageOptions.format,
								embed_exif_metadata: imageOptions.embed_exif_metadata,
							},
							json: true, // Set json to false to get the response as a buffer
						};
					}

					const response = await this.helpers.request(options);
					this.logger.debug('Response from API:', response);

					if (imageOptions.return_binary) {
						this.sendMessageToUI('return_binary Enabled');

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
				} else if (operation === 'speech') {
					const text = this.getNodeParameter('text', i) as string;
					const voice = this.getNodeParameter('voice', i) as string;
					const responseFormat = this.getNodeParameter('responseFormat', i) as string;
					const speed = this.getNodeParameter('speed', i) as number;
					const streaming = this.getNodeParameter('streaming', i) as boolean;

					const options: IRequestOptions = {
						url: 'https://api.venice.ai/api/v1/audio/speech',
						headers: {
							Authorization: `Bearer ${credentials.apiKey}`,
						},
						method: 'POST' as IHttpRequestMethods,
						body: {
							model: 'tts-kokoro',
							input: text,
							voice,
							response_format: responseFormat,
							speed,
							streaming,
						},
						json: false,
						encoding: null,
					};

					const response = await this.helpers.request(options);
					this.logger.debug('Response from API:', response);

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

					Object.assign(newItem.binary as IBinaryKeyData, items[i].binary);
					const responseContentType = `audio/${responseFormat}`;

					newItem.json = items[i].json;
					const binaryData = response;

					const preparedBinaryData = await this.helpers.prepareBinaryData(
						binaryData,
						undefined,
						responseContentType || undefined,
					);
					preparedBinaryData.fileName = `speech.${responseFormat}`;
					newItem.binary![outputPropertyName] = preparedBinaryData;
					returnData.push(newItem);
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
							"To split the contents of 'data' into separate items for easier processing, add a 'Split Out' node after this one",
						location: 'outputPane',
					},
				],
			);
		}

		return [returnData];
	}
}

/**
 * Process tool arguments using the same approach as n8n's OpenAI implementation
 */
async function processToolArguments(tool: any, args: any, name: string, logger: any): Promise<any> {
	// Log the exact input format
	logger.debug(`Tool ${name} raw args:`, {
		args,
		type: typeof args,
		isString: typeof args === 'string'
	});

	// Parse the args if they're a string (JSON)
	if (typeof args === 'string') {
		try {
			// Parse exactly as n8n does in message.operation.ts
			const parsedArgs = jsonParse(args) as any;
			logger.debug(`Tool ${name} parsed JSON input:`, { parsedArgs });

			// Extract input exactly as n8n does: parsedArgs.input ?? parsedArgs
			// This allows tools to receive either the raw "input" property value
			// or the full object if no input property exists
			const functionInput = parsedArgs.input ?? parsedArgs;
			logger.debug(`Extracted function input for ${name}:`, { functionInput });
			return functionInput;
		} catch (e) {
			// If parsing fails, return the string directly
			logger.debug(`Failed to parse args string for ${name}, using as-is`);
			return args;
		}
	}

	// Return the args as-is if they're not a string
	return args;
}
