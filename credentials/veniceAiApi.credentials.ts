import {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class veniceAiApi implements ICredentialType {
	name = 'veniceAiApi';
	displayName = 'VeniceAi API';
	icon: Icon = 'file:veniceAiApi.png';

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
			description: 'The VeniceAi API key',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.venice.ai/api/v1',
			required: false,
			description: 'Custom API base URL. Defaults to https://api.venice.ai/api/v1',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: "generic",
		properties: {
			headers: {
				Authorization: "=Bearer {{$credentials.apiKey}}",
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: "={{$credentials.baseUrl || 'https://api.venice.ai/api/v1'}}",
			url: "/models/compatibility_mapping",
			headers: {
				'Content-Type': 'application/json',
			},
		},
	};

}
