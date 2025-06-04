# 🤝 Contributing to AI Batch Image Generator

First off, thank you for considering contributing to AI Batch Image Generator! It's people like you that make this project a great tool for the community.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Bug Reports](#bug-reports)
- [Feature Requests](#feature-requests)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

### Our Standards

**Positive behavior includes:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community

**Unacceptable behavior includes:**
- Trolling, insulting/derogatory comments, and personal attacks
- Public or private harassment
- Publishing others' private information without permission
- Other conduct which could reasonably be considered inappropriate

## 🛠️ How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates.

**When submitting a bug report, please include:**
- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (code snippets, screenshots)
- **Describe the expected vs actual behavior**
- **Include system information** (OS, Python version, browser)

### 💡 Suggesting Features

Feature suggestions are welcome! Before submitting:
- **Check if the feature already exists** or is planned
- **Use a clear and descriptive title**
- **Provide a detailed description** of the proposed feature
- **Explain why this feature would benefit users**
- **Consider the technical complexity** and maintenance burden

### 🔧 Code Contributions

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following our coding standards
3. **Add tests** for new functionality
4. **Update documentation** if needed
5. **Test your changes** thoroughly
6. **Submit a pull request**

## 🚀 Development Setup

### Prerequisites
- Python 3.7 or higher
- Git
- A text editor or IDE (VS Code, PyCharm recommended)

### Setup Steps

```bash
# 1. Fork and clone the repository
git clone https://github.com/your-username/ai-batch-image-generator-by-api.git
cd ai-batch-image-generator-by-api

# 2. Create a virtual environment
python -m venv venv
source venv/bin/activate  # Linux/macOS
# or
venv\Scripts\activate     # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Install development dependencies
pip install pytest black flake8

# 5. Run the application
python main.py

# 6. Run tests
pytest

# 7. Check code formatting
black --check .
flake8 .
```

### 🏗️ Project Structure

```
backend/
├── api/           # REST API endpoints
├── services/      # Business logic
└── models/        # Database models

frontend/
├── css/          # Styling
├── js/           # JavaScript modules
└── index.html    # Main interface

docs/             # Documentation
tests/            # Test files (to be added)
```

## 📥 Pull Request Process

### Before Submitting

1. **Update documentation** for any new features
2. **Add tests** for new functionality
3. **Ensure all tests pass**
4. **Follow the coding standards**
5. **Update the CHANGELOG** if applicable

### PR Guidelines

- **Use a clear title** that describes the change
- **Reference related issues** in the description
- **Provide detailed description** of changes made
- **Include screenshots** for UI changes
- **Keep PRs focused** - one feature/fix per PR

### Review Process

1. **Automated checks** must pass (when implemented)
2. **Code review** by maintainers
3. **Testing** in development environment
4. **Documentation review** if applicable
5. **Merge** after approval

## 📝 Coding Standards

### Python Code Style
- Follow **PEP 8** style guide
- Use **meaningful variable names**
- Add **docstrings** for functions and classes
- Keep functions **small and focused**
- Use **type hints** where appropriate

```python
def generate_image(prompt: str, platform: str) -> dict:
    """
    Generate an image using the specified AI platform.
    
    Args:
        prompt: The text prompt for image generation
        platform: The AI platform to use (e.g., 'openai', 'gemini')
    
    Returns:
        Dictionary containing image data and metadata
    """
    # Implementation here
    pass
```

### JavaScript Code Style
- Use **ES6+ features** where appropriate
- Follow **consistent naming conventions**
- Add **JSDoc comments** for functions
- Use **const/let** instead of var
- Keep functions **pure** when possible

```javascript
/**
 * Process uploaded image with specified filters
 * @param {File} imageFile - The image file to process
 * @param {Array} filters - Array of filter names to apply
 * @returns {Promise<Blob>} Processed image as blob
 */
async function processImage(imageFile, filters) {
    // Implementation here
}
```

### CSS Style
- Use **BEM methodology** for class naming
- Prefer **CSS Grid** and **Flexbox** for layouts
- Include **responsive design** considerations
- Use **CSS custom properties** for theming

## 🧪 Testing Guidelines

### Unit Tests
- Test **individual functions** in isolation
- Use **descriptive test names**
- Cover **edge cases** and **error conditions**
- Aim for **high code coverage**

### Integration Tests
- Test **API endpoints** thoroughly
- Test **user workflows** end-to-end
- Test **error handling** scenarios

### Manual Testing
- Test in **multiple browsers**
- Test **responsive design**
- Test **accessibility features**
- Test with **real AI APIs** (when possible)

## 🏷️ Issue Labels

We use labels to categorize issues:

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Documentation needs
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `question` - Further information requested
- `wontfix` - This will not be worked on

## 🎯 Areas We Need Help

### High Priority
- **Test coverage** - Writing unit and integration tests
- **Documentation** - Improving guides and API docs
- **Mobile optimization** - Better mobile experience
- **Accessibility** - WCAG compliance improvements

### Medium Priority
- **Performance optimization** - Faster image processing
- **New AI platforms** - Additional platform integrations
- **Internationalization** - More language support
- **Docker improvements** - Better containerization

### Good First Issues
- **UI improvements** - Small design enhancements
- **Bug fixes** - Fixing reported issues
- **Code cleanup** - Refactoring and optimization
- **Documentation updates** - Keeping docs current

## 🎉 Recognition

Contributors will be recognized in:
- **README.md** contributors section
- **Release notes** for significant contributions
- **GitHub contributors** page
- **Special thanks** in project documentation

## 📞 Getting Help

If you need help with contributing:

1. **Check existing issues** and discussions
2. **Create a new issue** with the `question` label
3. **Join our community** discussions
4. **Review the documentation** in the `/docs` folder

## 🎨 Design Guidelines

### UI/UX Principles
- **Simplicity** - Clean, uncluttered interface
- **Consistency** - Uniform design patterns
- **Accessibility** - Usable by everyone
- **Responsiveness** - Works on all devices

### Color Scheme
- **Primary**: Blue (#007bff)
- **Secondary**: Gray (#6c757d)
- **Success**: Green (#28a745)
- **Warning**: Yellow (#ffc107)
- **Danger**: Red (#dc3545)

### Typography
- **Headers**: Inter, system fonts
- **Body**: -apple-system, BlinkMacSystemFont, "Segoe UI"
- **Code**: "SF Mono", Monaco, "Cascadia Code"

## 📊 Performance Guidelines

### Backend Performance
- **Database queries** should be optimized
- **API responses** should be fast (<500ms)
- **Memory usage** should be reasonable
- **Error handling** should be comprehensive

### Frontend Performance
- **Bundle size** should be minimized
- **Images** should be optimized
- **Loading states** should be shown
- **Caching** should be used effectively

## 🔒 Security Guidelines

### Code Security
- **Never commit** API keys or secrets
- **Sanitize user inputs** properly
- **Use HTTPS** for all external calls
- **Validate data** on both client and server

### Data Privacy
- **Minimize data collection** to necessary only
- **Encrypt sensitive data** at rest
- **Secure user sessions** properly
- **Follow GDPR** principles where applicable

Thank you for contributing to make AI Batch Image Generator better! 🚀 