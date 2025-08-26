# 🚑 Ambulance Booking System

A static web demo for booking ambulances with an Uber-like experience.  
Features responsive design, map-based booking, and Docker/Jenkins deployment.

---

## Table of Contents

- [Features](#features)
- [Demo Screenshots](#demo-screenshots)
- [Quickstart (Docker)](#quickstart-docker)
- [Jenkins CI/CD Pipeline](#jenkins-cicd-pipeline)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Customization](#customization)
- [Next Steps](#next-steps)
- [License](#license)

---

## Features

- **Home page:** Clear call-to-action for booking an ambulance.
- **Booking page:** Intuitive form with Leaflet/OpenStreetMap map for selecting pickup and destination.
- **About & Contact pages:** Informative and easy to access.
- **Responsive Design:** Optimized for mobile, visually themed (red/blue/white).
- **Static demo:** No backend, suitable for containerized deployment.

---

## Demo Screenshots

> Add screenshots or demo GIFs here to showcase!
 the UI and booking workflow.
> 
[IMG_0013](https://github.com/user-attachments/assets/cb5d0760-14d8-4f52-bac3-593f13a4a457)
![IMG_0010](https://github.com/user-attachments/assets/e301d98b-725c-430a-a985-ee4e99bab210)

## Quickstart (Docker)

Run the Ambulance Booking System locally using Docker:

---

## Jenkins CI/CD Pipeline

A basic Jenkins pipeline automates the build and run steps:

1. **Checkout:** Clone repo from source control.
2. **Build Docker Image:** Build as `ambulance-booking`.
3. **Run Container:** Bind container port 80 to host port 8080.

> Setup: Point your Jenkins job to this repo and run the included `Jenkinsfile`.  
> You can extend this pipeline with stages for testing, cleanup, image publishing, and production deployment.

---



## Tech Stack

- **Frontend:** HTML, CSS (mobile-first, themed), JavaScript, Leaflet/OpenStreetMap
- **Container:** nginx (alpine)
- **CI/CD:** Docker, Jenkins (with Docker Pipeline plugin)

---

## Customization

- Edit `/src` files to update visuals and UI.
- Add backend by integrating a REST API and updating frontend logic.
- For production, add authentication, booking persistence, dispatch systems, and analytics.

---

## Next Steps

- Enable authentication and enforce secure data management.
- Connect a backend for real ambulance dispatch and live tracking.
- Extend CI/CD: Push images to a registry, automate testing, and use blue/green or rolling deployment strategies.

---

## License

This project is licensed under the MIT License.

---

> Have feedback, questions, or want to contribute?  
Open an issue or contact the maintainers!


 
 
