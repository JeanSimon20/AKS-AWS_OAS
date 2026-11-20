# Imagen ligera y endurecida (DevSecOps) lista para Amazon ECR y Kubernetes
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    APP_VERSION=1.0.0 \
    APP_ENV=aws-eks

# Copiar archivos con permisos del usuario sin privilegios (UID 1000)
COPY --chown=node:node package.json server.js ./
COPY --chown=node:node public ./public

# Buenas practicas DevSecOps: ejecutar sin privilegios root
USER node

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/healthz').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
