# Contributing to Verixa

Thank you for your interest in contributing to Verixa! Here are the guidelines to help you get started.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

1. Fork the repository and create your branch from `main`.
2. Install dependencies using `npm install`.
3. Set up your local environment by copying `.env.example` to `.env.local` and configuring the necessary variables.
4. Ensure the database is synchronized:
   ```bash
   npx prisma db push
   ```

## Development Workflow

- **Branch Naming:** Use descriptive names like `feature/booking-timezone-fluidity` or `bugfix/oauth-token-expired`.
- **Coding Standards:** We use ESLint and TypeScript for type safety. Run the linter before committing:
   ```bash
   npm run lint
   ```
- **Testing:** Make sure tests pass before submitting a pull request:
   ```bash
   npm run test
   ```

## Pull Request Guidelines

1. Ensure your code compiles and all tests pass.
2. Provide a clear description of the changes in your PR.
3. Update any relevant documentation if your change introduces new behavior or configurations.
4. An admin or lead developer will review your pull request shortly.
