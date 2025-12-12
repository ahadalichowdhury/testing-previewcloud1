# Contributing to PreviewCloud

Thank you for your interest in contributing to PreviewCloud! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Assume good intentions

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/yourusername/previewcloud/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Docker version, etc.)
   - Relevant logs

### Suggesting Features

1. Check if the feature has been suggested in [Issues](https://github.com/yourusername/previewcloud/issues)
2. Create a new issue with:
   - Clear use case
   - Proposed solution
   - Alternatives considered
   - Any implementation ideas

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Write or update tests
5. Update documentation
6. Commit with clear messages
7. Push to your fork
8. Create a pull request

## Development Setup

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- MongoDB
- Git

### Setup Steps

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/previewcloud.git
cd previewcloud

# Install backend dependencies
cd backend
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Start dependencies
docker-compose -f ../infra/docker-compose.yml up -d mongodb postgres mysql

# Start development server
npm run dev
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Code Style

We use ESLint and Prettier for code formatting:

```bash
# Check code style
npm run lint

# Fix code style issues
npm run lint:fix

# Format code
npm run format
```

## Project Structure

```
previewcloud/
├── backend/           # Backend API
│   ├── src/
│   │   ├── config/   # Configuration files
│   │   ├── models/   # Database models
│   │   ├── services/ # Business logic
│   │   ├── routes/   # API routes
│   │   └── ...
│   └── package.json
├── github-action/    # GitHub Action
├── infra/            # Infrastructure configs
├── installer/        # Installation scripts
└── docs/             # Documentation
```

## Commit Messages

Follow conventional commits:

```
feat: add new feature
fix: bug fix
docs: documentation changes
style: formatting changes
refactor: code refactoring
test: adding tests
chore: maintenance tasks
```

Examples:
- `feat: add MongoDB database provisioner`
- `fix: resolve container cleanup issue`
- `docs: update API documentation`

## Pull Request Guidelines

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] Tests pass
- [ ] Documentation is updated
- [ ] Commit messages are clear
- [ ] Branch is up to date with main

### PR Description

Include:
- What changes were made
- Why the changes were needed
- How to test the changes
- Any breaking changes
- Related issues (fixes #123)

### Review Process

1. Automated checks must pass
2. At least one maintainer approval required
3. All discussions must be resolved
4. Squash and merge (or rebase)

## Areas for Contribution

### High Priority

- [ ] Test coverage improvements
- [ ] Performance optimizations
- [ ] Security enhancements
- [ ] Documentation improvements

### Feature Ideas

- [ ] Kubernetes support
- [ ] Multi-server deployment
- [ ] Metrics and monitoring
- [ ] Preview templates
- [ ] Cost estimation
- [ ] Preview scheduling

### Good First Issues

Look for issues labeled `good-first-issue` for beginner-friendly contributions.

## Questions?

- Open a [Discussion](https://github.com/yourusername/previewcloud/discussions)
- Join our [Discord](https://discord.gg/previewcloud) (if available)
- Email: support@previewcloud.com

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in documentation

Thank you for contributing to PreviewCloud! 🎉

