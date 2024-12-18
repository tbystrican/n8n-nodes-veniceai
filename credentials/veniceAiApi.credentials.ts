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
			baseURL: "https://api.venice.ai",
			url: "/api/v1/models",
		},
	};

}
