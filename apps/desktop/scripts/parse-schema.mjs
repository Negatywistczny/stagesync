import fs from 'fs';
const schema = JSON.parse(fs.readFileSync('C:/Users/kacpe/.gemini/antigravity-ide/brain/076bb310-d11a-4704-bb90-c61892560fd8/.system_generated/steps/15/content.md').toString().split('\n---\n\n')[1]);
const nsis = schema.definitions.NsisConfig.properties;
for (const [key, val] of Object.entries(nsis)) {
    console.log(`${key}: ${val.description ? val.description.split('\n')[0] : ''} - type: ${val.type || (val.anyOf ? 'anyOf' : 'unknown')}`);
}
