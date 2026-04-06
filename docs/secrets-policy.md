# Secrets Policy

This project uses environment variables for all secrets and environment-specific configuration.

## Required Rules

1. Never commit real credentials to source control.
2. Use `.env.local` for local development values.
3. Keep `.env.example` as a template with placeholder values only.
4. Rotate secrets immediately if they are exposed.
5. Use separate credentials per environment (development, test, production).

## Variables

- `MONGODB_URI`: MongoDB connection string
- `NEXTAUTH_URL`: Base URL for auth callbacks
- `NEXTAUTH_SECRET`: Session/JWT signing secret
- `GOOGLE_CLIENT_ID`: Google OAuth client id (optional)
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret (optional)
- `LOG_LEVEL`: Logging level (`debug`, `info`, `warn`, `error`)

## Local Setup

1. Copy `.env.example` to `.env.local`.
2. Fill real values in `.env.local`.
3. Do not share `.env.local`.

## Logging Safety

- Application logs should not print secrets.
- Log metadata should contain context, not credentials or tokens.
