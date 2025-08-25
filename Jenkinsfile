pipeline {
  agent any
  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }
    stage('Build Docker Image') {
      steps {
        script {
          dockerImage = docker.build("ambulance-booking:latest")
        }
      }
    }
    stage('Run Container') {
      steps {
        script {
          // Stop and remove any existing container (best-effort)
          sh 'docker rm -f ambulance-review || true'
          sh 'docker run -d --name ambulance-review -p 8080:80 ambulance-booking:latest'
        }
      }
    }
  }
}
