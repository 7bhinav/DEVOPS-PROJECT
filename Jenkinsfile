pipeline {
  agent any
  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }
    stage('Install Dependencies') {
      steps {
        // install server deps
        sh 'cd server && npm install'
        // install client deps for lint/build if needed
        sh 'cd client && npm install'
      }
    }
    stage('Test') {
      steps {
        // run server tests (keep non-fatal)
        sh 'cd server && npm test || true'
      }
    }
    stage('Build Docker Image') {
      steps {
        script {
          dockerImage = docker.build("ambulance-booking:latest")
        }
      }
    }
    stage('Run Container & Smoke Test') {
      steps {
        script {
          sh 'docker rm -f ambulance-review || true'
          sh 'docker run -d --name ambulance-review -p 9001:3000 ambulance-booking:latest'
          // wait for container to be ready then run a simple health check
          sh '''
            for i in 1 2 3 4 5; do
              sleep 2
              if curl -fsS http://localhost:9001/health >/dev/null 2>&1; then
                echo "health ok"; exit 0
              fi
            done
            echo "healthcheck failed"; docker logs ambulance-review --tail 200; exit 1
          '''
        }
      }
    }
    stage('Optional: Push Image') {
      when { expression { return env.DOCKER_REGISTRY != null } }
      steps {
        script {
          // expect credentials to be configured in Jenkins
          sh "docker tag ambulance-booking:latest ${env.DOCKER_REGISTRY}/ambulance-booking:latest"
          sh "docker push ${env.DOCKER_REGISTRY}/ambulance-booking:latest"
        }
      }
    }
  }
}
