# Ambulance Booking System — Review-1

Problem statement: An Ambulance Booking System with Uber-like booking experience and Docker-based deployment.

Features (Review-1):
- Home page with call-to-action
- Booking page with patient form and Leaflet/OpenStreetMap map for pickup and destination selection
- About and Contact pages
- Responsive mobile-first design (red/blue/white theme)

DevOps Review-1 deliverables:
- Dockerfile (based on nginx:alpine) — copies site to /usr/share/nginx/html and exposes port 80
- Jenkinsfile — stages: Checkout, Build Docker Image, Run Container (binds container port 80 to host 8080)

Quickstart
1. Clone the repo:

```bash
git clone <repo-url>
cd <repo-folder>
```

2. Build the Docker image:

```bash
docker build -t ambulance-booking .
```

3. Run the container (maps container port 80 to host 8080):

```bash
docker run -d -p 8080:80 --name ambulance-review ambulance-booking
```

4. Open the site: http://localhost:8080

5. Jenkins pipeline: create a Jenkins job pointing to this repository and run the pipeline. The Jenkinsfile has simple stages: Checkout, Build Docker Image, Run Container (port 8080).

Notes & Next steps
- This is a static demo (no backend). For production, add authentication, persistence, and a dispatch backend.
- Enhance CI to push images to a registry, add tests, and graceful deployment strategies.
