# OrbitCloud — De Local a Nube (CI/CD hacia Amazon ECR + Orquestación en Amazon EKS)

Proyecto **Frontend de demostración** diseñado para enseñar el ciclo completo de DevSecOps y Cloud en AWS:
1. **Local**: Desarrollo y pruebas automatizadas en `localhost:3000`.
2. **CI/CD + Amazon ECR**: Construcción de contenedor endurecido (`non-root`), escaneo de vulnerabilidades con **Trivy** y publicación con tag inmutable (`SHA`) en **Amazon ECR**.
3. **Orquestación en Kubernetes (AWS EKS)**: Despliegue automatizado con **3 réplicas**, *Rolling Update* sin caída, sondas de salud (`liveness`/`readiness`), exposición mediante **AWS Load Balancer** y verificación visual del balanceo entre Pods en el navegador.

---

## 1. Ciclo de Vida del Pipeline (`.github/workflows/deploy.yml`)

```text
[ git push origin main ]
           │
           ▼
┌──────────────────────────────┐
│ 1. CI — Test Frontend        │  ► Ejecuta `npm test` (valida HTML, /healthz y /api/runtime)
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│ 2. Package & Push — ECR      │  ► Crea repo ECR si no existe (scanOnPush=true)
│                              │  ► Build Docker + Escaneo Trivy + Push (<sha> y :latest)
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│ 3. Orchestrate — Amazon EKS  │  ► aws eks update-kubeconfig
│                              │  ► Aplica Namespace, ConfigMap, Deployment (3 réplicas), Service LB y HPA
│                              │  ► Espera rollout y publica la URL del Load Balancer en el Summary
└──────────────────────────────┘
```

---

## 2. Secretos Requeridos en GitHub Actions

En el repositorio de GitHub (`Settings` → `Secrets and variables` → `Actions` → `Repository secrets`):

| Secreto | Descripción |
| :--- | :--- |
| `AWS_ACCESS_KEY_ID` | Access Key del usuario IAM con permisos sobre ECR y acceso al clúster EKS |
| `AWS_SECRET_ACCESS_KEY` | Secret Access Key correspondiente |
| `AWS_REGION` | Región donde vive el clúster EKS y ECR (ej. `us-east-1` o `us-east-2`) |
| `EKS_CLUSTER_NAME` | Nombre exacto del clúster creado en Amazon EKS |

> **Nota IAM para EKS**: Asegúrate de que el usuario IAM dueño de `AWS_ACCESS_KEY_ID` sea el creador del clúster o tenga una **Access Entry** en EKS con la política `AmazonEKSClusterAdminPolicy` para que `kubectl` pueda aplicar los manifiestos.

---

## 3. Estructura del Proyecto

- `public/` y `server.js` — Landing Page moderna + servidor ligero con `/healthz`, `/readyz` y `/api/runtime`.
- `Dockerfile` — Imagen `node:22-alpine` ejecutándose sin privilegios (`USER node`).
- `.github/workflows/deploy.yml` — Pipeline CI/CD completo de 3 etapas hacia ECR y EKS.
- `k8s/` — Manifiestos declarativos de Kubernetes:
  - `01-namespace.yaml` — Aísla los recursos en el namespace `orbitcloud`.
  - `02-configmap.yaml` — Variables de entorno desacopladas de la imagen.
  - `03-deployment.yaml` — 3 réplicas, `RollingUpdate` sin caída, `securityContext` endurecido y sondas HTTP.
  - `04-service.yaml` — `Service` tipo `LoadBalancer` que aprovisiona la entrada pública en AWS.
  - `05-hpa.yaml` — Auto-escalado horizontal (`3` a `6` réplicas por CPU).

---

## 4. Comandos Útiles para Demostración en Clase

### Probar primero en Local
```powershell
npm test
npm start
# Abrir http://localhost:3000
```

### Lanzar el Pipeline hacia AWS
```powershell
git add .
git commit -m "feat: landing frontend + pipeline CI/CD hacia ECR y EKS"
git push origin main
```

### Inspeccionar la Orquestación en el Clúster EKS
```powershell
aws eks update-kubeconfig --region <TU_REGION> --name <TU_CLUSTER>
kubectl get all -n orbitcloud
kubectl scale deployment orbitcloud-landing -n orbitcloud --replicas=5
```

### Limpieza post-clase (evitar cargos por el Load Balancer de AWS)
```powershell
kubectl delete namespace orbitcloud
```
