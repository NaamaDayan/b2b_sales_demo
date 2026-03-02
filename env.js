/**
 * Load .env only when not running on AWS Lambda.
 * On Lambda, env vars are read from the Lambda configuration.
 */
if (typeof process.env.AWS_LAMBDA_FUNCTION_NAME === 'undefined') {
  await import('dotenv/config');
}
