import 'dotenv/config';
import {
  resolveProviderConfig,
  sendMetaTestPrompt,
  handleApiError,
} from './metaClient.js';

async function runCliTest() {
  let config;
  try {
    config = resolveProviderConfig();
  } catch (err) {
    console.error('[CONFIGURATION ERROR]', err instanceof Error ? err.message : err);
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log(` CircuitLens - Model API Connectivity Test [${config.provider.toUpperCase()}]`);
  console.log('='.repeat(60));
  console.log(`Provider: ${config.provider}`);
  console.log(`Endpoint: ${config.baseUrl}`);
  console.log(`Model:    ${config.model}`);
  console.log(`Key Var:  ${config.apiKeyEnvVar}`);

  const rawKey = process.env[config.apiKeyEnvVar];
  const placeholder =
    config.provider === 'meta'
      ? 'your_meta_model_api_key_here'
      : 'your_baseten_api_key_here';
  const hasKey = Boolean(rawKey && rawKey.trim() !== '' && rawKey !== placeholder);

  console.log(`API Key:  ${hasKey ? 'Configured [REDACTED]' : 'MISSING / PLACEHOLDER'}`);
  console.log('-'.repeat(60));

  try {
    console.log(`Sending test prompt to ${config.provider === 'baseten' ? 'Baseten' : 'Meta'} Model API...`);
    const result = await sendMetaTestPrompt({
      prompt: 'Hello! Please confirm API connectivity by replying with: "CircuitLens connection successful!"',
    });

    console.log(`\n[SUCCESS] Response received from ${config.provider === 'baseten' ? 'Baseten' : 'Meta'} Model API:`);
    console.log(`- Model:      ${result.model}`);
    console.log(`- Duration:   ${result.durationMs}ms`);
    if (result.usage) {
      console.log(`- Tokens:     prompt: ${result.usage.promptTokens ?? 'N/A'}, completion: ${result.usage.completionTokens ?? 'N/A'}, total: ${result.usage.totalTokens ?? 'N/A'}`);
    }
    console.log(`- Content:    "${result.response}"\n`);
    console.log('='.repeat(60));
    console.log('Connectivity test PASSED.');
    console.log('='.repeat(60));
    process.exit(0);
  } catch (err) {
    const normalized = handleApiError(err);
    console.error(`\n[FAILED] ${config.provider === 'baseten' ? 'Baseten' : 'Meta'} Model API Connectivity Test failed:`);
    console.error(`- Error Code: ${normalized.errorType} (HTTP ${normalized.statusCode})`);
    console.error(`- Message:    ${normalized.message}\n`);
    console.log('='.repeat(60));
    console.log('Connectivity test FAILED. Please review the error message above.');
    console.log('='.repeat(60));
    process.exit(1);
  }
}

runCliTest();
