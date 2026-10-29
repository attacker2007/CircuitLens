import 'dotenv/config';
import {
  DEFAULT_MODEL,
  META_API_BASE_URL,
  sendMetaTestPrompt,
  handleApiError,
} from './metaClient.js';

async function runCliTest() {
  console.log('='.repeat(60));
  console.log(' CircuitLens - Meta Model API Connectivity Test');
  console.log('='.repeat(60));
  console.log(`Endpoint: ${META_API_BASE_URL}`);
  console.log(`Model:    ${DEFAULT_MODEL}`);

  const hasKey = Boolean(
    process.env.MODEL_API_KEY &&
    process.env.MODEL_API_KEY.trim() !== '' &&
    process.env.MODEL_API_KEY !== 'your_meta_model_api_key_here'
  );

  console.log(`API Key:  ${hasKey ? 'Configured [REDACTED]' : 'MISSING / PLACEHOLDER'}`);
  console.log('-'.repeat(60));

  try {
    console.log('Sending test prompt to Meta Model API...');
    const result = await sendMetaTestPrompt({
      prompt: 'Hello! Please confirm API connectivity by replying with: "CircuitLens connection successful!"',
    });

    console.log('\n[SUCCESS] Response received from Meta Model API:');
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
    console.error('\n[FAILED] Meta Model API Connectivity Test failed:');
    console.error(`- Error Code: ${normalized.errorType} (HTTP ${normalized.statusCode})`);
    console.error(`- Message:    ${normalized.message}\n`);
    console.log('='.repeat(60));
    console.log('Connectivity test FAILED. Please review the error message above.');
    console.log('='.repeat(60));
    process.exit(1);
  }
}

runCliTest();
