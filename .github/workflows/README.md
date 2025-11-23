# GitHub Actions Workflows

## Docker Hub Publishing

The `docker-publish.yml` workflow automatically builds and pushes Docker images to Docker Hub whenever code is pushed to the `main` branch or when version tags are created.

### Services Built

Currently, the workflow builds and pushes the following services:

1. **vertex-platform-auth-service** - JWT-based authentication service
2. **vertex-platform-analytics-service** - Analytics and metrics service

### Required GitHub Secrets

To enable Docker Hub publishing, you need to configure the following secrets in your GitHub repository:

1. Go to your GitHub repository: https://github.com/maxjeffwell/microservices-platform
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add the following:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `DOCKER_USERNAME` | Your Docker Hub username | `maxjeffwell` |
| `DOCKER_PASSWORD` | Your Docker Hub access token or password | `dckr_pat_xxxxx...` |

**Important:** For security, use a Docker Hub [Access Token](https://docs.docker.com/docker-hub/access-tokens/) instead of your password.

### How to Create a Docker Hub Access Token

1. Log in to [Docker Hub](https://hub.docker.com/)
2. Click on your username in the top right → **Account Settings**
3. Go to **Security** → **Access Tokens**
4. Click **New Access Token**
5. Give it a description (e.g., "GitHub Actions")
6. Select permissions: **Read, Write, Delete**
7. Click **Generate**
8. Copy the token and add it as the `DOCKER_PASSWORD` secret in GitHub

### Workflow Triggers

The workflow runs on:

- **Push to main branch**: Builds images tagged as `latest` and `main-{sha}`
- **Version tags** (e.g., `v1.0.0`): Builds images with semantic version tags
- **Pull requests**: Builds images for testing (does not push to Docker Hub)

### Image Naming Convention

Images are pushed to Docker Hub with the following naming pattern:

```
docker.io/{DOCKER_USERNAME}/vertex-platform-{service-name}:{tag}
```

Examples:
- `maxjeffwell/vertex-platform-auth-service:latest`
- `maxjeffwell/vertex-platform-auth-service:main-abc1234`
- `maxjeffwell/vertex-platform-analytics-service:v1.0.0`

### Multi-Platform Support

Images are built for both `linux/amd64` and `linux/arm64` architectures, ensuring compatibility with:
- Intel/AMD processors (most cloud providers)
- ARM processors (AWS Graviton, Apple Silicon, Raspberry Pi)

### Caching

The workflow uses GitHub Actions cache to speed up builds by caching Docker layers between runs.

### Adding New Services

To add a new service to the workflow, edit `.github/workflows/docker-publish.yml` and add an entry to the `matrix.service` array:

```yaml
- name: new-service-name
  context: ./path/to/service
  dockerfile: ./path/to/service/Dockerfile
```

### Manual Trigger

You can also manually trigger the workflow:

1. Go to **Actions** tab in your GitHub repository
2. Select **Build and Push Docker Images**
3. Click **Run workflow**
4. Select the branch and click **Run workflow**

### Pulling Images

After the workflow runs successfully, you can pull the images:

```bash
# Pull latest version
docker pull maxjeffwell/vertex-platform-auth-service:latest

# Pull specific version
docker pull maxjeffwell/vertex-platform-auth-service:v1.0.0

# Pull specific commit
docker pull maxjeffwell/vertex-platform-auth-service:main-abc1234
```

### Monitoring Workflow Runs

Check the status of workflow runs:

1. Go to the **Actions** tab in your repository
2. Click on **Build and Push Docker Images**
3. View individual workflow runs and their logs

### Troubleshooting

**Authentication Failed**: Ensure your `DOCKER_USERNAME` and `DOCKER_PASSWORD` secrets are correctly set.

**Build Failed**: Check the workflow logs for specific error messages. Common issues include:
- Missing dependencies
- Dockerfile syntax errors
- Context path mismatches

**Push Failed**: Verify that your Docker Hub access token has write permissions.
