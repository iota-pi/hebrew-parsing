# Biblical Hebrew & Aramaic Parsing Practice

A web application designed to help users practice parsing verbs from Biblical Hebrew and Aramaic verses. The application presents verbs in their original context and allows filtering by root type, stem, tense, frequency, and other morphological features.

Data is sourced primarily from the BHSA (ETCBC 2021), supported by the Open Scriptures Hebrew Bible Project (although this contains a substantial number of errors).

## Live Environments

- **Hebrew**: [hebrew.cross-code.org](https://hebrew.cross-code.org)
- **Aramaic**: [aramaic.cross-code.org](https://aramaic.cross-code.org)

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Material UI (MUI), Emotion
- **Testing**: Vitest
- **Infrastructure**: SST (Serverless Stack) for deployment on AWS
- **Package Manager**: Yarn

## Getting Started

### Prerequisites

- Node.js
- Yarn

### Installation

```bash
yarn install
```

### Running Locally

By default, the development server runs the Hebrew version.

```bash
# Run Hebrew version
yarn start

# Run Aramaic version
yarn aramaic
```

### Building for Production

```bash
yarn build
```

The build process is configured differently depending on the language mode. SST manages building and creating output paths (`build-hebrew`, `build-aramaic`) automatically when deployed.

### Linting & Testing

```bash
# Run ESLint
yarn lint

# Run Vitest
yarn test
```

## Deployment

Deployment is handled by SST v3 via GitHub Actions.
