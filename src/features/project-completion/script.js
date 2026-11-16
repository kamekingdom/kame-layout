import { ExternalCompletion } from "https://scrapbox.io/api/code/takker/external-completion/script.js";
const externalCompletion = new ExternalCompletion({
  projects: ["shokai"],
  // includeYourProject: false,
  // maxSuggestionNum: 30,
  // maxHeight: `calc(50vh - 100px)`
});
externalCompletion.start();
