# Contributing to Commercial Real Estate Analyzer

Thank you for your interest in contributing to the Commercial Real Estate Analyzer! 🎉

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/commercial-real-estate-analyzer.git
   cd commercial-real-estate-analyzer
   ```
3. **Install dependencies**:
   ```bash
   bun install
   ```
4. **Set up your environment**:
   ```bash
   cp .env.example .env
   bun run db:generate
   bun run db:push
   bun run db:seed
   ```

## 🛠️ Development Workflow

### Before Making Changes
- Create a new branch from `main`:
  ```bash
  git checkout -b feature/your-feature-name
  ```

### During Development
- Run the development server:
  ```bash
  bun run dev
  ```
- Run linting and formatting:
  ```bash
  bun run lint
  bun run format
  ```
- Test your changes thoroughly

### Code Quality
- Follow TypeScript best practices
- Use meaningful commit messages (see [Conventional Commits](https://www.conventionalcommits.org/))
- Ensure all linting passes
- Add comments for complex logic
- Update documentation when necessary

## 📝 Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples:
```
feat(search): add radius-based property search
fix(api): resolve tax assessor data parsing issue
docs(readme): update installation instructions
```

## 🐛 Bug Reports

When filing a bug report, please include:

1. **Clear description** of the issue
2. **Steps to reproduce** the problem
3. **Expected behavior** vs actual behavior
4. **Environment details** (OS, Node.js version, etc.)
5. **Screenshots** if applicable
6. **Error messages** or console output

## ✨ Feature Requests

For feature requests, please provide:

1. **Clear description** of the proposed feature
2. **Use case** - why would this be useful?
3. **Proposed implementation** (if you have ideas)
4. **Alternatives considered**

## 🔍 Areas for Contribution

We welcome contributions in these areas:

### Frontend Development
- UI/UX improvements
- New dashboard components
- Mobile responsiveness enhancements
- Data visualization improvements

### Backend Development
- API endpoint enhancements
- Database schema improvements
- Performance optimizations
- New data source integrations

### Data & Integration
- Tax assessor mapping for new jurisdictions
- MLS data integration improvements
- New scraping targets for market data
- Data normalization enhancements

### Documentation
- Code documentation
- User guides
- API documentation
- Setup and deployment guides

### Testing
- Unit tests
- Integration tests
- End-to-end tests
- Performance testing

## 🏗️ Architecture Guidelines

### Frontend
- Use TypeScript for all new code
- Follow React best practices and hooks patterns
- Use shadcn/ui components when possible
- Implement responsive design with Tailwind CSS
- Use React Hook Form for form management

### Backend
- Use Prisma for database operations
- Implement proper error handling
- Use rate limiting for external API calls
- Follow RESTful API conventions
- Implement proper logging

### Database
- Use descriptive table and column names
- Include proper indexes for performance
- Add database migrations for schema changes
- Document complex queries

## 🚫 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Provide constructive feedback
- Focus on what's best for the community
- Show empathy towards others

## 📋 Pull Request Process

1. **Create a descriptive PR title** following conventional commit format
2. **Fill out the PR template** completely
3. **Link related issues** using "Closes #123" or "Fixes #123"
4. **Ensure all checks pass** (linting, tests, etc.)
5. **Request review** from maintainers
6. **Address feedback** promptly and respectfully

### PR Checklist
- [ ] Code follows project conventions
- [ ] Tests pass locally
- [ ] Linting passes without errors
- [ ] Documentation updated if needed
- [ ] No breaking changes (or documented)
- [ ] Performance impact considered

## 🎯 Development Tips

### Working with Tax Assessor Data
- Test with multiple jurisdictions
- Handle edge cases gracefully
- Implement proper rate limiting
- Use meaningful error messages

### Adding New Components
- Follow existing component patterns
- Use TypeScript interfaces
- Implement proper loading states
- Add error boundaries where appropriate

### Database Changes
- Create migrations for schema changes
- Test with existing data
- Consider backward compatibility
- Update seed data if necessary

## 🤝 Getting Help

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Email**: derob357@yahoo.com for sensitive issues

## 🙏 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- Special thanks for major features or fixes

Thank you for contributing to make commercial real estate analysis more accessible and powerful! 🚀