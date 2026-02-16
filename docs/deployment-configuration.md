# Deployment Configuration

## Detected Deployment Signals

- Next.js output mode set to `standalone` in `next.config.ts`.
- PWA support configured via `next-pwa` wrapper.
- External package optimization and chunk splitting configured for production builds.

## Not Detected in Repository Patterns

- No Dockerfile or docker-compose file.
- No Kubernetes/Helm/Terraform/Pulumi folder patterns.
- No CI/CD workflow files under `.github/workflows` or equivalent root CI files.

## Deployment Implications

- Deployment likely relies on platform-managed Node/Bun execution for built Next.js output.
- Add explicit runbooks/CI manifests if automated build and release traceability are required.
