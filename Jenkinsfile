pipeline {

    agent any

    stages {

        stage('Levantar Docker Compose') {
            steps {
                bat 'docker-compose up -d --build'
            }
        }

        stage('Verificar contenedores') {
            steps {
                bat 'docker ps'
            }
        }

    }

}