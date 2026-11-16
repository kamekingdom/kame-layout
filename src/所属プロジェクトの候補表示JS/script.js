import {ExternalCompletion} 
	from '/api/code/takker/external-completion/script.js';
const externalCompletion = new ExternalCompletion({
	projects: ['shokai'],
 // includeYourProject: false,
 // maxSuggestionNum: 30,
 // maxHeight: `calc(50vh - 100px)`
	});
externalCompletion.start();