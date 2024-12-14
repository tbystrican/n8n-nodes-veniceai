import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class veniceAiApi implements ICredentialType {
	name = 'veniceAiApi';
	displayName = 'Venice.ai API';
	documentationUrl = 'https://docs.venice.ai/welcome/guides/generating-api-key';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'The Venice.ai API key',
		},
	];
}
